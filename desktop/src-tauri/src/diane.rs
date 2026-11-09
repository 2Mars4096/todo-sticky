//! Narrow local bridge. Todo never receives Diane credentials or launches agents.
use serde_json::Value;
use std::time::Duration;

#[tauri::command]
pub async fn diane_request(action: String, request_id: Option<String>, body: Option<Value>) -> Result<Value, String> {
    let suffix = match action.as_str() {
        "projects" => "/projects".to_owned(),
        "dispatch" => "/requests".to_owned(),
        "status" | "stop" | "open" => {
            let id = request_id.ok_or("Missing dispatch ID")?;
            if id.len() != 36 || !id.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
                return Err("Invalid dispatch ID".into());
            }
            format!("/requests/{}{}", id, match action.as_str() { "stop" => "/stop", "open" => "/open", _ => "" })
        }
        _ => return Err("Unsupported Diane action".into()),
    };
    let client = reqwest::Client::builder().timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none()).no_proxy().build().map_err(|e| e.to_string())?;
    let url = format!("http://127.0.0.1:45173/api/sticky-todo{}", suffix);
    let request = if action == "projects" || action == "status" { client.get(url) } else { client.post(url).json(&body.unwrap_or(serde_json::json!({}))) };
    let response = request.send().await.map_err(|_| "Cannot reach Diane. Open Dear Diane and retry; an existing run may still be working.".to_string())?;
    let status = response.status();
    let value: Value = response.json().await.map_err(|_| "Diane needs the Todo handoff update.".to_string())?;
    if !status.is_success() {
        return Err(value.get("detail").and_then(Value::as_str).unwrap_or("Diane request failed. Open Diane to inspect the session.").to_string());
    }
    Ok(value)
}
