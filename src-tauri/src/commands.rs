use crate::config::{self, AppSettings, get_kb_path};
use crate::file_sync;
use crate::llm::{self, LLMConfig};
use crate::markdown::{AggregatedTask, Task};
use serde_json::Value;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct TasksResult {
    tasks: Vec<AggregatedTask>,
    #[serde(rename = "filePath")]
    file_path: Option<String>,
    #[serde(rename = "weekStart")]
    week_start: Option<String>,
}

#[tauri::command]
pub fn get_tasks(date_str: String, app: AppHandle) -> Result<TasksResult, String> {
    crate::refresh_watcher(&app)?;
    let kb = get_kb_path(&app);
    let todo_dir = PathBuf::from(&kb).join("content").join("to-do");
    let (tasks, fp, ws) = file_sync::get_tasks(&todo_dir.to_string_lossy(), &date_str)?;
    Ok(TasksResult { tasks, file_path: fp, week_start: ws })
}

#[tauri::command]
pub fn save_tasks(file_path: String, date_str: String, tasks: Vec<Task>, app: AppHandle) -> Result<Value, String> {
    crate::mark_own_write(&app);
    let section = crate::markdown::serialize_date_section(&date_str, &tasks);
    file_sync::write_back_section(&file_path, &date_str, &section)?;
    Ok(serde_json::json!({"ok": true}))
}

#[tauri::command]
pub fn create_date_section(date_str: String, tasks: Vec<Task>, app: AppHandle) -> Result<Value, String> {
    crate::mark_own_write(&app);
    let kb = get_kb_path(&app);
    let todo_dir = PathBuf::from(&kb).join("content").join("to-do");
    let info = file_sync::ensure_date_section(&todo_dir.to_string_lossy(), &date_str, &tasks)?;
    crate::refresh_watcher(&app)?;
    Ok(serde_json::json!({"filePath": info.file_path, "weekStart": info.week_start}))
}

#[tauri::command]
pub fn append_tasks_to_date(date_str: String, tasks: Vec<Task>, app: AppHandle) -> Result<Value, String> {
    crate::mark_own_write(&app);
    let kb = get_kb_path(&app);
    let todo_dir = PathBuf::from(&kb).join("content").join("to-do");
    let info = file_sync::append_tasks_to_date(&todo_dir.to_string_lossy(), &date_str, &tasks)?;
    crate::refresh_watcher(&app)?;
    Ok(serde_json::json!({"filePath": info.file_path, "weekStart": info.week_start}))
}

#[tauri::command]
pub fn push_task(to_date: String, task_text: String, subtask_texts: Vec<String>, app: AppHandle) -> Result<Value, String> {
    crate::mark_own_write(&app);
    let kb = get_kb_path(&app);
    let todo_dir = PathBuf::from(&kb).join("content").join("to-do");
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
    let task = Task {
        id: format!("push_{}", now),
        text: task_text,
        status: "todo".into(),
        subtasks: subtask_texts.iter().enumerate().map(|(i, t)| Task {
            id: format!("push_sub_{}_{}", now, i),
            text: t.clone(),
            status: "todo".into(),
            subtasks: Vec::new(),
        }).collect(),
    };
    let info = file_sync::append_tasks_to_date(&todo_dir.to_string_lossy(), &to_date, &[task])?;
    crate::refresh_watcher(&app)?;
    Ok(serde_json::json!({"ok": true, "filePath": info.file_path}))
}

#[tauri::command]
pub fn list_weekly_files(app: AppHandle) -> Result<Vec<String>, String> {
    crate::refresh_watcher(&app)?;
    let kb = get_kb_path(&app);
    let todo_dir = PathBuf::from(&kb).join("content").join("to-do");
    file_sync::list_weekly_files(&todo_dir.to_string_lossy())
}

#[tauri::command]
pub async fn llm_breakdown(task_text: String, existing_subtasks: Vec<String>, app: AppHandle) -> Result<Value, String> {
    llm::breakdown(&app, &task_text, &existing_subtasks).await
}

#[tauri::command]
pub async fn llm_schedule(tasks: Value, app: AppHandle) -> Result<Value, String> {
    llm::schedule(&app, &tasks, &[]).await
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(config::load_settings(&app))
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, app: AppHandle) -> Result<Value, String> {
    config::save_settings(&app, &settings)?;
    crate::refresh_watcher(&app)?;
    Ok(serde_json::json!({"ok": true}))
}

#[tauri::command]
pub async fn test_connection(settings: LLMConfig) -> Result<Value, String> {
    llm::test_connection(&settings).await
}

#[tauri::command]
pub fn check_first_run(app: AppHandle) -> Result<bool, String> {
    let s = config::load_settings(&app);
    Ok(s.api_key.is_empty())
}

#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |path| {
        tx.send(path.map(|p| p.to_string())).ok();
    });
    rx.recv().map_err(|e| e.to_string())
}
