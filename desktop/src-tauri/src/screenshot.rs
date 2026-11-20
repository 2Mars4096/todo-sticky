#[cfg(target_os = "macos")]
fn recognize(png: Vec<u8>) -> Result<String, String> {
    use std::ffi::{c_char, CStr};
    extern "C" {
        fn sticky_recognize_text(bytes: *const u8, length: usize) -> *mut c_char;
    }
    // Vision finishes synchronously while png owns the input. The bridge returns strdup memory.
    unsafe {
        let result = sticky_recognize_text(png.as_ptr(), png.len());
        if result.is_null() {
            return Err("Could not read the screenshot. Try a smaller, clearer selection.".into());
        }
        let text = CStr::from_ptr(result).to_string_lossy().into_owned();
        libc::free(result.cast());
        if text.trim().is_empty() {
            return Err("No text found. Select an area containing the task.".into());
        }
        Ok(text)
    }
}

#[cfg(target_os = "macos")]
fn resident_bundle() -> Result<std::path::PathBuf, String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let contents = executable.parent().and_then(std::path::Path::parent)
        .ok_or("Could not locate the Sticky Todo bundle.")?;
    let helper = contents.join("Helpers/Flameshot.app");
    if helper.join("Contents/MacOS/flameshot").is_file() { Ok(helper) }
    else { Err("This build does not include the screenshot editor.".into()) }
}

#[cfg(target_os = "macos")]
async fn open_editor(url: &str) -> Result<(), String> {
    let status = tokio::process::Command::new("/usr/bin/open")
        .arg("-a").arg(resident_bundle()?).arg(url).status().await.map_err(|e| e.to_string())?;
    if status.success() { Ok(()) } else { Err("Could not open the Flameshot application.".into()) }
}

#[tauri::command]
pub async fn open_capture_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    return open_editor("flameshot-sticky://settings").await;
    #[cfg(not(target_os = "macos"))]
    Err("Flameshot settings require macOS.".into())
}

#[tauri::command]
pub async fn capture_task_outline(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        window.hide().map_err(|e| e.to_string())?;
        let result = open_editor("flameshot-sticky://capture").await;
        if result.is_err() { window.show().ok(); }
        result
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        Err("Screenshot capture requires macOS.".into())
    }
}

#[derive(Default)]
pub struct ScreenshotInbox(std::sync::Mutex<Vec<Result<String, String>>>);

#[tauri::command]
pub fn take_sent_screenshots(inbox: tauri::State<ScreenshotInbox>) -> Result<Vec<Result<String, String>>, String> {
    inbox.0.lock().map(|mut queue| std::mem::take(&mut *queue)).map_err(|_| "Screenshot inbox unavailable.".into())
}

#[cfg(target_os = "macos")]
pub fn receive_image(app: &tauri::AppHandle, name: &str) {
    use std::io::Read;
    use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
    use tauri::{Emitter, Manager};
    let Some(id) = name.strip_prefix("sticky-todo-capture-").and_then(|s| s.strip_suffix(".png")) else { return };
    if id.len() != 6 || !id.bytes().all(|byte| byte.is_ascii_alphanumeric()) { return; }
    let app = app.clone();
    let path = std::env::temp_dir().join(name);
    tauri::async_runtime::spawn_blocking(move || {
        let read = || -> Result<Vec<u8>, String> {
            let file = std::fs::OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
                .open(&path).map_err(|_| "The capture is no longer available.")?;
            let meta = file.metadata().map_err(|e| e.to_string())?;
            if !meta.is_file() || meta.uid() != unsafe { libc::geteuid() } || meta.mode() & 0o077 != 0 {
                return Err("Unexpected screenshot file.".into());
            }
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
            const LIMIT: u64 = 96 * 1024 * 1024;
            if meta.len() > LIMIT { return Err("Select a smaller screenshot region.".into()); }
            let mut bytes = Vec::new();
            file.take(LIMIT + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            if bytes.len() as u64 > LIMIT || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
                return Err("The selected image was not a readable PNG.".into());
            }
            Ok(bytes)
        };
        let result = read().and_then(recognize);
        if let Ok(mut queue) = app.state::<ScreenshotInbox>().0.lock() { queue.push(result); }
        if let Some(window) = app.get_webview_window("main") {
            window.unminimize().ok();
            window.show().ok();
            window.set_focus().ok();
        }
        app.emit("flameshot-draft-ready", ()).ok();
    });
}

#[cfg(target_os = "macos")]
pub fn start_shortcut_listener() {
    if let Ok(bundle) = resident_bundle() {
        let _ = std::process::Command::new("/usr/bin/open").arg("-g").arg(bundle).status();
    }
}
