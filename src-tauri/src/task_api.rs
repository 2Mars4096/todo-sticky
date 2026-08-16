use crate::file_sync::{self, FileInfo};
use crate::markdown::{new_task_id, parse_weekly_file, Task};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const VALID_STATUSES: [&str; 4] = ["todo", "done", "partial", "question"];

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ExtractTasksRequest {
    pub date: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub all: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedDate {
    pub date: String,
    pub tasks: Vec<Task>,
    pub file_path: String,
    pub week_start: String,
    pub revision: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractTasksResponse {
    pub dates: Vec<ExtractedDate>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDraft {
    pub text: String,
    #[serde(default = "default_status")]
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    pub date: String,
    pub text: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub subtasks: Vec<TaskDraft>,
    pub parent_id: Option<String>,
    pub expected_revision: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskRequest {
    pub date: String,
    pub id: String,
    pub text: Option<String>,
    pub status: Option<String>,
    pub expected_revision: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTaskRequest {
    pub date: String,
    pub id: String,
    pub expected_revision: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskMutationResponse {
    pub ok: bool,
    pub date: String,
    pub task: Task,
    pub file_path: String,
    pub week_start: String,
    pub revision: String,
}

fn default_status() -> String {
    "todo".into()
}

fn todo_dir(kb_path: &Path) -> PathBuf {
    kb_path.join("content").join("to-do")
}

fn validate_date(date: &str) -> Result<(), String> {
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| format!("Invalid date '{date}'; expected YYYY-MM-DD"))
}

fn validate_text(text: &str) -> Result<String, String> {
    let text = text.trim();
    if text.is_empty() {
        Err("Task text cannot be empty".into())
    } else if text.contains('\n') || text.contains('\r') {
        Err("Task text must fit on one line".into())
    } else {
        Ok(text.into())
    }
}

fn validate_status(status: &str) -> Result<String, String> {
    if VALID_STATUSES.contains(&status) {
        Ok(status.into())
    } else {
        Err(format!(
            "Invalid status '{status}'; expected one of {}",
            VALID_STATUSES.join(", ")
        ))
    }
}

fn content_revision(content: &str) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in content.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("fnv1a64:{hash:016x}")
}

fn read_file_info(info: &FileInfo) -> Result<(String, String), String> {
    let content = file_sync::read_local_file(Path::new(&info.file_path))?;
    let revision = content_revision(&content);
    Ok((content, revision))
}

fn validate_expected_revision(expected: Option<&str>, actual: Option<&str>) -> Result<(), String> {
    if let Some(expected) = expected {
        if Some(expected) != actual {
            return Err(format!(
                "Task archive changed since extraction (expected {expected}, found {})",
                actual.unwrap_or("no file")
            ));
        }
    }
    Ok(())
}

fn extract_file(
    info: FileInfo,
    from_date: Option<&str>,
    to_date: Option<&str>,
) -> Result<Vec<ExtractedDate>, String> {
    let (content, revision) = read_file_info(&info)?;
    let parsed = parse_weekly_file(&content);
    let dates = parsed
        .date_sections
        .into_iter()
        .filter(|section| {
            from_date
                .map(|from| section.date.as_str() >= from)
                .unwrap_or(true)
        })
        .filter(|section| {
            to_date
                .map(|to| section.date.as_str() <= to)
                .unwrap_or(true)
        })
        .map(|section| ExtractedDate {
            date: section.date,
            tasks: section.tasks,
            file_path: info.file_path.clone(),
            week_start: info.week_start.clone(),
            revision: revision.clone(),
        })
        .collect();
    Ok(dates)
}

pub fn extract_tasks(
    kb_path: &Path,
    mut request: ExtractTasksRequest,
) -> Result<ExtractTasksResponse, String> {
    let has_selection =
        request.date.is_some() || request.from_date.is_some() || request.to_date.is_some();
    if request.all && has_selection {
        return Err("Use all or a date/range, not both".into());
    }
    if request.date.is_some() && (request.from_date.is_some() || request.to_date.is_some()) {
        return Err("Use either date or fromDate/toDate, not both".into());
    }
    if !request.all && !has_selection {
        request.date = Some(
            chrono::Local::now()
                .date_naive()
                .format("%Y-%m-%d")
                .to_string(),
        );
    }

    if let Some(date) = request.date.as_deref() {
        validate_date(date)?;
    }
    if let Some(date) = request.from_date.as_deref() {
        validate_date(date)?;
    }
    if let Some(date) = request.to_date.as_deref() {
        validate_date(date)?;
    }
    if let (Some(from), Some(to)) = (request.from_date.as_deref(), request.to_date.as_deref()) {
        if from > to {
            return Err("fromDate must not be after toDate".into());
        }
    }

    let todo_dir = todo_dir(kb_path);
    let mut dates = Vec::new();
    if let Some(date) = request.date.as_deref() {
        if let Some(info) = file_sync::find_weekly_file(&todo_dir.to_string_lossy(), date)? {
            dates.extend(extract_file(info.clone(), Some(date), Some(date))?);
            if dates.is_empty() {
                let (_, revision) = read_file_info(&info)?;
                dates.push(ExtractedDate {
                    date: date.into(),
                    tasks: Vec::new(),
                    file_path: info.file_path,
                    week_start: info.week_start,
                    revision,
                });
            }
        }
    } else {
        for week_start in file_sync::list_weekly_files(&todo_dir.to_string_lossy())? {
            let file_path = todo_dir.join(&week_start).join("index.md");
            if !file_path.exists() {
                continue;
            }
            dates.extend(extract_file(
                FileInfo {
                    file_path: file_path.to_string_lossy().into(),
                    week_start,
                },
                request.from_date.as_deref(),
                request.to_date.as_deref(),
            )?);
        }
    }
    dates.sort_by(|left, right| left.date.cmp(&right.date));
    Ok(ExtractTasksResponse { dates })
}

fn load_date_for_mutation(
    todo_dir: &Path,
    date: &str,
    expected_revision: Option<&str>,
) -> Result<(Vec<Task>, Option<String>), String> {
    validate_date(date)?;
    let info = file_sync::find_weekly_file(&todo_dir.to_string_lossy(), date)?;
    let Some(info) = info else {
        validate_expected_revision(expected_revision, None)?;
        return Ok((Vec::new(), None));
    };
    let (content, revision) = read_file_info(&info)?;
    validate_expected_revision(expected_revision, Some(&revision))?;
    let tasks = parse_weekly_file(&content)
        .date_sections
        .into_iter()
        .find(|section| section.date == date)
        .map(|section| section.tasks)
        .unwrap_or_default();
    Ok((tasks, Some(revision)))
}

fn persist_date(
    todo_dir: &Path,
    date: &str,
    tasks: &[Task],
    base_revision: Option<&str>,
) -> Result<(FileInfo, String), String> {
    let current_info = file_sync::find_weekly_file(&todo_dir.to_string_lossy(), date)?;
    match (base_revision, current_info.as_ref()) {
        (Some(base_revision), Some(current)) => {
            let (_, current_revision) = read_file_info(current)?;
            if base_revision != current_revision {
                return Err(
                    "Task archive changed while applying the mutation; extract again".into(),
                );
            }
        }
        (None, Some(_)) | (Some(_), None) => {
            return Err("Task archive changed while applying the mutation; extract again".into());
        }
        (None, None) => {}
    }
    let info = file_sync::ensure_date_section(&todo_dir.to_string_lossy(), date, tasks)?;
    let (_, revision) = read_file_info(&info)?;
    Ok((info, revision))
}

fn find_task_mut<'a>(tasks: &'a mut [Task], id: &str) -> Option<&'a mut Task> {
    for task in tasks {
        if task.id == id {
            return Some(task);
        }
        if let Some(found) = find_task_mut(&mut task.subtasks, id) {
            return Some(found);
        }
    }
    None
}

fn remove_task(tasks: &mut Vec<Task>, id: &str) -> Option<Task> {
    if let Some(index) = tasks.iter().position(|task| task.id == id) {
        return Some(tasks.remove(index));
    }
    for task in tasks {
        if let Some(removed) = remove_task(&mut task.subtasks, id) {
            return Some(removed);
        }
    }
    None
}

pub fn create_task(
    kb_path: &Path,
    request: CreateTaskRequest,
) -> Result<TaskMutationResponse, String> {
    let todo_dir = todo_dir(kb_path);
    let (mut tasks, base_revision) = load_date_for_mutation(
        &todo_dir,
        &request.date,
        request.expected_revision.as_deref(),
    )?;
    let task = Task {
        id: new_task_id(),
        text: validate_text(&request.text)?,
        status: validate_status(&request.status)?,
        subtasks: request
            .subtasks
            .into_iter()
            .map(|draft| {
                Ok(Task {
                    id: new_task_id(),
                    text: validate_text(&draft.text)?,
                    status: validate_status(&draft.status)?,
                    subtasks: Vec::new(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?,
    };
    if let Some(parent_id) = request.parent_id.as_deref() {
        let parent = find_task_mut(&mut tasks, parent_id)
            .ok_or_else(|| format!("Task '{parent_id}' was not found on {}", request.date))?;
        parent.subtasks.push(task.clone());
    } else {
        tasks.push(task.clone());
    }
    let (info, revision) =
        persist_date(&todo_dir, &request.date, &tasks, base_revision.as_deref())?;
    Ok(TaskMutationResponse {
        ok: true,
        date: request.date,
        task,
        file_path: info.file_path,
        week_start: info.week_start,
        revision,
    })
}

pub fn update_task(
    kb_path: &Path,
    request: UpdateTaskRequest,
) -> Result<TaskMutationResponse, String> {
    if request.text.is_none() && request.status.is_none() {
        return Err("Provide text and/or status to update".into());
    }
    let todo_dir = todo_dir(kb_path);
    let (mut tasks, base_revision) = load_date_for_mutation(
        &todo_dir,
        &request.date,
        request.expected_revision.as_deref(),
    )?;
    let task = find_task_mut(&mut tasks, &request.id)
        .ok_or_else(|| format!("Task '{}' was not found on {}", request.id, request.date))?;
    if let Some(text) = request.text.as_deref() {
        task.text = validate_text(text)?;
    }
    if let Some(status) = request.status.as_deref() {
        task.status = validate_status(status)?;
    }
    let updated = task.clone();
    let (info, revision) =
        persist_date(&todo_dir, &request.date, &tasks, base_revision.as_deref())?;
    Ok(TaskMutationResponse {
        ok: true,
        date: request.date,
        task: updated,
        file_path: info.file_path,
        week_start: info.week_start,
        revision,
    })
}

pub fn delete_task(
    kb_path: &Path,
    request: DeleteTaskRequest,
) -> Result<TaskMutationResponse, String> {
    let todo_dir = todo_dir(kb_path);
    let (mut tasks, base_revision) = load_date_for_mutation(
        &todo_dir,
        &request.date,
        request.expected_revision.as_deref(),
    )?;
    let removed = remove_task(&mut tasks, &request.id)
        .ok_or_else(|| format!("Task '{}' was not found on {}", request.id, request.date))?;
    let (info, revision) =
        persist_date(&todo_dir, &request.date, &tasks, base_revision.as_deref())?;
    Ok(TaskMutationResponse {
        ok: true,
        date: request.date,
        task: removed,
        file_path: info.file_path,
        week_start: info.week_start,
        revision,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        create_task, delete_task, extract_tasks, update_task, CreateTaskRequest, DeleteTaskRequest,
        ExtractTasksRequest, TaskDraft, UpdateTaskRequest,
    };
    use crate::markdown::new_task_id;
    use std::fs;
    use std::path::PathBuf;

    fn temp_kb() -> PathBuf {
        let path =
            std::env::temp_dir().join(format!("sticky-todo-task-api-test-{}", new_task_id()));
        fs::create_dir_all(&path).expect("test knowledge base should be created");
        path
    }

    #[test]
    fn supports_create_extract_update_and_delete_with_revision_checks() {
        let kb_path = temp_kb();
        let created = create_task(
            &kb_path,
            CreateTaskRequest {
                date: "2026-08-16".into(),
                text: "Draft API guide".into(),
                status: "todo".into(),
                subtasks: vec![TaskDraft {
                    text: "Add examples".into(),
                    status: "todo".into(),
                }],
                parent_id: None,
                expected_revision: None,
            },
        )
        .expect("task should be created");

        let extracted = extract_tasks(
            &kb_path,
            ExtractTasksRequest {
                date: Some("2026-08-16".into()),
                ..ExtractTasksRequest::default()
            },
        )
        .expect("task should be extracted");
        assert_eq!(extracted.dates[0].tasks[0].id, created.task.id);
        assert_eq!(extracted.dates[0].tasks[0].subtasks.len(), 1);

        let updated = update_task(
            &kb_path,
            UpdateTaskRequest {
                date: "2026-08-16".into(),
                id: created.task.id.clone(),
                text: Some("Publish API guide".into()),
                status: Some("done".into()),
                expected_revision: Some(created.revision.clone()),
            },
        )
        .expect("task should be updated");
        assert_eq!(updated.task.text, "Publish API guide");
        assert_eq!(updated.task.status, "done");

        let nested = create_task(
            &kb_path,
            CreateTaskRequest {
                date: "2026-08-16".into(),
                text: "Share with another session".into(),
                status: "todo".into(),
                subtasks: Vec::new(),
                parent_id: Some(created.task.id.clone()),
                expected_revision: Some(updated.revision.clone()),
            },
        )
        .expect("nested task should be created");
        assert_eq!(nested.task.text, "Share with another session");

        let stale_update = update_task(
            &kb_path,
            UpdateTaskRequest {
                date: "2026-08-16".into(),
                id: created.task.id.clone(),
                text: Some("Overwrite newer work".into()),
                status: None,
                expected_revision: Some(created.revision),
            },
        );
        assert!(stale_update
            .expect_err("stale revision should fail")
            .contains("changed since extraction"));

        let deleted = delete_task(
            &kb_path,
            DeleteTaskRequest {
                date: "2026-08-16".into(),
                id: created.task.id,
                expected_revision: Some(nested.revision),
            },
        )
        .expect("task should be deleted");
        assert_eq!(deleted.task.text, "Publish API guide");

        let after_delete = extract_tasks(
            &kb_path,
            ExtractTasksRequest {
                date: Some("2026-08-16".into()),
                ..ExtractTasksRequest::default()
            },
        )
        .expect("empty date should still extract");
        assert!(after_delete.dates[0].tasks.is_empty());

        let unsaved_date = extract_tasks(
            &kb_path,
            ExtractTasksRequest {
                date: Some("2026-08-17".into()),
                ..ExtractTasksRequest::default()
            },
        )
        .expect("unsaved date in an existing week should extract");
        assert!(unsaved_date.dates[0].tasks.is_empty());
        assert!(!unsaved_date.dates[0].revision.is_empty());

        fs::remove_dir_all(&kb_path).expect("test knowledge base should be removed");
    }
}
