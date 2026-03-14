mod commands;
mod config;
mod file_sync;
mod llm;
mod markdown;

use config::get_kb_path;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindow,
};

fn toggle_window(win: &WebviewWindow) {
    if win.is_visible().unwrap_or(false) {
        win.hide().ok();
    } else {
        win.show().ok();
        win.set_focus().ok();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        toggle_window(&win);
    }
}

#[cfg(target_os = "macos")]
fn shortcut_accelerator() -> &'static str {
    "Alt+Command+T"
}

#[cfg(not(target_os = "macos"))]
fn shortcut_accelerator() -> &'static str {
    "Ctrl+Alt+T"
}

#[cfg(target_os = "macos")]
fn shortcut_label() -> &'static str {
    "⌥⌘T"
}

#[cfg(not(target_os = "macos"))]
fn shortcut_label() -> &'static str {
    "Ctrl+Alt+T"
}

struct WatcherState {
    watcher: Option<RecommendedWatcher>,
    watched_root: Option<PathBuf>,
    last_own_write: Instant,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: None,
            watched_root: None,
            last_own_write: Instant::now() - Duration::from_secs(5),
        }
    }
}

fn kb_root(app: &AppHandle) -> PathBuf {
    PathBuf::from(get_kb_path(app))
}

fn todo_dir(app: &AppHandle) -> PathBuf {
    kb_root(app).join("content").join("to-do")
}

pub(crate) fn mark_own_write(app: &AppHandle) {
    let state = app.state::<Mutex<WatcherState>>();
    if let Ok(mut watcher_state) = state.lock() {
        watcher_state.last_own_write = Instant::now();
    };
}

pub(crate) fn refresh_watcher(app: &AppHandle) -> Result<(), String> {
    let watched_root = kb_root(app);
    let watched_todo_dir = todo_dir(app);

    fs::create_dir_all(&watched_root)
        .map_err(|e| format!("Failed to create {}: {}", watched_root.display(), e))?;

    {
        let state = app.state::<Mutex<WatcherState>>();
        let mut watcher_state = state.lock().map_err(|_| "Failed to lock watcher state".to_string())?;
        if watcher_state.watched_root.as_ref() == Some(&watched_root) && watcher_state.watcher.is_some() {
            return Ok(());
        }
        watcher_state.watcher = None;
        watcher_state.watched_root = None;
    }

    let handle = app.clone();
    let todo_dir_for_events = watched_todo_dir.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        let Ok(event) = res else {
            return;
        };

        if !event.paths.iter().any(|path| path.starts_with(&todo_dir_for_events)) {
            return;
        }

        let state = handle.state::<Mutex<WatcherState>>();
        let should_emit = state
            .lock()
            .map(|watcher_state| watcher_state.last_own_write.elapsed() >= Duration::from_millis(1000))
            .unwrap_or(false);

        if !should_emit {
            return;
        }

        if let Some(win) = handle.get_webview_window("main") {
            win.emit("file-changed", ()).ok();
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&watched_root, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch {}: {}", watched_root.display(), e))?;

    let state = app.state::<Mutex<WatcherState>>();
    let mut watcher_state = state.lock().map_err(|_| "Failed to lock watcher state".to_string())?;
    watcher_state.watcher = Some(watcher);
    watcher_state.watched_root = Some(watched_root);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(win) = app.get_webview_window("main") {
                            toggle_window(&win);
                        }
                    }
                    let _ = shortcut;
                })
                .build(),
        )
        .manage(Mutex::new(WatcherState::default()))
        .setup(|app| {
            let handle = app.handle().clone();

            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                app.set_dock_visibility(false);
            }

            // Register global shortcut
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                app.global_shortcut().register(shortcut_accelerator()).ok();
            }

            #[cfg(target_os = "macos")]
            {
                let show_hide_menu =
                    MenuItem::with_id(app, "show_hide", "Show / Hide", true, Some(shortcut_accelerator()))?;
                let app_submenu = SubmenuBuilder::new(app, "Sticky Todo")
                    .about(None)
                    .separator()
                    .item(&show_hide_menu)
                    .separator()
                    .hide()
                    .hide_others()
                    .separator()
                    .quit()
                    .build()?;
                let app_menu = MenuBuilder::new(app).item(&app_submenu).build()?;
                app_menu.set_as_app_menu()?;

                app.on_menu_event(|app, event| {
                    if event.id().as_ref() == "show_hide" {
                        toggle_main_window(app);
                    }
                });
            }

            // System tray
            let show_hide = MenuItemBuilder::with_id("toggle", format!("Show / Hide   {}", shortcut_label())).build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show_hide, &quit]).build()?;

            let handle_clone = handle.clone();
            TrayIconBuilder::new()
                .tooltip(format!("Sticky Todo  ({})", shortcut_label()))
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "toggle" => {
                            toggle_main_window(app);
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(move |_tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        toggle_main_window(&handle_clone);
                    }
                })
                .build(app)?;

            // Show main window after setup
            if let Some(win) = app.get_webview_window("main") {
                win.show().ok();
            }

            refresh_watcher(&handle)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::save_tasks,
            commands::create_date_section,
            commands::append_tasks_to_date,
            commands::push_task,
            commands::list_weekly_files,
            commands::llm_breakdown,
            commands::llm_schedule,
            commands::get_settings,
            commands::save_settings,
            commands::test_connection,
            commands::check_first_run,
            commands::select_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sticky Todo");
}
