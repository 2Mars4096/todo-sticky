//! Narrow local bridge. Todo never receives Diane credentials or launches agents.
use serde_json::Value;
use std::time::Duration;

#[tauri::command]
pub async fn diane_request(action: String, request_id: Option<String>, body: Option<Value>) -> Result<Value, String> {
    if matches!(action.as_str(), "connection" | "preparation-records" | "prepare" | "preparation-status") {
        return preparation_request(&action, request_id, body).await;
    }
    let suffix = match action.as_str() {
        "projects" | "choose-project" => "/projects".to_owned(),
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

// Only the bounded Todo preparation API is exposed; no arbitrary proxy or credentials.
async fn preparation_request(action: &str, request_id: Option<String>, body: Option<Value>) -> Result<Value, String> {
    let body = body.unwrap_or(serde_json::json!({}));
    let base = "http://127.0.0.1:45173/api/plugins";
    let timeout = if action == "prepare" { 390 } else { 20 };
    let client = reqwest::Client::builder().timeout(Duration::from_secs(timeout))
        .redirect(reqwest::redirect::Policy::none()).no_proxy().build().map_err(|e| e.to_string())?;
    let mut request = match action {
        "connection" => client.get(format!("{base}/connection")),
        "preparation-records" => {
            let mut query = vec![("record_type", "task"), ("limit", "500")];
            if let Some(cursor) = body.get("cursor").and_then(Value::as_str) { query.push(("cursor", cursor)); }
            client.get(format!("{base}/todo/records")).query(&query)
        },
        "prepare" => {
            let payload = body.get("payload").ok_or("Missing preparation payload")?;
            if payload.get("action").and_then(Value::as_str) != Some("prepare") { return Err("Only task preparation is supported".into()); }
            client.post(format!("{base}/todo/intelligence")).json(payload)
        },
        "preparation-status" => {
            let id = request_id.ok_or("Missing preparation ID")?;
            if id.is_empty() || id.len() > 160 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') { return Err("Invalid preparation ID".into()); }
            client.get(format!("{base}/todo/intelligence/{id}"))
        },
        _ => return Err("Unsupported preparation action".into()),
    };
    if action != "connection" {
        let scope = body.get("scope").and_then(Value::as_str).filter(|v| !v.is_empty() && v.len() <= 200).ok_or("Reconnect Diane before preparing")?;
        request = request.header("X-Diane-Plugin-Scope", scope);
    }
    let response = request.send().await.map_err(|_| "Diane preparation did not respond. Check its receipt before retrying.".to_string())?;
    let status = response.status();
    let value: Value = response.json().await.map_err(|_| "Diane needs the Todo preparation update.".to_string())?;
    if !status.is_success() { return Err(value.get("detail").and_then(Value::as_str).unwrap_or("Diane preparation unavailable").to_string()); }
    Ok(value)
}
