use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

fn next_id() -> String {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    let c = ID_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("task_{}_{}", ts, c)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub status: String,
    pub subtasks: Vec<Task>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatedTask {
    pub id: String,
    pub text: String,
    pub status: String,
    pub subtasks: Vec<Task>,
    #[serde(rename = "sourceDate")]
    pub source_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedTask {
    pub id: String,
    pub text: String,
    pub status: String,
    #[serde(rename = "todaySubtasks")]
    pub today_subtasks: Vec<Task>,
    #[serde(rename = "otherSubtasks")]
    pub other_subtasks: Vec<DatedTask>,
}

pub struct DateSection {
    pub date: String,
    pub tasks: Vec<Task>,
}

pub struct ParsedFile {
    pub date_sections: Vec<DateSection>,
}

fn status_from_char(c: char) -> &'static str {
    match c {
        'x' | 'X' => "done",
        '~' => "partial",
        '?' => "question",
        _ => "todo",
    }
}

fn char_from_status(s: &str) -> char {
    match s {
        "done" => 'x',
        "partial" => '~',
        "question" => '?',
        _ => ' ',
    }
}

fn parse_task_lines(lines: &[&str]) -> Vec<Task> {
    let checkbox_re = Regex::new(r"^(\s*)- \[(.)\]\s+(.*)$").unwrap();
    let bare_re = Regex::new(r"^(\s*)- (.*)$").unwrap();

    let mut root: Vec<Task> = Vec::new();
    let mut stack: Vec<(usize, usize)> = Vec::new(); // (indent, index into parent's subtasks or root)

    for line in lines {
        let (indent, status, text) = if let Some(caps) = checkbox_re.captures(line) {
            let indent = caps.get(1).unwrap().as_str().len();
            let status_char = caps.get(2).unwrap().as_str().chars().next().unwrap_or(' ');
            let text = caps.get(3).unwrap().as_str().trim().to_string();
            (indent, status_from_char(status_char).to_string(), text)
        } else if let Some(caps) = bare_re.captures(line) {
            let indent = caps.get(1).unwrap().as_str().len();
            let text = caps.get(2).unwrap().as_str().trim().to_string();
            (indent, "todo".to_string(), text)
        } else {
            continue;
        };

        let task = Task {
            id: next_id(),
            text,
            status,
            subtasks: Vec::new(),
        };

        while !stack.is_empty() && stack.last().unwrap().0 >= indent {
            stack.pop();
        }

        if stack.is_empty() {
            root.push(task);
            let idx = root.len() - 1;
            stack.push((indent, idx));
        } else {
            let parent = get_task_mut(&mut root, &stack);
            parent.subtasks.push(task);
            let child_idx = parent.subtasks.len() - 1;
            stack.push((indent, child_idx));
        }
    }

    root
}

fn get_task_mut<'a>(root: &'a mut Vec<Task>, stack: &[(usize, usize)]) -> &'a mut Task {
    let mut current = &mut root[stack[0].1];
    for &(_, idx) in &stack[1..] {
        current = &mut current.subtasks[idx];
    }
    current
}

pub fn parse_weekly_file(content: &str) -> ParsedFile {
    let date_heading_re = Regex::new(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$").unwrap();
    let lines: Vec<&str> = content.lines().collect();
    let mut sections = Vec::new();

    let mut i = 0;
    while i < lines.len() {
        if let Some(caps) = date_heading_re.captures(lines[i]) {
            let date = caps.get(1).unwrap().as_str().to_string();
            i += 1;
            let mut task_lines = Vec::new();
            while i < lines.len() {
                if lines[i].starts_with("## ") {
                    break;
                }
                task_lines.push(lines[i]);
                i += 1;
            }
            let tasks = parse_task_lines(&task_lines);
            sections.push(DateSection { date, tasks });
        } else {
            i += 1;
        }
    }

    ParsedFile { date_sections: sections }
}

pub fn serialize_tasks(tasks: &[Task], indent: usize) -> String {
    let pad = "  ".repeat(indent);
    let mut result = String::new();
    for task in tasks {
        let c = char_from_status(&task.status);
        result.push_str(&format!("{}- [{}] {}\n", pad, c, task.text));
        if !task.subtasks.is_empty() {
            result.push_str(&serialize_tasks(&task.subtasks, indent + 1));
        }
    }
    result
}

pub fn serialize_date_section(date: &str, tasks: &[Task]) -> String {
    format!("## {}\n{}", date, serialize_tasks(tasks, 0))
}

fn normalize_task_text(text: &str) -> String {
    text.to_lowercase().trim().split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn get_tasks_for_date(parsed: &ParsedFile, target_date: &str) -> Vec<AggregatedTask> {
    use std::collections::HashMap;

    struct Entry {
        dates: HashMap<String, Vec<Task>>,
        status: String,
    }

    let mut index: HashMap<String, Entry> = HashMap::new();

    for section in &parsed.date_sections {
        for task in &section.tasks {
            let key = normalize_task_text(&task.text);
            let entry = index.entry(key.clone()).or_insert_with(|| Entry {
                dates: HashMap::new(),
                status: task.status.clone(),
            });
            if section.date == target_date {
                entry.status = task.status.clone();
            }
            entry.dates.insert(section.date.clone(), task.subtasks.clone());
        }
    }

    let today_section = parsed.date_sections.iter().find(|s| s.date == target_date);
    let mut result = Vec::new();

    if let Some(section) = today_section {
        for task in &section.tasks {
            let key = normalize_task_text(&task.text);
            let mut other_subtasks = Vec::new();

            if let Some(entry) = index.get(&key) {
                for (date, subs) in &entry.dates {
                    if date == target_date {
                        continue;
                    }
                    for sub in subs {
                        other_subtasks.push(DatedTask {
                            id: sub.id.clone(),
                            text: sub.text.clone(),
                            status: sub.status.clone(),
                            subtasks: sub.subtasks.clone(),
                            source_date: date.clone(),
                        });
                    }
                }
            }

            result.push(AggregatedTask {
                id: task.id.clone(),
                text: task.text.clone(),
                status: task.status.clone(),
                today_subtasks: task.subtasks.clone(),
                other_subtasks,
            });
        }
    }

    result
}
