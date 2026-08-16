use crate::config::get_kb_path_for_cli;
use crate::task_api::{
    self, CreateTaskRequest, DeleteTaskRequest, ExtractTasksRequest, TaskDraft, UpdateTaskRequest,
};
use serde::Serialize;
use serde_json::json;
use std::path::PathBuf;

const HELP: &str = r#"Sticky Todo task API

Usage:
  sticky-todo-api [--kb-path PATH] extract [--date YYYY-MM-DD | --from YYYY-MM-DD --to YYYY-MM-DD | --all]
  sticky-todo-api [--kb-path PATH] create --date YYYY-MM-DD --text TEXT [--status STATUS] [--subtask TEXT]... [--parent-id ID] [--expected-revision REV]
  sticky-todo-api [--kb-path PATH] edit --date YYYY-MM-DD --id ID [--text TEXT] [--status STATUS] [--expected-revision REV]
  sticky-todo-api [--kb-path PATH] delete --date YYYY-MM-DD --id ID [--expected-revision REV]

All successful commands print JSON to stdout. STATUS is todo, done, partial, or question.
The knowledge-base path resolves from --kb-path, STICKY_TODO_KB_PATH, saved app settings,
or the app default, in that order.
"#;

fn take_option(args: &mut Vec<String>, name: &str) -> Result<Option<String>, String> {
    let Some(index) = args.iter().position(|arg| arg == name) else {
        return Ok(None);
    };
    if index + 1 >= args.len() {
        return Err(format!("{name} requires a value"));
    }
    let value = args.remove(index + 1);
    args.remove(index);
    Ok(Some(value))
}

fn take_required(args: &mut Vec<String>, name: &str) -> Result<String, String> {
    take_option(args, name)?.ok_or_else(|| format!("Missing required option {name}"))
}

fn take_repeated(args: &mut Vec<String>, name: &str) -> Result<Vec<String>, String> {
    let mut values = Vec::new();
    while let Some(value) = take_option(args, name)? {
        values.push(value);
    }
    Ok(values)
}

fn take_flag(args: &mut Vec<String>, name: &str) -> bool {
    if let Some(index) = args.iter().position(|arg| arg == name) {
        args.remove(index);
        true
    } else {
        false
    }
}

fn reject_unknown(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err(format!("Unknown argument(s): {}", args.join(" ")))
    }
}

fn print_json<T: Serialize>(value: &T) -> Result<(), String> {
    println!(
        "{}",
        serde_json::to_string_pretty(value).map_err(|error| error.to_string())?
    );
    Ok(())
}

pub fn run<I>(arguments: I) -> Result<(), String>
where
    I: IntoIterator<Item = String>,
{
    let mut args: Vec<String> = arguments.into_iter().collect();
    if args.is_empty() || take_flag(&mut args, "--help") || take_flag(&mut args, "-h") {
        print!("{HELP}");
        return Ok(());
    }
    let kb_path = take_option(&mut args, "--kb-path")?.map(PathBuf::from);
    let kb_path = get_kb_path_for_cli(kb_path);
    let command = args.remove(0);

    match command.as_str() {
        "extract" | "list" => {
            let request = ExtractTasksRequest {
                date: take_option(&mut args, "--date")?,
                from_date: take_option(&mut args, "--from")?,
                to_date: take_option(&mut args, "--to")?,
                all: take_flag(&mut args, "--all"),
            };
            reject_unknown(&args)?;
            print_json(&task_api::extract_tasks(&kb_path, request)?)
        }
        "create" | "input" => {
            let date = take_required(&mut args, "--date")?;
            let text = take_required(&mut args, "--text")?;
            let status = take_option(&mut args, "--status")?.unwrap_or_else(|| "todo".into());
            let subtasks = take_repeated(&mut args, "--subtask")?
                .into_iter()
                .map(|text| TaskDraft {
                    text,
                    status: "todo".into(),
                })
                .collect();
            let parent_id = take_option(&mut args, "--parent-id")?;
            let expected_revision = take_option(&mut args, "--expected-revision")?;
            reject_unknown(&args)?;
            print_json(&task_api::create_task(
                &kb_path,
                CreateTaskRequest {
                    date,
                    text,
                    status,
                    subtasks,
                    parent_id,
                    expected_revision,
                },
            )?)
        }
        "edit" | "update" => {
            let date = take_required(&mut args, "--date")?;
            let id = take_required(&mut args, "--id")?;
            let text = take_option(&mut args, "--text")?;
            let status = take_option(&mut args, "--status")?;
            let expected_revision = take_option(&mut args, "--expected-revision")?;
            reject_unknown(&args)?;
            print_json(&task_api::update_task(
                &kb_path,
                UpdateTaskRequest {
                    date,
                    id,
                    text,
                    status,
                    expected_revision,
                },
            )?)
        }
        "delete" => {
            let date = take_required(&mut args, "--date")?;
            let id = take_required(&mut args, "--id")?;
            let expected_revision = take_option(&mut args, "--expected-revision")?;
            reject_unknown(&args)?;
            print_json(&task_api::delete_task(
                &kb_path,
                DeleteTaskRequest {
                    date,
                    id,
                    expected_revision,
                },
            )?)
        }
        _ => Err(format!("Unknown command '{command}'. Run with --help.")),
    }
}

pub fn print_error(error: &str) {
    eprintln!(
        "{}",
        serde_json::to_string_pretty(&json!({
            "ok": false,
            "error": { "message": error }
        }))
        .unwrap_or_else(|_| format!(r#"{{"ok":false,"error":{{"message":"{error}"}}}}"#))
    );
}
