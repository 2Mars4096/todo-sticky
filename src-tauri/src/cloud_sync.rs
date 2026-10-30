use crate::{config, file_sync, markdown::Task, task_api};
use serde_json::Value;
use std::path::Path;
use tauri::AppHandle;

#[tauri::command]
pub fn cloud_task_folder(app: AppHandle) -> String { config::get_kb_path(&app) }

pub(crate) fn is_account_return_url(url: &str) -> bool {
    matches!(url, "todo-sticky://account-return" | "todo-sticky://account-return/")
}

fn sign_in_url(url: &str, return_to_app: bool) -> Result<reqwest::Url, String> {
    let mut parsed = reqwest::Url::parse(url).map_err(|_| "Invalid sign-in URL")?;
    let loopback = matches!(parsed.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if (parsed.scheme() != "https" && !(parsed.scheme() == "http" && loopback))
        || !parsed.username().is_empty() || parsed.password().is_some() || parsed.path() != "/signin" {
        return Err("Sign-in requires a trusted HTTPS service".into());
    }
    if return_to_app {
        let fragment = format!("returnTo=app&{}", parsed.fragment().unwrap_or(""));
        parsed.set_fragment(Some(&fragment));
    }
    Ok(parsed)
}

#[tauri::command]
pub fn open_account_sign_in(url: String) -> Result<(), String> {
    let parsed = sign_in_url(&url, cfg!(target_os = "macos"))?;
    // No credentials move into the return URI; it only focuses this app.
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").arg(parsed.as_str()).spawn();
    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("rundll32.exe").args(["url.dll,FileProtocolHandler", parsed.as_str()]).spawn();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let result = std::process::Command::new("xdg-open").arg(parsed.as_str()).spawn();
    result.map(|_| ()).map_err(|error| format!("Could not open your browser: {error}"))
}

// Comparing task contents (rather than a weekly file hash) permits applying two
// independent dates from the same week while rejecting concurrent local edits.
pub(crate) fn apply_day(kb: &Path, date: &str, tasks: Vec<Task>, expected_tasks: Value) -> Result<(), String> {
    let current = task_api::extract_tasks(kb, task_api::ExtractTasksRequest {
        date: Some(date.into()), ..Default::default()
    })?;
    let current_tasks = current.dates.first().map(|day| serde_json::to_value(&day.tasks).unwrap_or(Value::Null))
        .unwrap_or_else(|| serde_json::json!([]));
    if current_tasks != expected_tasks {
        return Err("Local tasks changed during sync. Sync again; your edits are safe.".into());
    }
    // Preserve an exact preimage before applying downloaded data.
    if let Some(day) = current.dates.first() {
        let original = file_sync::read_local_file(Path::new(&day.file_path))?;
        let backup_dir = kb.join(".sticky-sync-backups");
        std::fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
        let backup = backup_dir.join(format!("{}-{}.md", date, crate::markdown::new_task_id()));
        std::fs::write(backup, original).map_err(|error| format!("Could not back up before sync: {error}"))?;
    }
    let todo_dir = kb.join("content").join("to-do");
    file_sync::ensure_date_section(&todo_dir.to_string_lossy(), date, &tasks)?;
    Ok(())
}

#[tauri::command]
pub fn cloud_apply_day(date: String, tasks: Vec<Task>, expected_tasks: Value, expected_kb_path: String, app: AppHandle) -> Result<(), String> {
    let kb = config::get_kb_path(&app);
    if kb != expected_kb_path { return Err("Your task folder changed. Sync again.".into()); }
    crate::mark_own_write(&app);
    apply_day(Path::new(&kb), &date, tasks, expected_tasks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_return_is_a_fixed_token_free_wakeup() {
        assert!(is_account_return_url("todo-sticky://account-return"));
        assert!(is_account_return_url("todo-sticky://account-return/"));
        for url in ["https://account-return", "todo-sticky://other", "todo-sticky://account-return?token=bad", "todo-sticky://account-return#secret", "todo-sticky://user@account-return"] {
            assert!(!is_account_return_url(url));
        }
        let url = "https://sync.example.test/signin#sessionId=session&challenge=proof";
        let native = sign_in_url(url, true).unwrap();
        assert_eq!(native.query(), None);
        assert_eq!(native.fragment(), Some("returnTo=app&sessionId=session&challenge=proof"));
        assert_eq!(sign_in_url(url, false).unwrap().as_str(), url);
        assert!(sign_in_url("http://example.com/signin", true).is_err());
        assert!(sign_in_url("https://user:secret@example.com/signin", true).is_err());
    }


    #[test]
    fn stale_download_cannot_replace_a_local_edit() {
        let dir = tempfile::tempdir().unwrap();
        let task = Task { id: "task_a".into(), text: "Local work".into(), status: "todo".into(), finish: None, subtasks: vec![] };
        apply_day(dir.path(), "2026-10-24", vec![task.clone()], serde_json::json!([])).unwrap();
        assert!(apply_day(dir.path(), "2026-10-24", vec![], serde_json::json!([])).is_err());
        let tasks = serde_json::to_value(vec![task]).unwrap();
        apply_day(dir.path(), "2026-10-24", vec![], tasks).unwrap();
        assert_eq!(std::fs::read_dir(dir.path().join(".sticky-sync-backups")).unwrap().count(), 1);
    }
}
