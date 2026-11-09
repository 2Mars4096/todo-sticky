//! Read Diane's existing file-backed keys. Never write them or use OS Keychain.
use serde::Deserialize;
use std::{collections::HashMap, fs, path::{Path, PathBuf}};

#[derive(Deserialize)]
struct Locations { schema_version: u32, saved_keys_file: PathBuf, env_file: Option<PathBuf> }

fn standard_endpoint(provider: &str) -> Option<&'static str> {
    match provider {
        "openrouter" => Some("https://openrouter.ai/api/v1"),
        "openai" => Some("https://api.openai.com/v1"),
        "moonshot" => Some("https://api.moonshot.ai/v1"),
        "deepseek" => Some("https://api.deepseek.com"),
        _ => None,
    }
}

fn env_key(provider: &str) -> Option<&'static str> {
    match provider {
        "openrouter" => Some("OPENROUTER_API_KEY"), "openai" => Some("OPENAI_API_KEY"),
        "moonshot" => Some("MOONSHOT_API_KEY"), "deepseek" => Some("DEEPSEEK_API_KEY"), _ => None,
    }
}

fn read_small(path: &Path) -> Option<String> {
    use std::io::Read;
    let file = fs::File::open(path).ok()?;
    let mut content = String::new();
    file.take(1024 * 1024 + 1).read_to_string(&mut content).ok()?;
    (content.len() <= 1024 * 1024).then_some(content)
}

fn discover(home: &Path) -> Option<Locations> {
    let marker = home.join(".dan/linked-credentials.json");
    if marker.exists() {
        let locations: Locations = serde_json::from_str(&read_small(&marker)?).ok()?;
        return (locations.schema_version == 1 && locations.saved_keys_file.is_absolute()
            && locations.env_file.as_ref().is_none_or(|path| path.is_absolute())).then_some(locations);
    }
    // Existing Diane installations already advertise their graphs directory.
    let marker = read_small(&home.join(".dan/graphs_dir"))?;
    let graphs = PathBuf::from(marker.lines().next()?.trim());
    if !graphs.is_absolute() { return None; }
    Some(Locations { schema_version: 1, saved_keys_file: graphs.join("model_credentials/keys.json"),
        env_file: graphs.parent().map(|parent| parent.join(".env")) })
}

pub fn resolve_at(home: &Path, provider: &str, endpoint: &str) -> Option<String> {
    // Never send Diane's credential to a custom or mismatched endpoint.
    if standard_endpoint(provider)? != endpoint.trim_end_matches('/') { return None; }
    let locations = discover(home)?;
    if let Some(contents) = read_small(&locations.saved_keys_file) {
        if let Ok(keys) = serde_json::from_str::<HashMap<String, String>>(&contents) {
            if let Some(key) = keys.get(provider).filter(|key| !key.trim().is_empty()) { return Some(key.clone()); }
        }
    }
    let content = read_small(&locations.env_file?)?;
    let mut values = HashMap::new();
    // dotenv parsing does not load values into Todo's process environment.
    for entry in dotenvy::from_read_iter(content.as_bytes()) {
        let (name, value) = entry.ok()?;
        values.insert(name, value);
    }
    let name = env_key(provider)?;
    for name in [format!("DAN_{name}"), name.to_string(), if provider == "moonshot" { "KIMI_API_KEY".into() } else { String::new() }] {
        if let Some(value) = values.get(&name).filter(|value| !value.trim().is_empty()) { return Some(value.clone()); }
    }
    let base = values.get("DAN_LLM_BASE_URL").or_else(|| values.get("DAN_BASE_URL"));
    if base.map(|url| url.trim_end_matches('/')) == standard_endpoint(provider) {
        return values.get("DAN_LLM_API_KEY").or_else(|| values.get("OPENAI_API_KEY")).filter(|value| !value.trim().is_empty()).cloned();
    }
    None
}

pub fn resolve(provider: &str, endpoint: &str) -> Option<String> {
    resolve_at(&crate::config::stable_home_dir()?, provider, endpoint)
}

#[tauri::command]
pub fn diane_credential_status(provider: String, endpoint: String) -> bool {
    resolve(&provider, &endpoint).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (tempfile::TempDir, PathBuf) {
        let root = tempfile::tempdir().unwrap();
        let graphs = root.path().join("diane/graphs");
        fs::create_dir_all(graphs.join("model_credentials")).unwrap();
        fs::create_dir_all(root.path().join(".dan")).unwrap();
        fs::write(root.path().join(".dan/graphs_dir"), graphs.to_str().unwrap()).unwrap();
        (root, graphs)
    }
    #[test]
    fn reads_saved_keys_then_dotenv_without_changing_sources() {
        let (root, graphs) = fixture();
        let env = graphs.parent().unwrap().join(".env");
        let content = "DAN_LLM_BASE_URL=https://openrouter.ai/api/v1\nDAN_LLM_API_KEY='synthetic-env'\n";
        fs::write(&env, content).unwrap();
        assert_eq!(resolve_at(root.path(), "openrouter", "https://openrouter.ai/api/v1").as_deref(), Some("synthetic-env"));
        fs::write(graphs.join("model_credentials/keys.json"), r#"{"openrouter":"synthetic-saved"}"#).unwrap();
        assert_eq!(resolve_at(root.path(), "openrouter", "https://openrouter.ai/api/v1/").as_deref(), Some("synthetic-saved"));
        assert!(resolve_at(root.path(), "openrouter", "https://example.test/v1").is_none());
        assert!(resolve_at(root.path(), "moonshot", "https://api.moonshot.ai/v1").is_none());
        assert_eq!(fs::read_to_string(&env).unwrap(), content);
    }
    #[test]
    fn advertised_paths_override_legacy_and_refresh_after_updates() {
        let (root, graphs) = fixture();
        fs::write(graphs.join("model_credentials/keys.json"), r#"{"openai":"synthetic-old"}"#).unwrap();
        let saved = root.path().join("advertised.json");
        let environment = root.path().join("advertised.env");
        fs::write(&environment, "export OPENAI_API_KEY='synthetic-env' # comment\n").unwrap();
        fs::write(root.path().join(".dan/linked-credentials.json"), serde_json::to_vec(&serde_json::json!({
            "schema_version": 1, "saved_keys_file": saved, "env_file": environment,
        })).unwrap()).unwrap();
        assert_eq!(resolve_at(root.path(), "openai", "https://api.openai.com/v1").as_deref(), Some("synthetic-env"));
        fs::write(&saved, r#"{"openai":"synthetic-updated"}"#).unwrap();
        assert_eq!(resolve_at(root.path(), "openai", "https://api.openai.com/v1").as_deref(), Some("synthetic-updated"));
    }
    #[test]
    fn missing_and_invalid_sources_allow_todo_fallback() {
        let (root, graphs) = fixture();
        assert!(resolve_at(root.path(), "openai", "https://api.openai.com/v1").is_none());
        fs::write(graphs.join("model_credentials/keys.json"), "corrupt").unwrap();
        assert!(resolve_at(root.path(), "openai", "https://api.openai.com/v1").is_none());
        fs::write(root.path().join(".dan/linked-credentials.json"), r#"{"schema_version":9}"#).unwrap();
        assert!(resolve_at(root.path(), "openai", "https://api.openai.com/v1").is_none());
    }
}
