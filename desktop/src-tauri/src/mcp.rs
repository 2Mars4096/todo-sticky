//! Local, line-delimited stdio MCP adapter. No network listener or separate store.
use crate::task_api;
use serde_json::{json, Value};
use std::io::{BufRead, Write};
use std::path::Path;

const VERSION: &str = "2025-11-25";
const MAX_MESSAGE: usize = 1024 * 1024;

fn schema(properties: Value, required: &[&str]) -> Value {
    json!({"type":"object","properties":properties,"required":required,"additionalProperties":false})
}

fn tools(read_only: bool) -> Vec<Value> {
    let string = json!({"type":"string","minLength":1});
    let date = json!({"type":"string","description":"Saved list date, YYYY-MM-DD; earlier tasks retain their original date."});
    let status = json!({"type":"string","enum":["todo","done","partial","question","stopped"]});
    let revision = json!({"type":"string","minLength":1,"description":"Weekly-file revision from latest list or mutation. Re-read after a conflict; never retry blindly."});
    let mut result = vec![json!({
        "name":"todo_list", "description":"Read local tasks and nested steps, IDs and weekly-file revisions. Defaults to today. Choose date, fromDate/toDate, or all. No cloud/AI calls.",
        "inputSchema":schema(json!({"date":date,"fromDate":date,"toDate":date,"all":{"type":"boolean"}}), &[]),
        "annotations":{"readOnlyHint":true,"openWorldHint":false}
    })];
    if read_only {
        return result;
    }
    for (name, description, properties, required, destructive) in [
        ("todo_create", "Create one task with optional steps, or a nested step using parentId. For an existing weekly file pass its latest expectedRevision. Creation is not idempotent: inspect the date before retrying after lost responses.",
         json!({"date":date,"text":string,"status":status,"parentId":string,"expectedRevision":revision,"subtasks":{"type":"array","items":schema(json!({"text":string,"status":status}), &["text"])}}), vec!["date","text"], false),
        ("todo_edit", "Edit text and/or status of an exact task or step. Preserves other metadata. Status changes affect only the selected item; no UI completion cascade.",
         json!({"date":date,"id":string,"text":string,"status":status,"expectedRevision":revision}), vec!["date","id","expectedRevision"], true),
        ("todo_delete", "Delete an exact task including all its nested steps. Returns the removed tree; no undo. Require explicit user intent to delete.",
         json!({"date":date,"id":string,"expectedRevision":revision}), vec!["date","id","expectedRevision"], true),
    ] {
        result.push(json!({"name":name,"description":description,"inputSchema":schema(properties,&required),
            "annotations":{"readOnlyHint":false,"destructiveHint":destructive,"idempotentHint":false,"openWorldHint":false}}));
    }
    result
}

// Enforce the advertised narrow schemas rather than silently ignoring misspelled fields.
fn validate(value: &Value, schema: &Value) -> Result<(), String> {
    match schema["type"].as_str().unwrap_or("") {
        "object" => {
            let object = value.as_object().ok_or("Expected an object")?;
            for key in schema["required"].as_array().unwrap() {
                let key = key.as_str().unwrap();
                if !object.contains_key(key) {
                    return Err(format!("Missing {key}"));
                }
            }
            for (key, value) in object {
                let property = &schema["properties"][key];
                if property.is_null() {
                    return Err(format!("Unknown argument {key}"));
                }
                validate(value, property).map_err(|e| format!("{key}: {e}"))?;
            }
        }
        "string" => {
            let text = value.as_str().ok_or("Expected a string")?;
            if schema["minLength"] == 1 && text.trim().is_empty() {
                return Err("Must not be empty".into());
            }
            if let Some(choices) = schema["enum"].as_array() {
                if !choices.contains(value) {
                    return Err("Unsupported value".into());
                }
            }
        }
        "boolean" if !value.is_boolean() => return Err("Expected a boolean".into()),
        "array" => {
            for item in value.as_array().ok_or("Expected an array")? {
                validate(item, &schema["items"])?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn call(kb: &Path, name: &str, args: Value) -> Result<Value, String> {
    macro_rules! invoke {
        ($function:ident) => {{
            let request = serde_json::from_value(args).map_err(|e| e.to_string())?;
            serde_json::to_value(task_api::$function(kb, request)?).map_err(|e| e.to_string())
        }};
    }
    match name {
        "todo_list" => {
            let mut request: task_api::ExtractTasksRequest =
                serde_json::from_value(args).map_err(|e| e.to_string())?;
            // Range reads must not expose duplicate historical projections as editable tasks.
            request.canonical_dates = request.date.is_none()
                && (request.all || request.from_date.is_some() || request.to_date.is_some());
            serde_json::to_value(task_api::extract_tasks(kb, request)?).map_err(|e| e.to_string())
        }
        "todo_create" => {
            let request: task_api::CreateTaskRequest =
                serde_json::from_value(args).map_err(|e| e.to_string())?;
            if request.expected_revision.is_none() {
                let current = task_api::extract_tasks(
                    kb,
                    task_api::ExtractTasksRequest {
                        date: Some(request.date.clone()),
                        ..Default::default()
                    },
                )?;
                if !current.dates.is_empty() {
                    return Err("Read this date and supply expectedRevision before creating in an existing archive".into());
                }
            }
            serde_json::to_value(task_api::create_task(kb, request)?).map_err(|e| e.to_string())
        }
        "todo_edit" => invoke!(update_task),
        "todo_delete" => invoke!(delete_task),
        _ => Err("Unknown tool".into()),
    }
}

fn error(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}})
}

#[derive(Default)]
struct Session {
    initialized: bool,
    ready: bool,
}

impl Session {
    fn handle(&mut self, kb: &Path, read_only: bool, message: Value) -> Option<Value> {
        let id = message.get("id").cloned();
        let method = message["method"].as_str();
        if !message.is_object()
            || message["jsonrpc"] != "2.0"
            || method.is_none()
            || id
                .as_ref()
                .is_some_and(|v| !v.is_string() && !v.is_number())
        {
            return Some(error(Value::Null, -32600, "Invalid JSON-RPC request"));
        }
        let method = method.unwrap();
        if id.is_none() {
            if method == "notifications/initialized" && self.initialized {
                self.ready = true;
            }
            return None;
        }
        let id = id.unwrap();
        let params = message.get("params").cloned().unwrap_or_else(|| json!({}));
        let result = match method {
            "initialize" if !self.initialized => {
                if !params["protocolVersion"].is_string()
                    || !params["capabilities"].is_object()
                    || !params["clientInfo"].is_object()
                {
                    return Some(error(id, -32602, "Invalid initialize parameters"));
                }
                self.initialized = true;
                json!({"protocolVersion":VERSION,"capabilities":{"tools":{}},"serverInfo":{"name":"sticky-todo","version":"1.0.0"},
                    "instructions":"Local Markdown tasks only. Read before writes; mutations return the next weekly revision. Pause desktop editing during mutations. No goals, focus, cloud sync or Diane dependency."})
            }
            "ping" => json!({}),
            _ if !self.ready => return Some(error(id, -32600, "Initialize the session first")),
            "tools/list" => json!({"tools":tools(read_only)}),
            "tools/call" => {
                let name = params["name"].as_str().unwrap_or("");
                let available = tools(read_only);
                let Some(tool) = available.iter().find(|tool| tool["name"] == name) else {
                    return Some(error(id, -32602, "Unknown or disabled tool"));
                };
                let args = params
                    .get("arguments")
                    .cloned()
                    .unwrap_or_else(|| json!({}));
                let outcome =
                    validate(&args, &tool["inputSchema"]).and_then(|()| call(kb, name, args));
                match outcome {
                    Ok(data) => {
                        json!({"content":[{"type":"text","text":data.to_string()}],"structuredContent":data,"isError":false})
                    }
                    Err(message) => {
                        json!({"content":[{"type":"text","text":message}],"isError":true})
                    }
                }
            }
            _ => return Some(error(id, -32601, "Method not found")),
        };
        Some(json!({"jsonrpc":"2.0","id":id,"result":result}))
    }
}

pub fn serve(
    kb: &Path,
    read_only: bool,
    mut input: impl BufRead,
    mut output: impl Write,
) -> Result<(), String> {
    let mut session = Session::default();
    loop {
        let mut bytes = Vec::new();
        // Bound each frame before allocating an arbitrary amount of input.
        let count = std::io::Read::take(&mut input, (MAX_MESSAGE + 1) as u64)
            .read_until(b'\n', &mut bytes)
            .map_err(|e| e.to_string())?;
        if count == 0 {
            return Ok(());
        }
        if count > MAX_MESSAGE {
            return Err("MCP message exceeds 1 MiB".into());
        }
        let response = match serde_json::from_slice(&bytes) {
            Ok(message) => session.handle(kb, read_only, message),
            Err(_) => Some(error(Value::Null, -32700, "Parse error")),
        };
        if let Some(response) = response {
            writeln!(output, "{response}").map_err(|e| e.to_string())?;
            output.flush().map_err(|e| e.to_string())?;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(session: &mut Session, kb: &Path, name: &str, arguments: Value) -> Value {
        session.handle(kb, false, json!({"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":name,"arguments":arguments}})).unwrap()["result"].clone()
    }

    #[test]
    fn meeting_action_lifecycle_and_stale_revision() {
        let kb = tempfile::tempdir().unwrap();
        let mut session = Session {
            initialized: true,
            ready: true,
        };
        let created = request(
            &mut session,
            kb.path(),
            "todo_create",
            json!({"date":"2026-11-10","text":"Meeting follow-up\nSend minutes","subtasks":[{"text":"Check attendees"}]}),
        );
        assert_eq!(created["isError"], false);
        let task = &created["structuredContent"]["task"];
        let id = task["id"].clone();
        let revision = created["structuredContent"]["revision"].clone();
        let read = request(
            &mut session,
            kb.path(),
            "todo_list",
            json!({"date":"2026-11-10"}),
        );
        assert_eq!(read["structuredContent"]["dates"][0]["tasks"][0], *task);
        let missing_revision = request(
            &mut session,
            kb.path(),
            "todo_edit",
            json!({"date":"2026-11-10","id":id,"text":"Unsafe"}),
        );
        assert_eq!(missing_revision["isError"], true);
        assert_eq!(
            request(
                &mut session,
                kb.path(),
                "todo_create",
                json!({"date":"2026-11-10","text":"Unversioned"})
            )["isError"],
            true
        );
        let edited = request(
            &mut session,
            kb.path(),
            "todo_edit",
            json!({"date":"2026-11-10","id":id,"text":"Send approved minutes","expectedRevision":revision}),
        );
        assert_eq!(edited["isError"], false);
        assert_eq!(
            edited["structuredContent"]["task"]["subtasks"],
            task["subtasks"]
        );
        let stale = request(
            &mut session,
            kb.path(),
            "todo_delete",
            json!({"date":"2026-11-10","id":id,"expectedRevision":revision}),
        );
        assert_eq!(stale["isError"], true);
        let deleted = request(
            &mut session,
            kb.path(),
            "todo_delete",
            json!({"date":"2026-11-10","id":id,"expectedRevision":edited["structuredContent"]["revision"]}),
        );
        assert_eq!(deleted["isError"], false);
        assert_eq!(
            deleted["structuredContent"]["task"]["subtasks"],
            task["subtasks"]
        );
        assert_eq!(
            request(
                &mut session,
                kb.path(),
                "todo_list",
                json!({"date":"2026-11-10"})
            )["structuredContent"]["dates"][0]["tasks"],
            json!([])
        );
    }

    #[test]
    fn protocol_framing_lifecycle_and_read_only() {
        let kb = tempfile::tempdir().unwrap();
        let messages = [
            "not json".to_string(),
            json!({"jsonrpc":"2.0","id":0,"method":"tools/list"}).to_string(),
            json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":VERSION,"capabilities":{},"clientInfo":{"name":"test","version":"1"}}}).to_string(),
            json!({"jsonrpc":"2.0","method":"notifications/initialized"}).to_string(),
            json!({"jsonrpc":"2.0","id":2,"method":"tools/list"}).to_string(),
            json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"todo_create","arguments":{"date":"2026-11-10","text":"Blocked"}}}).to_string(),
            json!({"jsonrpc":"2.0","id":4,"method":"ping"}).to_string(),
            json!({"jsonrpc":"2.0","id":5,"method":"unknown"}).to_string(),
        ].join("\n") + "\n";
        let mut output = Vec::new();
        serve(kb.path(), true, messages.as_bytes(), &mut output).unwrap();
        let replies: Vec<Value> = String::from_utf8(output)
            .unwrap()
            .lines()
            .map(|line| serde_json::from_str(line).unwrap())
            .collect();
        assert_eq!(replies.len(), 7);
        assert_eq!(replies[0]["error"]["code"], -32700);
        assert_eq!(replies[1]["error"]["code"], -32600);
        assert_eq!(replies[2]["result"]["protocolVersion"], VERSION);
        assert_eq!(replies[3]["result"]["tools"].as_array().unwrap().len(), 1);
        assert_eq!(replies[4]["error"]["code"], -32602);
        assert_eq!(replies[5]["result"], json!({}));
        assert_eq!(replies[6]["error"]["code"], -32601);
        assert!(!kb.path().join("content").exists());
    }

    #[test]
    fn rejects_bad_arguments_and_oversized_frames() {
        let kb = tempfile::tempdir().unwrap();
        let mut session = Session {
            initialized: true,
            ready: true,
        };
        for args in [
            json!({"date":"bad","text":"x"}),
            json!({"date":"2026-11-10","text":"x","typo":true}),
            json!({"date":"2026-11-10","text":"x","status":"invalid"}),
            json!({"date":"2026-11-10","text":"x","subtasks":[{"text":""}]}),
        ] {
            assert_eq!(
                request(&mut session, kb.path(), "todo_create", args)["isError"],
                true
            );
        }
        let large = vec![b' '; MAX_MESSAGE + 1];
        assert!(serve(kb.path(), false, large.as_slice(), Vec::new()).is_err());
        assert!(!kb.path().join("content").exists());
    }
}
