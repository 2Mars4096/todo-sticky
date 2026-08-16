use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const DEFAULT_STAR_FOCUS_ARCHIVE_RETENTION_LIMIT: u32 = 12;
const APP_IDENTIFIER: &str = "com.todo-sticky.app";

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
pub struct LLMProviderProfile {
    #[serde(rename = "apiBase")]
    pub api_base: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
}

impl Default for LLMProviderProfile {
    fn default() -> Self {
        Self {
            api_base: String::new(),
            api_key: String::new(),
            model: String::new(),
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
    #[serde(rename = "providerProfiles")]
    pub provider_profiles: HashMap<String, LLMProviderProfile>,
    #[serde(rename = "kbPath")]
    pub kb_path: String,
    pub machines: Vec<Machine>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "moonshot".into(),
            api_base: "https://api.moonshot.ai/v1".into(),
            api_key: String::new(),
            model: "kimi-k2.6".into(),
            provider_profiles: HashMap::new(),
            kb_path: String::new(),
            machines: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct StarFocusSession {
    pub task_id: String,
    pub task_text: String,
    pub duration_minutes: u32,
    pub started_at: i64,
    pub ends_at: i64,
    pub paused_at: Option<i64>,
}

impl Default for StarFocusSession {
    fn default() -> Self {
        Self {
            task_id: String::new(),
            task_text: String::new(),
            duration_minutes: 25,
            started_at: 0,
            ends_at: 0,
            paused_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct StarFocusMissionRecord {
    pub id: String,
    pub task_id: String,
    pub task_text: String,
    pub duration_minutes: u32,
    pub completed_at: i64,
    pub vehicle_code: String,
    pub orbit_index: u32,
    pub orbit_label: String,
}

impl Default for StarFocusMissionRecord {
    fn default() -> Self {
        Self {
            id: String::new(),
            task_id: String::new(),
            task_text: String::new(),
            duration_minutes: 25,
            completed_at: 0,
            vehicle_code: String::new(),
            orbit_index: 0,
            orbit_label: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct StarFocusState {
    pub sidebar_collapsed: bool,
    pub selected_task_id: Option<String>,
    pub selected_task_text: Option<String>,
    pub session_duration_minutes: u32,
    pub archive_retention_limit: u32,
    pub active_session: Option<StarFocusSession>,
    pub mission_history: Vec<StarFocusMissionRecord>,
    pub last_completed_mission_id: Option<String>,
}

impl Default for StarFocusState {
    fn default() -> Self {
        Self {
            sidebar_collapsed: true,
            selected_task_id: None,
            selected_task_text: None,
            session_duration_minutes: 25,
            archive_retention_limit: DEFAULT_STAR_FOCUS_ARCHIVE_RETENTION_LIMIT,
            active_session: None,
            mission_history: Vec::new(),
            last_completed_mission_id: None,
        }
    }
}

fn choose_home_dir(
    account_home: Option<PathBuf>,
    environment_home: Option<PathBuf>,
) -> Option<PathBuf> {
    account_home.or(environment_home)
}

#[cfg(target_os = "macos")]
fn macos_account_home_dir() -> Option<PathBuf> {
    use std::ffi::{CStr, OsString};
    use std::mem;
    use std::os::unix::ffi::OsStringExt;
    use std::ptr;

    // LaunchServices can preserve a caller-provided HOME. Resolve the signed-in
    // account directly so launcher isolation cannot create a second data root.
    unsafe {
        let capacity = match libc::sysconf(libc::_SC_GETPW_R_SIZE_MAX) {
            size if size > 0 => size as usize,
            _ => 512,
        };
        let mut buffer = vec![0_u8; capacity];
        let mut password: libc::passwd = mem::zeroed();
        let mut result = ptr::null_mut();
        let status = libc::getpwuid_r(
            libc::getuid(),
            &mut password,
            buffer.as_mut_ptr().cast(),
            buffer.len(),
            &mut result,
        );

        if status != 0 || result.is_null() || password.pw_dir.is_null() {
            return None;
        }

        let bytes = CStr::from_ptr(password.pw_dir).to_bytes();
        (!bytes.is_empty()).then(|| PathBuf::from(OsString::from_vec(bytes.to_vec())))
    }
}

fn stable_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    let account_home = macos_account_home_dir();
    #[cfg(not(target_os = "macos"))]
    let account_home = None;

    choose_home_dir(account_home, dirs_next::home_dir())
}

#[cfg(target_os = "macos")]
fn macos_app_data_dir(home: &Path, identifier: &str) -> PathBuf {
    home.join("Library")
        .join("Application Support")
        .join(identifier)
}

fn stable_app_data_dir(app: &AppHandle) -> PathBuf {
    #[cfg(target_os = "macos")]
    if let Some(home) = stable_home_dir() {
        return macos_app_data_dir(&home, &app.config().identifier);
    }

    app.path().app_data_dir().expect("no app data dir")
}

fn default_kb_path(home: &Path) -> PathBuf {
    home.join("Documents").join("Sticky Todo")
}

fn config_path(app: &AppHandle) -> PathBuf {
    stable_app_data_dir(app).join("config.json")
}

fn star_focus_path(app: &AppHandle) -> PathBuf {
    stable_app_data_dir(app).join("star_focus.json")
}

pub fn has_saved_config(app: &AppHandle) -> bool {
    config_path(app).exists() || load_legacy_settings().is_some() || migrate_from_env().is_some()
}

fn load_settings_file(path: &Path) -> Option<AppSettings> {
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<AppSettings>(&data).ok()
}

fn normalize_provider_profiles(mut settings: AppSettings) -> AppSettings {
    settings.provider_profiles.insert(
        settings.provider.clone(),
        LLMProviderProfile {
            api_base: settings.api_base.clone(),
            api_key: settings.api_key.clone(),
            model: settings.model.clone(),
        },
    );
    settings
}

fn sanitize_archive_retention_limit(limit: u32) -> u32 {
    match limit {
        6 | 12 | 24 => limit,
        _ => DEFAULT_STAR_FOCUS_ARCHIVE_RETENTION_LIMIT,
    }
}

fn sanitize_star_focus_state(mut state: StarFocusState) -> StarFocusState {
    state.archive_retention_limit = sanitize_archive_retention_limit(state.archive_retention_limit);
    state
        .mission_history
        .truncate(state.archive_retention_limit as usize);

    if let Some(last_completed_mission_id) = state.last_completed_mission_id.as_ref() {
        if !state
            .mission_history
            .iter()
            .any(|mission| &mission.id == last_completed_mission_id)
        {
            state.last_completed_mission_id = None;
        }
    }

    state
}

fn load_star_focus_file(path: &Path) -> Option<StarFocusState> {
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<StarFocusState>(&data)
        .ok()
        .map(sanitize_star_focus_state)
}

fn infer_provider(api_base: &str) -> String {
    let api_base = api_base.to_lowercase();

    if api_base.contains("openrouter.ai") {
        "openrouter".into()
    } else if api_base.contains("openai.com") {
        "openai".into()
    } else if api_base.contains("moonshot.ai") || api_base.contains("kimi.ai") {
        "moonshot".into()
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
        return normalize_provider_profiles(settings);
    }

    if let Some(settings) = load_legacy_settings() {
        return normalize_provider_profiles(settings);
    }

    if let Some(settings) = migrate_from_env() {
        return normalize_provider_profiles(settings);
    }

    normalize_provider_profiles(AppSettings::default())
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = config_path(app);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let normalized_settings = normalize_provider_profiles(settings.clone());
    let json = serde_json::to_string_pretty(&normalized_settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_star_focus_state(app: &AppHandle) -> Option<StarFocusState> {
    load_star_focus_file(&star_focus_path(app))
}

pub fn save_star_focus_state(app: &AppHandle, state: &StarFocusState) -> Result<(), String> {
    let path = star_focus_path(app);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let sanitized_state = sanitize_star_focus_state(state.clone());
    let json = serde_json::to_string_pretty(&sanitized_state).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_kb_path(app: &AppHandle) -> String {
    let settings = load_settings(app);
    if !settings.kb_path.is_empty() {
        return settings.kb_path;
    }
    let home = stable_home_dir().unwrap_or_default();
    default_kb_path(&home).to_string_lossy().into()
}

pub fn get_kb_path_for_cli(explicit_path: Option<PathBuf>) -> PathBuf {
    if let Some(path) = explicit_path {
        return path;
    }
    if let Ok(path) = env::var("STICKY_TODO_KB_PATH") {
        if !path.trim().is_empty() {
            return PathBuf::from(path);
        }
    }

    let current_config = stable_home_dir().and_then(|home| {
        #[cfg(target_os = "macos")]
        let data_dir = macos_app_data_dir(&home, APP_IDENTIFIER);
        #[cfg(not(target_os = "macos"))]
        let data_dir = dirs_next::data_dir()?.join(APP_IDENTIFIER);
        Some(data_dir.join("config.json"))
    });
    let settings = current_config
        .as_deref()
        .and_then(load_settings_file)
        .or_else(load_legacy_settings)
        .or_else(migrate_from_env);
    if let Some(path) = settings
        .map(|settings| settings.kb_path)
        .filter(|path| !path.trim().is_empty())
    {
        return PathBuf::from(path);
    }

    default_kb_path(&stable_home_dir().unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::{
        choose_home_dir, default_kb_path, infer_provider, normalize_provider_profiles, AppSettings,
        LLMProviderProfile,
    };
    use std::path::{Path, PathBuf};

    #[cfg(target_os = "macos")]
    use super::macos_app_data_dir;

    #[test]
    fn account_home_takes_precedence_over_launcher_home() {
        let resolved = choose_home_dir(
            Some(PathBuf::from("/Users/example")),
            Some(PathBuf::from("/tmp/isolated-home")),
        );

        assert_eq!(resolved, Some(PathBuf::from("/Users/example")));
    }

    #[test]
    fn default_knowledge_base_stays_under_documents() {
        assert_eq!(
            default_kb_path(Path::new("/Users/example")),
            PathBuf::from("/Users/example/Documents/Sticky Todo")
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_app_data_stays_under_the_account_home() {
        assert_eq!(
            macos_app_data_dir(Path::new("/Users/example"), "com.todo-sticky.app"),
            PathBuf::from(
                "/Users/example/Library/Application Support/com.todo-sticky.app"
            )
        );
    }

    #[test]
    fn infers_openrouter_from_legacy_api_base() {
        assert_eq!(infer_provider("https://openrouter.ai/api/v1"), "openrouter");
        assert_eq!(infer_provider("HTTPS://OPENROUTER.AI/API/V1"), "openrouter");
    }

    #[test]
    fn migrates_active_settings_into_a_provider_profile() {
        let legacy_json = r#"{
            "provider": "openrouter",
            "apiBase": "https://openrouter.ai/api/v1",
            "apiKey": "router-key",
            "model": "moonshotai/kimi-k3",
            "kbPath": "",
            "machines": []
        }"#;
        let legacy_settings: AppSettings =
            serde_json::from_str(legacy_json).expect("legacy settings should deserialize");

        let normalized = normalize_provider_profiles(legacy_settings);
        let profile = normalized
            .provider_profiles
            .get("openrouter")
            .expect("active provider should gain a profile");

        assert_eq!(profile.api_key, "router-key");
        assert_eq!(profile.model, "moonshotai/kimi-k3");
    }

    #[test]
    fn preserves_inactive_profiles_while_syncing_the_active_provider() {
        let mut settings = AppSettings {
            provider: "openrouter".into(),
            api_base: "https://openrouter.ai/api/v1".into(),
            api_key: "router-key".into(),
            model: "moonshotai/kimi-k3".into(),
            ..AppSettings::default()
        };
        settings.provider_profiles.insert(
            "openai".into(),
            LLMProviderProfile {
                api_base: "https://api.openai.com/v1".into(),
                api_key: "openai-key".into(),
                model: "gpt-4o".into(),
            },
        );

        let normalized = normalize_provider_profiles(settings);

        assert_eq!(
            normalized.provider_profiles["openai"].api_key,
            "openai-key"
        );
        assert_eq!(
            normalized.provider_profiles["openrouter"].api_key,
            "router-key"
        );
    }
}
