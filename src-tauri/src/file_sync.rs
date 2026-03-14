use crate::markdown::{parse_weekly_file, serialize_date_section, serialize_tasks, get_tasks_for_date, AggregatedTask, Task};
use chrono::Datelike;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

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

pub fn write_back_section(file_path: &str, date_str: &str, new_section: &str) -> Result<(), String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;
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

pub fn ensure_date_section(todo_dir: &str, date_str: &str, tasks: &[Task]) -> Result<FileInfo, String> {
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

pub fn append_tasks_to_date(todo_dir: &str, date_str: &str, tasks: &[Task]) -> Result<FileInfo, String> {
    let task_lines = serialize_tasks(tasks, 0);

    if let Some(file_info) = find_weekly_file(todo_dir, date_str)? {
        let content = fs::read_to_string(&file_info.file_path)
            .map_err(|e| format!("Failed to read {}: {}", file_info.file_path, e))?;
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

pub fn get_tasks(todo_dir: &str, date_str: &str) -> Result<(Vec<AggregatedTask>, Option<String>, Option<String>), String> {
    let result = find_weekly_file(todo_dir, date_str)?;
    match result {
        Some(info) => {
            let content = fs::read_to_string(&info.file_path)
                .map_err(|e| format!("Failed to read {}: {}", info.file_path, e))?;
            let parsed = parse_weekly_file(&content);
            let aggregated = get_tasks_for_date(&parsed, date_str);
            Ok((aggregated, Some(info.file_path), Some(info.week_start)))
        }
        None => Ok((Vec::new(), None, None)),
    }
}
