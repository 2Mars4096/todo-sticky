use crate::config::{load_settings, Machine};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMConfig {
    pub provider: String,
    #[serde(rename = "apiBase")]
    pub api_base: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
}

struct Message {
    role: String,
    content: String,
}

async fn openai_completion(api_base: &str, api_key: &str, model: &str, messages: &[Message]) -> Result<String, String> {
    let msgs: Vec<Value> = messages.iter().map(|m| json!({"role": m.role, "content": m.content})).collect();
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/chat/completions", api_base))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({"model": model, "messages": msgs, "temperature": 0.4}))
        .send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API error: {}", text));
    }
    let data: Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string())
}

async fn anthropic_completion(api_base: &str, api_key: &str, model: &str, messages: &[Message]) -> Result<String, String> {
    let system_msg = messages.iter().find(|m| m.role == "system").map(|m| m.content.clone());
    let user_msgs: Vec<Value> = messages.iter()
        .filter(|m| m.role != "system")
        .map(|m| json!({"role": m.role, "content": m.content}))
        .collect();

    let mut body = json!({"model": model, "max_tokens": 4096, "messages": user_msgs});
    if let Some(sys) = system_msg {
        body["system"] = json!(sys);
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/messages", api_base))
        .header("Content-Type", "application/json")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API error: {}", text));
    }
    let data: Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data["content"][0]["text"].as_str().unwrap_or("").to_string())
}

async fn gemini_completion(api_base: &str, api_key: &str, model: &str, messages: &[Message]) -> Result<String, String> {
    let system_msg = messages.iter().find(|m| m.role == "system").map(|m| m.content.clone());
    let user_msgs: Vec<Value> = messages.iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            let role = if m.role == "assistant" { "model" } else { "user" };
            json!({"role": role, "parts": [{"text": m.content}]})
        })
        .collect();

    let mut body = json!({"contents": user_msgs, "generationConfig": {"temperature": 0.4}});
    if let Some(sys) = system_msg {
        body["systemInstruction"] = json!({"parts": [{"text": sys}]});
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/models/{}:generateContent?key={}", api_base, model, api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API error: {}", text));
    }
    let data: Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("").to_string())
}

async fn chat_completion(config: &LLMConfig, messages: &[Message]) -> Result<String, String> {
    if config.api_key.is_empty() {
        return Err("API key not configured. Open Settings to add your key.".into());
    }
    match config.provider.as_str() {
        "anthropic" => anthropic_completion(&config.api_base, &config.api_key, &config.model, messages).await,
        "gemini" => gemini_completion(&config.api_base, &config.api_key, &config.model, messages).await,
        _ => openai_completion(&config.api_base, &config.api_key, &config.model, messages).await,
    }
}

fn get_config(app: &AppHandle) -> LLMConfig {
    let s = load_settings(app);
    LLMConfig { provider: s.provider, api_base: s.api_base, api_key: s.api_key, model: s.model }
}

pub async fn test_connection(config: &LLMConfig) -> Result<Value, String> {
    let messages = vec![Message { role: "user".into(), content: "Reply with exactly one word: ok".into() }];
    match chat_completion(config, &messages).await {
        Ok(reply) => Ok(json!({"ok": true, "message": &reply[..reply.len().min(80)]})),
        Err(e) => Ok(json!({"ok": false, "message": e})),
    }
}

pub async fn breakdown(app: &AppHandle, task_text: &str, existing: &[String]) -> Result<Value, String> {
    let config = get_config(app);
    let existing_ctx = if existing.is_empty() {
        String::new()
    } else {
        format!("\nExisting subtasks:\n{}", existing.iter().map(|s| format!("- {}", s)).collect::<Vec<_>>().join("\n"))
    };

    let messages = vec![
        Message {
            role: "system".into(),
            content: "You are a task planning assistant. Break down tasks into actionable subtasks.\nReturn ONLY valid JSON with this structure:\n{\"subtasks\": [{\"text\": \"subtask description\", \"estimatedMinutes\": 30, \"machineTask\": false}]}\nKeep subtasks concrete and actionable. Estimate time realistically. Mark machineTask=true for tasks that can run unattended on a computer.".into(),
        },
        Message {
            role: "user".into(),
            content: format!("Break down this task into subtasks:\n\"{}\"{}",  task_text, existing_ctx),
        },
    ];

    let content = chat_completion(&config, &messages).await?;
    extract_json(&content)
}

fn get_machines(overrides: &[Machine], app: &AppHandle) -> Vec<Machine> {
    if !overrides.is_empty() {
        return overrides.to_vec();
    }
    let settings = load_settings(app);
    if !settings.machines.is_empty() {
        return settings.machines;
    }
    vec![
        Machine { name: "mini".into(), machine_type: "server".into(), specs: Some("18-core CPU, 64GB RAM, Ubuntu".into()), capabilities: Some(vec!["data processing".into(), "model training".into(), "long-running jobs".into()]) },
        Machine { name: "mac".into(), machine_type: "workstation".into(), specs: Some("Apple M4 Pro, 48GB RAM, macOS".into()), capabilities: Some(vec!["coding".into(), "writing".into(), "analysis".into(), "web browsing".into()]) },
    ]
}

pub async fn schedule(app: &AppHandle, tasks: &Value, machines_override: &[Machine]) -> Result<Value, String> {
    let config = get_config(app);
    let machines = get_machines(machines_override, app);

    let machine_desc = machines.iter().map(|m| {
        let specs = m.specs.as_deref().map(|s| format!(" — {}", s)).unwrap_or_default();
        let caps = m.capabilities.as_ref().map(|c| c.join(", ")).unwrap_or_default();
        format!("- {} ({}{}): {}", m.name, m.machine_type, specs, caps)
    }).collect::<Vec<_>>().join("\n");

    let today = chrono::Local::now().format("%A, %b %d, %Y").to_string();

    let messages = vec![
        Message {
            role: "system".into(),
            content: format!("You are an intelligent scheduling optimizer for a researcher/PhD student.\nCreate an efficient daily plan that maximizes productivity.\n\nKey principles:\n- Minimize context-switching friction\n- Maximize machine utilization\n- Prioritize deadline-sensitive tasks\n- Reserve human time for highest-value work\n- Schedule deep-focus research in prime morning hours\n- Put routine/mechanical tasks in afternoon\n\nReturn ONLY valid JSON:\n{{\"plan\": \"2-3 sentence summary\", \"schedule\": [{{\"time\": \"09:00\", \"endTime\": \"09:45\", \"parentTask\": \"exact task text\", \"action\": \"specific action\", \"assignedTo\": \"human or machine name\"}}]}}\n\nIMPORTANT: \"parentTask\" MUST exactly match one of the main task texts from the input list."),
        },
        Message {
            role: "user".into(),
            content: format!("Create an optimal schedule for today ({}).\nAssuming 8 productive hours (9am-5pm) for human work, machines can run 24/7.\n\nTasks:\n{}\n\nAvailable machines:\n{}", today, tasks, machine_desc),
        },
    ];

    let content = chat_completion(&config, &messages).await?;
    extract_json(&content)
}

fn extract_json(content: &str) -> Result<Value, String> {
    let re = regex::Regex::new(r"\{[\s\S]*\}").unwrap();
    if let Some(m) = re.find(content) {
        serde_json::from_str(m.as_str()).map_err(|e| e.to_string())
    } else {
        Ok(json!({}))
    }
}
