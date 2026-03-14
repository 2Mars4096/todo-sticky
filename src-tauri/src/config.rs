use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Machine {
    pub name: String,
    #[serde(rename = "type")]
    pub machine_type: String,
    #[serde(default)]
    pub specs: Option<String>,
    #[serde(default)]
    pub capabilities: Option<Vec<String>>,
}

impl Default for Machine {
    fn default() -> Self {
        Self {
            name: String::new(),
            machine_type: "server".into(),
            specs: None,
            capabilities: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub provider: String,
    #[serde(rename = "apiBase")]
    pub api_base: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
    #[serde(rename = "kbPath")]
    pub kb_path: String,
    pub machines: Vec<Machine>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "openai".into(),
            api_base: "https://api.openai.com/v1".into(),
            api_key: String::new(),
            model: "gpt-4o".into(),
            kb_path: String::new(),
            machines: Vec::new(),
        }
    }
}

fn config_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("no app data dir");
    dir.join("config.json")
}

fn load_settings_file(path: &Path) -> Option<AppSettings> {
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<AppSettings>(&data).ok()
}

fn infer_provider(api_base: &str) -> String {
    if api_base.contains("openai.com") {
        "openai".into()
    } else if api_base.contains("anthropic.com") {
        "anthropic".into()
    } else if api_base.contains("googleapis.com") {
        "gemini".into()
    } else {
        "custom".into()
    }
}

fn legacy_parent_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    for base in [dirs_next::config_dir(), dirs_next::data_dir()].into_iter().flatten() {
        for app_name in ["Sticky Todo", "todo-sticky"] {
            let candidate = base.join(app_name);
            if !dirs.contains(&candidate) {
                dirs.push(candidate);
            }
        }
    }

    dirs
}

fn legacy_config_candidates() -> Vec<PathBuf> {
    legacy_parent_dirs()
        .into_iter()
        .map(|dir| dir.join("config.json"))
        .collect()
}

fn legacy_env_candidates() -> Vec<PathBuf> {
    let mut paths: Vec<PathBuf> = legacy_parent_dirs()
        .into_iter()
        .map(|dir| dir.join(".env"))
        .collect();

    if let Ok(current_dir) = env::current_dir() {
        let repo_env = current_dir.join(".env");
        if !paths.contains(&repo_env) {
            paths.push(repo_env);
        }
    }

    paths
}

fn load_legacy_settings() -> Option<AppSettings> {
    for path in legacy_config_candidates() {
        if let Some(settings) = load_settings_file(&path) {
            return Some(settings);
        }
    }

    None
}

fn parse_env_file(path: &Path) -> HashMap<String, String> {
    let mut vars = HashMap::new();

    let Ok(contents) = fs::read_to_string(path) else {
        return vars;
    };

    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let Some((key, value)) = trimmed.split_once('=') else {
            continue;
        };

        let cleaned = value.trim().trim_matches('"').trim_matches('\'').to_string();
        vars.insert(key.trim().to_string(), cleaned);
    }

    vars
}

fn load_env_vars() -> HashMap<String, String> {
    let mut vars = HashMap::new();

    for path in legacy_env_candidates() {
        if path.exists() {
            vars.extend(parse_env_file(&path));
            break;
        }
    }

    for key in [
        "VITE_LLM_API_BASE",
        "VITE_LLM_API_KEY",
        "VITE_LLM_MODEL",
        "VITE_KB_PATH",
        "VITE_MACHINES",
    ] {
        if let Ok(value) = env::var(key) {
            vars.insert(key.to_string(), value);
        }
    }

    vars
}

fn migrate_from_env() -> Option<AppSettings> {
    let vars = load_env_vars();

    let mut settings = AppSettings::default();
    let mut found_legacy_value = false;

    if let Some(api_base) = vars.get("VITE_LLM_API_BASE").filter(|v| !v.trim().is_empty()) {
        settings.provider = infer_provider(api_base);
        settings.api_base = api_base.clone();
        found_legacy_value = true;
    }

    if let Some(api_key) = vars.get("VITE_LLM_API_KEY").filter(|v| !v.trim().is_empty()) {
        settings.api_key = api_key.clone();
        found_legacy_value = true;
    }

    if let Some(model) = vars.get("VITE_LLM_MODEL").filter(|v| !v.trim().is_empty()) {
        settings.model = model.clone();
        found_legacy_value = true;
    }

    if let Some(kb_path) = vars.get("VITE_KB_PATH").filter(|v| !v.trim().is_empty()) {
        settings.kb_path = kb_path.clone();
        found_legacy_value = true;
    }

    if let Some(raw_machines) = vars.get("VITE_MACHINES").filter(|v| !v.trim().is_empty()) {
        if let Ok(machines) = serde_json::from_str::<Vec<Machine>>(raw_machines) {
            settings.machines = machines;
            found_legacy_value = true;
        }
    }

    found_legacy_value.then_some(settings)
}

pub fn load_settings(app: &AppHandle) -> AppSettings {
    let path = config_path(app);
    if let Some(settings) = load_settings_file(&path) {
        return settings;
    }

    if let Some(settings) = load_legacy_settings() {
        return settings;
    }

    if let Some(settings) = migrate_from_env() {
        return settings;
    }

    AppSettings::default()
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = config_path(app);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_kb_path(app: &AppHandle) -> String {
    let settings = load_settings(app);
    if !settings.kb_path.is_empty() {
        return settings.kb_path;
    }
    let home = dirs_next::home_dir().unwrap_or_default();
    home.join("Documents").join("Sticky Todo").to_string_lossy().into()
}
