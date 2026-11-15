use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{Duration, Instant};
use tauri::State;
use tokio::sync::Mutex;

const ACTIONS: [&str; 6] = ["idle", "walk", "sleep", "jump", "curious", "happy"];
const SERVICE: &str = "io.github.anukamithara.littlelife";
const ENDPOINT: &str = "https://api.typesafe.ai/v1/systemone";

#[derive(Default)]
pub struct Service { session: Mutex<Session> }
struct Session {
    enabled: bool, limit: u32, requests: u32, input_tokens: u64, output_tokens: u64,
    next_request: Option<Instant>, generation: u64, busy: bool, failures: u32,
}
impl Default for Session {
    fn default() -> Self {
        Self { enabled: false, limit: 20, requests: 0, input_tokens: 0, output_tokens: 0,
            next_request: None, generation: 0, busy: false, failures: 0 }
    }
}
impl Session {
    fn reserve(&mut self, now: Instant) -> Result<(), String> {
        if !self.enabled { return Err("disabled".into()); }
        if self.busy { return Err("busy".into()); }
        if self.requests >= self.limit { return Err("budget".into()); }
        if self.next_request.is_some_and(|t| now < t) { return Err("cooldown".into()); }
        self.requests += 1; self.busy = true;
        self.next_request = Some(now + Duration::from_secs(60));
        Ok(())
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    enabled: bool, has_key: bool, supported: bool, limit: u32, requests: u32,
    input_tokens: u64, output_tokens: u64, retry_after_seconds: u64,
}
fn supported() -> bool { cfg!(any(target_os = "windows", target_os = "macos")) }
fn entry() -> Result<keyring::Entry, String> {
    if !supported() { return Err("unsupported".into()); }
    keyring::Entry::new(SERVICE, "typesafe-api-key").map_err(|_| "storage".into())
}
fn get_key() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(key) => Ok(Some(key)), Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("storage".into()),
    }
}
fn status(s: &Session, has_key: bool) -> Status {
    Status { enabled: s.enabled, has_key, supported: supported(), limit: s.limit,
        requests: s.requests, input_tokens: s.input_tokens, output_tokens: s.output_tokens,
        retry_after_seconds: s.next_request.map(|t| t.saturating_duration_since(Instant::now()).as_secs()).unwrap_or(0) }
}
async fn stored_key() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(get_key).await.map_err(|_| "storage".to_string())?
}
#[tauri::command]
pub async fn jev_status(service: State<'_, Service>) -> Result<Status, String> {
    let s = service.session.lock().await;
    if !supported() { return Ok(status(&s, false)); }
    Ok(status(&s, stored_key().await?.is_some()))
}
#[tauri::command]
pub async fn jev_save_key(key: String, service: State<'_, Service>) -> Result<Status, String> {
    // Serialize keychain access. Never return keys or platform error strings to the webview.
    let mut s = service.session.lock().await;
    let key = key.trim().to_string();
    if !(8..=512).contains(&key.len()) || !key.bytes().all(|b| b.is_ascii_graphic()) {
        return Err("invalid_key".into());
    }
    tauri::async_runtime::spawn_blocking(move || entry()?.set_password(&key).map_err(|_| "storage".to_string()))
        .await.map_err(|_| "storage".to_string())??;
    s.generation += 1; s.enabled = false;
    Ok(status(&s, true))
}
#[tauri::command]
pub async fn jev_forget_key(service: State<'_, Service>) -> Result<Status, String> {
    let mut s = service.session.lock().await;
    s.enabled = false; s.generation += 1;
    tauri::async_runtime::spawn_blocking(|| match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(_) => Err("storage".to_string())
    }).await.map_err(|_| "storage".to_string())??;
    Ok(status(&s, false))
}
#[tauri::command]
pub async fn jev_configure(enabled: bool, limit: u32, service: State<'_, Service>) -> Result<Status, String> {
    if !(1..=120).contains(&limit) { return Err("invalid_limit".into()); }
    let mut s = service.session.lock().await;
    // Disabling always succeeds, including when the OS credential store is locked.
    if !enabled {
        s.enabled = false; s.generation += 1; s.limit = limit;
        return Ok(status(&s, stored_key().await.unwrap_or(None).is_some()));
    }
    let has_key = stored_key().await?.is_some();
    if !has_key { return Err("no_key".into()); }
    s.enabled = true; s.limit = limit; s.generation += 1;
    Ok(status(&s, has_key))
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Observation {
    energy: f64, affection: f64, idle_seconds: u32, cursor_nearby: bool,
    last_action: String,
}
impl Observation {
    fn valid(&self) -> bool {
        self.energy.is_finite() && (24.0..=100.0).contains(&self.energy)
            && self.affection.is_finite() && (0.0..=100.0).contains(&self.affection)
            && self.idle_seconds < 120 && ACTIONS.contains(&self.last_action.as_str())
    }
}
#[derive(Serialize)]
pub struct Decision { action: String, status: Status }
fn request_body(observation: &Observation) -> Value {
    json!({"model":"jev-latest", "state":observation, "questions":{"next_action":{
        "type":"choice", "instructions":"Choose one gentle action for a shy, curious leaf creature keeping its human company. Vary behavior with energy, bond and last action. Prefer calm company over constant movement.",
        "criteria":{
            "idle":"Stay still and watch peacefully", "walk":"Explore a little inside the companion window",
            "sleep":"Take a short restorative nap", "jump":"Make one small burst of playful jumps",
            "curious":"Lean closer and look interested", "happy":"Show affection with a happy wiggle"
        }
    }}})
}
fn parse_decision(value: &Value) -> Result<String, String> {
    let answer = &value["answers"]["next_action"];
    let action = answer["choice"].as_str().ok_or("invalid_response")?;
    let confidence = answer["confidence"].as_f64().ok_or("invalid_response")?;
    if answer["type"] != "choice" || !ACTIONS.contains(&action) || !confidence.is_finite()
        || !(0.0..=1.0).contains(&confidence) { return Err("invalid_response".into()); }
    if confidence < 0.35 { return Err("uncertain".into()); }
    Ok(action.to_string())
}
async fn evaluate(key: String, observation: &Observation) -> Result<Value, String> {
    let client = reqwest::Client::builder().https_only(true)
        .redirect(reqwest::redirect::Policy::none()).retry(reqwest::retry::never()).timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(5)).build().map_err(|_| "offline".to_string())?;
    let mut response = client.post(ENDPOINT).bearer_auth(key).json(&request_body(observation))
        .send().await.map_err(|_| "offline".to_string())?;
    match response.status().as_u16() {
        200 => (), 401 | 403 => return Err("authentication".into()),
        429 => return Err("rate_limited".into()), 400 | 422 => return Err("request_rejected".into()),
        _ => return Err("offline".into()),
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "offline".to_string())? {
        if bytes.len() + chunk.len() > 65_536 { return Err("invalid_response".into()); }
        bytes.extend_from_slice(&chunk);
    }
    let value: Value = serde_json::from_slice(&bytes).map_err(|_| "invalid_response".to_string())?;
    Ok(value)
}
#[tauri::command]
pub async fn jev_decide(observation: Observation, service: State<'_, Service>) -> Result<Decision, String> {
    if !observation.valid() { return Err("invalid_observation".into()); }
    let (key, generation) = {
        let mut s = service.session.lock().await;
        if !s.enabled { return Err("disabled".into()); }
        if s.busy { return Err("busy".into()); }
        if s.requests >= s.limit { return Err("budget".into()); }
        if s.next_request.is_some_and(|t| Instant::now() < t) { return Err("cooldown".into()); }
        let key = stored_key().await?.ok_or("no_key")?;
        s.reserve(Instant::now())?;
        (key, s.generation)
    };
    let result = evaluate(key, &observation).await;
    let mut s = service.session.lock().await;
    s.busy = false;
    if let Ok(ref value) = result {
        s.input_tokens = s.input_tokens.saturating_add(value["usage"]["input_tokens"].as_u64().unwrap_or(0));
        s.output_tokens = s.output_tokens.saturating_add(value["usage"]["output_tokens"].as_u64().unwrap_or(0));
    }
    if s.generation != generation || !s.enabled { return Err("stale".into()); }
    match result.and_then(|value| parse_decision(&value)) {
        Ok(action) => { s.failures = 0; Ok(Decision { action, status: status(&s, true) }) },
        Err(code) => {
            s.failures = (s.failures + 1).min(4);
            let delay = if code == "rate_limited" { 300 } else { 60 * 2u64.pow(s.failures) };
            s.next_request = Some(Instant::now() + Duration::from_secs(delay));
            if code == "authentication" || code == "request_rejected" { s.enabled = false; }
            Err(code)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn observation() -> Observation { Observation { energy: 70.0, affection: 40.0, idle_seconds: 0, cursor_nearby: false, last_action: "idle".into() } }
    #[test]
    fn excludes_free_text_and_rejects_invalid_observations() {
        let mut o = observation();
        assert!(o.valid()); o.energy = f64::NAN; assert!(!o.valid());
        o.energy = 10.0; assert!(!o.valid()); o.energy = 70.0;
        o.last_action = "run_shell".into(); assert!(!o.valid());
        let payload = request_body(&observation());
        assert!(payload["state"].get("name").is_none());
        assert_eq!(payload["questions"]["next_action"]["type"], "choice");
    }
    #[test]
    fn accepts_only_supported_confident_choices() {
        let mut v = json!({"answers":{"next_action":{"type":"choice","choice":"walk","confidence":0.8}}});
        assert_eq!(parse_decision(&v).unwrap(), "walk");
        v["answers"]["next_action"]["choice"] = json!("execute"); assert!(parse_decision(&v).is_err());
        v["answers"]["next_action"]["choice"] = json!("idle");
        v["answers"]["next_action"]["confidence"] = json!(0.1); assert_eq!(parse_decision(&v).unwrap_err(), "uncertain");
    }
    #[test]
    fn native_budget_and_cooldown_cannot_be_bypassed_by_the_webview() {
        let now = Instant::now();
        let mut s = Session::default();
        assert_eq!(s.reserve(now).unwrap_err(), "disabled");
        s.enabled = true; s.limit = 2;
        s.reserve(now).unwrap();
        assert_eq!(s.reserve(now).unwrap_err(), "busy");
        s.busy = false;
        assert_eq!(s.reserve(now).unwrap_err(), "cooldown");
        s.reserve(now + Duration::from_secs(61)).unwrap();
        s.busy = false; s.enabled = false; s.enabled = true;
        assert_eq!(s.reserve(now + Duration::from_secs(121)).unwrap_err(), "budget");
        assert_eq!(s.requests, 2);
    }
}
