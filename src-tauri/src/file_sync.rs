use crate::markdown::{
    get_tasks_for_date, parse_weekly_file, serialize_date_section, serialize_tasks, AggregatedTask,
    Task,
};
use chrono::Datelike;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(target_os = "macos")]
const TASK_ARCHIVE_CLOUD_ONLY: &str = "TASK_ARCHIVE_CLOUD_ONLY";
#[cfg(any(target_os = "macos", test))]
const MACOS_SF_DATALESS: u32 = 0x40000000;

#[cfg(any(target_os = "macos", test))]
fn macos_flags_are_dataless(flags: u32) -> bool {
    flags & MACOS_SF_DATALESS != 0
}

pub(crate) fn read_local_file(path: &Path) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::os::macos::fs::MetadataExt;

        let metadata = fs::metadata(path)
            .map_err(|error| format!("Failed to inspect {}: {}", path.display(), error))?;
        if macos_flags_are_dataless(metadata.st_flags()) {
            return Err(TASK_ARCHIVE_CLOUD_ONLY.into());
        }
    }

    fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {}", path.display(), error))
}

pub fn list_weekly_files(todo_dir: &str) -> Result<Vec<String>, String> {
    let dir = Path::new(todo_dir);
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let date_re = Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
    let mut dirs: Vec<String> = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read {}: {}", todo_dir, e))?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|ft| ft.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|name| date_re.is_match(name))
        .collect();
    dirs.sort();
    dirs.reverse();
    Ok(dirs)
}

#[derive(Clone)]
pub struct FileInfo {
    pub file_path: String,
    pub week_start: String,
}

pub fn find_weekly_file(todo_dir: &str, date_str: &str) -> Result<Option<FileInfo>, String> {
    let dirs = list_weekly_files(todo_dir)?;
    if dirs.is_empty() {
        return Ok(None);
    }

    for dir in &dirs {
        if dir.as_str() <= date_str {
            let file_path = PathBuf::from(todo_dir).join(dir).join("index.md");
            if file_path.exists() {
                return Ok(Some(FileInfo {
                    file_path: file_path.to_string_lossy().into(),
                    week_start: dir.clone(),
                }));
            }
        }
    }

    let last = dirs.last().unwrap();
    let file_path = PathBuf::from(todo_dir).join(last).join("index.md");
    if file_path.exists() {
        return Ok(Some(FileInfo {
            file_path: file_path.to_string_lossy().into(),
            week_start: last.clone(),
        }));
    }

    Ok(None)
}

pub fn write_back_section(
    file_path: &str,
    date_str: &str,
    new_section: &str,
) -> Result<(), String> {
    let content = read_local_file(Path::new(file_path))?;
    let lines: Vec<&str> = content.lines().collect();

    let heading_re = Regex::new(&format!(r"^##\s+{}\s*$", regex::escape(date_str))).unwrap();
    let mut section_start: Option<usize> = None;
    let mut section_end = lines.len();

    for (i, line) in lines.iter().enumerate() {
        if heading_re.is_match(line) {
            section_start = Some(i);
            for j in (i + 1)..lines.len() {
                if lines[j].starts_with("## ") {
                    section_end = j;
                    break;
                }
            }
            break;
        }
    }

    let new_content = if let Some(start) = section_start {
        let before: Vec<&str> = lines[..start].to_vec();
        let after: Vec<&str> = lines[section_end..].to_vec();
        let mut parts: Vec<String> = before.iter().map(|s| s.to_string()).collect();
        parts.push(new_section.trim_end().to_string());
        parts.push(String::new());
        parts.extend(after.iter().map(|s| s.to_string()));
        parts.join("\n")
    } else {
        format!("{}\n\n{}\n", content.trim_end(), new_section.trim_end())
    };

    fs::write(file_path, new_content)
        .map_err(|e| format!("Failed to write {}: {}", file_path, e))?;

    Ok(())
}

pub fn ensure_date_section(
    todo_dir: &str,
    date_str: &str,
    tasks: &[Task],
) -> Result<FileInfo, String> {
    if let Some(existing) = find_weekly_file(todo_dir, date_str)? {
        let section = serialize_date_section(date_str, tasks);
        write_back_section(&existing.file_path, date_str, &section)?;
        return Ok(existing);
    }

    let target_date = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date {}: {}", date_str, e))?;
    let weekday = target_date.weekday().num_days_from_monday();
    let monday = target_date - chrono::Duration::days(weekday as i64);
    let week_start = monday.format("%Y-%m-%d").to_string();

    let week_dir = PathBuf::from(todo_dir).join(&week_start);
    fs::create_dir_all(&week_dir)
        .map_err(|e| format!("Failed to create {}: {}", week_dir.display(), e))?;

    let file_path = week_dir.join("index.md");
    let section = serialize_date_section(date_str, tasks);

    if file_path.exists() {
        write_back_section(&file_path.to_string_lossy(), date_str, &section)?;
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        let frontmatter = format!(
            "---\ntitle: Weekly Report {ws}\nsubtitle: Weekly summary of progress and future plans.\nabstract: What Have I done?\ndate: '{now}'\ndraft: false\nauthor: Adam\n---\n\n",
            ws = week_start,
            now = now
        );
        fs::write(&file_path, format!("{}{}\n", frontmatter, section))
            .map_err(|e| format!("Failed to write {}: {}", file_path.display(), e))?;
    }

    Ok(FileInfo {
        file_path: file_path.to_string_lossy().into(),
        week_start,
    })
}

pub fn append_tasks_to_date(
    todo_dir: &str,
    date_str: &str,
    tasks: &[Task],
) -> Result<FileInfo, String> {
    let task_lines = serialize_tasks(tasks, 0);

    if let Some(file_info) = find_weekly_file(todo_dir, date_str)? {
        let content = read_local_file(Path::new(&file_info.file_path))?;
        let lines: Vec<&str> = content.lines().collect();
        let heading_re = Regex::new(&format!(r"^##\s+{}\s*$", regex::escape(date_str))).unwrap();
        let mut section_end: Option<usize> = None;

        for (i, line) in lines.iter().enumerate() {
            if heading_re.is_match(line) {
                let mut end = i + 1;
                while end < lines.len() && !lines[end].starts_with("## ") {
                    end += 1;
                }
                while end > i + 1 && lines[end - 1].trim().is_empty() {
                    end -= 1;
                }
                section_end = Some(end);
                break;
            }
        }

        let new_content = if let Some(end) = section_end {
            let before: Vec<&str> = lines[..end].to_vec();
            let after: Vec<&str> = lines[end..].to_vec();
            let mut parts: Vec<String> = before.iter().map(|s| s.to_string()).collect();
            parts.push(task_lines.trim_end().to_string());
            parts.extend(after.iter().map(|s| s.to_string()));
            parts.join("\n")
        } else {
            format!("{}\n\n## {}\n{}", content.trim_end(), date_str, task_lines)
        };

        fs::write(&file_info.file_path, new_content)
            .map_err(|e| format!("Failed to write {}: {}", file_info.file_path, e))?;
        return Ok(file_info);
    }

    ensure_date_section(todo_dir, date_str, tasks)
}

fn normalized_task_text(text: &str) -> String {
    text.to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn same_goal_link(left: &Task, right: &Task) -> bool {
    left.goal_id == right.goal_id && left.goal_step_id == right.goal_step_id
}

fn append_moved_subtask(parent: &mut Task, subtask: Task) {
    if !matches!(subtask.status.as_str(), "done" | "stopped") {
        if matches!(parent.status.as_str(), "done" | "stopped") {
            parent.status = "partial".into();
        }
        if let Some(finish) = parent
            .finish
            .as_mut()
            .and_then(serde_json::Value::as_object_mut)
        {
            finish.insert("reviewReady".into(), serde_json::json!(false));
        }
    }
    parent.subtasks.push(subtask);
}

fn merge_subtask_under_parent(tasks: &mut Vec<Task>, mut parent: Task, subtask: Task) {
    let parent_key = normalized_task_text(&parent.text);
    if let Some(existing_parent) = tasks
        .iter_mut()
        .find(|task| same_goal_link(task, &parent)
            && (task.id == parent.id || normalized_task_text(&task.text) == parent_key))
    {
        let subtask_key = normalized_task_text(&subtask.text);
        if !existing_parent
            .subtasks
            .iter()
            .any(|existing| same_goal_link(existing, &subtask)
                && (existing.id == subtask.id || normalized_task_text(&existing.text) == subtask_key))
        {
            append_moved_subtask(existing_parent, subtask);
        }
        return;
    }

    append_moved_subtask(&mut parent, subtask);
    tasks.push(parent);
}

pub fn append_subtask_to_parent(
    todo_dir: &str,
    date_str: &str,
    parent: Task,
    subtask: Task,
) -> Result<FileInfo, String> {
    let mut tasks = if let Some(file_info) = find_weekly_file(todo_dir, date_str)? {
        let content = read_local_file(Path::new(&file_info.file_path))?;
        let parsed = parse_weekly_file(&content);
        parsed
            .date_sections
            .into_iter()
            .find(|section| section.date == date_str)
            .map(|section| section.tasks)
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    merge_subtask_under_parent(&mut tasks, parent, subtask);
    ensure_date_section(todo_dir, date_str, &tasks)
}

pub fn get_tasks(
    todo_dir: &str,
    date_str: &str,
) -> Result<(Vec<AggregatedTask>, Option<String>, Option<String>), String> {
    let result = find_weekly_file(todo_dir, date_str)?;
    match result {
        Some(info) => {
            let content = read_local_file(Path::new(&info.file_path))?;
            let parsed = parse_weekly_file(&content);
            let aggregated = get_tasks_for_date(&parsed, date_str);
            Ok((aggregated, Some(info.file_path), Some(info.week_start)))
        }
        None => Ok((Vec::new(), None, None)),
    }
}

#[cfg(test)]
mod tests {
    use super::{macos_flags_are_dataless, merge_subtask_under_parent, MACOS_SF_DATALESS};
    use crate::markdown::Task;

    fn task(id: &str, text: &str) -> Task {
        Task {
            finish: None,
            goal_id: None,
            goal_step_id: None,
            id: id.into(),
            text: text.into(),
            status: "todo".into(),
            subtasks: Vec::new(),
        }
    }

    #[test]
    fn identifies_macos_dataless_file_flag() {
        assert!(macos_flags_are_dataless(MACOS_SF_DATALESS));
        assert!(macos_flags_are_dataless(MACOS_SF_DATALESS | 0x20));
        assert!(!macos_flags_are_dataless(0x20));
    }

    #[test]
    fn carried_subtasks_merge_under_one_destination_parent() {
        let mut tasks = Vec::new();
        merge_subtask_under_parent(
            &mut tasks,
            task("parent-1", "Task 1"),
            task("sub-1", "Task 1.1"),
        );
        merge_subtask_under_parent(
            &mut tasks,
            task("parent-2", " task   1 "),
            task("sub-2", "Task 1.2"),
        );
        merge_subtask_under_parent(
            &mut tasks,
            task("parent-3", "Task 1"),
            task("sub-3", " task 1.1 "),
        );

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].text, "Task 1");
        assert_eq!(tasks[0].subtasks.len(), 2);
        assert_eq!(tasks[0].subtasks[0].text, "Task 1.1");
        assert_eq!(tasks[0].subtasks[1].text, "Task 1.2");
    }

    #[test]
    fn unfinished_moved_steps_reopen_closed_parents_and_clear_review() {
        for status in ["done", "stopped", "todo", "partial", "question"] {
            let mut parent = task("destination", "Task 1");
            parent.status = status.into();
            parent.finish = Some(
                serde_json::json!({"doneWhen": "A usable result", "reviewReady": true}),
            );
            let mut tasks = vec![parent];
            merge_subtask_under_parent(
                &mut tasks,
                task("source", "Task 1"),
                task("step", "New work"),
            );
            assert_eq!(
                tasks[0].status,
                if matches!(status, "done" | "stopped") { "partial" } else { status }
            );
            assert_eq!(tasks[0].finish.as_ref().unwrap()["reviewReady"], false);
            assert_eq!(tasks[0].finish.as_ref().unwrap()["doneWhen"], "A usable result");
        }
    }

    #[test]
    fn duplicate_and_finished_moved_steps_leave_parent_state_unchanged() {
        for child_status in ["done", "stopped"] {
            let mut parent = task("destination", "Task 1");
            parent.status = "done".into();
            parent.finish = Some(serde_json::json!({"reviewReady": true}));
            let mut step = task("step", "Existing work");
            step.status = child_status.into();
            let mut tasks = vec![parent];
            merge_subtask_under_parent(&mut tasks, task("source", "Task 1"), step);
            assert_eq!(tasks[0].status, "done");
            assert_eq!(tasks[0].finish.as_ref().unwrap()["reviewReady"], true);
            merge_subtask_under_parent(
                &mut tasks,
                task("source", "Task 1"),
                task("duplicate", " existing   work "),
            );
            assert_eq!(tasks[0].subtasks.len(), 1);
            assert_eq!(tasks[0].status, "done");
            assert_eq!(tasks[0].finish.as_ref().unwrap()["reviewReady"], true);
        }
    }

    #[test]
    fn a_new_destination_parent_is_reopened_for_unfinished_work() {
        let mut parent = task("source", "Task 1");
        parent.status = "stopped".into();
        parent.finish = Some(serde_json::json!({"reviewReady": true}));
        let mut tasks = Vec::new();
        merge_subtask_under_parent(&mut tasks, parent, task("step", "New work"));
        assert_eq!(tasks[0].status, "partial");
        assert_eq!(tasks[0].finish.as_ref().unwrap()["reviewReady"], false);
    }

    #[test]
    fn moved_steps_do_not_merge_into_another_goals_same_named_parent() {
        let mut existing = task("first", "Research draft");
        existing.goal_id = Some("goal_a".into());
        existing.goal_step_id = Some("step_a".into());
        let mut incoming = task("second", "Research draft");
        incoming.goal_id = Some("goal_b".into());
        incoming.goal_step_id = Some("step_b".into());
        let mut child = task("detail", "Review the evidence");
        child.goal_id = Some("goal_b".into());
        let mut tasks = vec![existing];
        merge_subtask_under_parent(&mut tasks, incoming, child);
        assert_eq!(tasks.len(), 2);
        assert!(tasks[0].subtasks.is_empty());
        assert_eq!(tasks[1].subtasks[0].goal_id.as_deref(), Some("goal_b"));
    }
}
