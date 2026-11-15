use crate::placement::{self, Area, Preferences};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Mutex, time::{Duration, Instant}};
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, AppHandle, Emitter, Manager, WebviewWindow, WindowEvent};

#[derive(Default)]
pub struct Desktop { inner: Mutex<Session>, writer: Mutex<()> }

struct Session {
    prefs: Preferences,
    click_through: bool,
    visible: bool,
    tray_available: bool,
    storage_available: bool,
    path: Option<PathBuf>,
    revision: u64,
    saving: bool,
    last_step: Instant,
    heading: (f64, f64),
    phase: f64,
}
impl Default for Session {
    fn default() -> Self { Self { prefs: Preferences::default(), click_through: false, visible: false,
        tray_available: false, storage_available: true, path: None, revision: 0, saving: false, last_step: Instant::now(), heading: (1.0, 1.0), phase: 0.0 } }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopState {
    compact: bool, click_through: bool, visible: bool, always_on_top: bool,
    tray_available: bool, storage_available: bool,
    roaming: bool, movement: crate::motion::Movement,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Action { Ready, Expand, Compact, Hide, Interact, ClickThrough, AlwaysOnTop, Reset, Roaming, Quit }

pub fn state(app: &AppHandle) -> DesktopState {
    let desktop = app.state::<Desktop>();
    let s = desktop.inner.lock().unwrap();
    DesktopState { compact: s.prefs.compact, click_through: s.click_through, visible: s.visible,
        always_on_top: s.prefs.always_on_top, tray_available: s.tray_available, storage_available: s.storage_available, roaming: s.prefs.roaming, movement: s.prefs.movement }
}
fn notify(app: &AppHandle) { let _ = app.emit_to("main", "desktop-state", state(app)); }

fn areas(window: &WebviewWindow) -> Result<Vec<Area>, String> {
    let primary = window.primary_monitor().map_err(|_| "monitor")?;
    let monitors = window.available_monitors().map_err(|_| "monitor")?;
    Ok(monitors.iter().map(|m| {
        let area = m.work_area();
        Area { name: m.name().cloned(), x: area.position.x, y: area.position.y,
            width: area.size.width, height: area.size.height, scale: m.scale_factor(),
            primary: primary.as_ref().is_some_and(|p| p.position() == m.position()) }
    }).collect())
}
fn apply_layout(window: &WebviewWindow, prefs: &Preferences) -> Result<(), String> {
    if let Some(layout) = placement::layout(prefs, &areas(window)?) {
        window.set_position(tauri::PhysicalPosition::new(layout.x, layout.y)).map_err(|_| "window")?;
        window.set_size(tauri::PhysicalSize::new(layout.physical_width, layout.physical_height)).map_err(|_| "window")?;
        window.set_position(tauri::PhysicalPosition::new(layout.x, layout.y)).map_err(|_| "window")?;
    }
    Ok(())
}
fn capture_position(window: &WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else { return; };
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else { return; };
    let work = monitor.work_area();
    let area = Area { name: monitor.name().cloned(), x: work.position.x, y: work.position.y,
        width: work.size.width, height: work.size.height, scale: monitor.scale_factor(), primary: false };
    window.app_handle().state::<Desktop>().inner.lock().unwrap().prefs.placement =
        Some(placement::capture(&area, position.x, position.y, size.width, size.height));
}

pub fn persist(app: &AppHandle) {
    let desktop = app.state::<Desktop>();
    // One writer, reading the newest preferences only after acquiring the write lock.
    let _writer = desktop.writer.lock().unwrap();
    let (prefs, path) = { let s = desktop.inner.lock().unwrap(); (s.prefs.clone(), s.path.clone()) };
    let result = path.and_then(|path| {
        let parent = path.parent()?;
        std::fs::create_dir_all(parent).ok()?;
        let bytes = serde_json::to_vec(&prefs).ok()?;
        std::fs::write(path, bytes).ok()
    });
    let mut s = desktop.inner.lock().unwrap();
    let changed = s.storage_available != result.is_some();
    s.storage_available = result.is_some(); drop(s);
    if changed { notify(app); }
}
fn queue_save(app: &AppHandle) {
    let desktop = app.state::<Desktop>();
    { let mut s = desktop.inner.lock().unwrap(); s.revision += 1; if s.saving { return; } s.saving = true; }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let revision = app.state::<Desktop>().inner.lock().unwrap().revision;
            tokio::time::sleep(Duration::from_millis(400)).await;
            if app.state::<Desktop>().inner.lock().unwrap().revision != revision { continue; }
            persist(&app);
            let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
            if s.revision == revision { s.saving = false; break; }
        }
    });
}

pub fn perform(app: &AppHandle, action: Action, value: Option<bool>) -> Result<DesktopState, String> {
    let window = app.get_webview_window("main").ok_or("window")?;
    if matches!(action, Action::Quit) { capture_position(&window); persist(app); app.exit(0); return Ok(state(app)); }
    let current = state(app);
    if matches!(action, Action::Hide | Action::ClickThrough) && !current.tray_available { return Err("tray_unavailable".into()); }
    let mut prefs = app.state::<Desktop>().inner.lock().unwrap().prefs.clone();
    let mut click_through = current.click_through;
    let mut visible = current.visible;
    match action {
        Action::Expand => { prefs.compact = false; click_through = false; visible = true; },
        Action::Compact => { prefs.compact = true; click_through = false; visible = true; },
        Action::Ready | Action::Interact => { click_through = false; visible = true; },
        Action::Hide => { click_through = false; visible = false; },
        Action::ClickThrough => { click_through = value.ok_or("invalid_action")?; if click_through { prefs.compact = true; visible = true; } },
        Action::Roaming => prefs.roaming = value.ok_or("invalid_action")?,
        Action::AlwaysOnTop => prefs.always_on_top = value.ok_or("invalid_action")?,
        Action::Reset => { prefs.placement = None; click_through = false; visible = true; },
        Action::Quit => unreachable!(),
    }
    // Disable pointer ignoring first; a failed layout operation must leave recovery possible.
    window.set_ignore_cursor_events(false).map_err(|_| "window")?;
    app.state::<Desktop>().inner.lock().unwrap().click_through = false;
    if let Err(error) = apply_layout(&window, &prefs) {
        app.state::<Desktop>().inner.lock().unwrap().click_through = false;
        notify(app); return Err(error);
    }
    window.set_always_on_top(prefs.always_on_top).map_err(|_| "window")?;
    if visible { window.show().map_err(|_| "window")?; window.unminimize().map_err(|_| "window")?; }
    else { window.hide().map_err(|_| "window")?; }
    window.set_ignore_cursor_events(click_through).map_err(|_| "window")?;
    if visible && !click_through { let _ = window.set_focus(); }
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
      s.prefs = prefs; s.click_through = click_through; s.visible = visible; }
    capture_position(&window); queue_save(app); notify(app);
    Ok(state(app))
}

#[tauri::command]
pub fn desktop_status(app: AppHandle) -> DesktopState { state(&app) }
#[tauri::command]
pub fn desktop_action(app: AppHandle, action: Action, value: Option<bool>) -> Result<DesktopState, String> { perform(&app, action, value) }

#[tauri::command]
pub fn desktop_movement(app: AppHandle, movement: crate::motion::Movement) -> DesktopState {
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
      s.prefs.movement = movement; s.phase = 0.0; s.last_step = Instant::now(); }
    queue_save(&app); notify(&app); state(&app)
}

/// One bounded native step. The frontend requests steps only while actively roaming.
#[tauri::command]
pub fn desktop_step(app: AppHandle) -> Result<i8, String> {
    let window = app.get_webview_window("main").ok_or("window")?;
    let (mode, heading, phase, dt) = {
        let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
        if !s.visible || !s.prefs.compact || !s.prefs.roaming { return Ok(0); }
        let elapsed = s.last_step.elapsed().as_secs_f64();
        if elapsed < 0.1 { return Ok(0); }
        s.last_step = Instant::now();
        (s.prefs.movement, s.heading, s.phase, if elapsed > 0.5 { 0.125 } else { elapsed })
    };
    if !window.is_visible().unwrap_or(false) { return Ok(0); }
    let monitor = window.current_monitor().map_err(|_| "monitor")?.ok_or("monitor")?;
    let work = monitor.work_area();
    let area = Area { name: monitor.name().cloned(), x: work.position.x, y: work.position.y,
        width: work.size.width, height: work.size.height, scale: monitor.scale_factor(), primary: false };
    let position = window.outer_position().map_err(|_| "window")?;
    let size = window.outer_size().map_err(|_| "window")?;
    let step = crate::motion::advance(mode, &area, (position.x, position.y), (size.width, size.height), heading, phase, dt).ok_or("monitor")?;
    window.set_position(tauri::PhysicalPosition::new(step.x, step.y)).map_err(|_| "window")?;
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
      s.heading = (step.dx, step.dy); s.phase = step.phase; }
    Ok(if step.dx < 0.0 { -1 } else { 1 })
}

pub fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").ok_or("Missing companion window")?;
    let path = app.path().app_config_dir().ok().map(|p| p.join("desktop-v1.json"));
    let prefs = path.as_ref().and_then(|p| std::fs::read_to_string(p).ok()).map(|raw| placement::decode(&raw)).unwrap_or_default();
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap(); s.prefs = prefs.clone(); s.path = path; }
    apply_layout(&window, &prefs).map_err(std::io::Error::other)?;
    window.set_always_on_top(prefs.always_on_top)?;
    let available = create_tray(app).unwrap_or(false);
    app.state::<Desktop>().inner.lock().unwrap().tray_available = available;
    Ok(())
}

pub fn window_event(window: &tauri::Window, event: &WindowEvent) {
    if window.label() != "main" { return; }
    let app = window.app_handle();
    match event {
        WindowEvent::Moved(_) => {
            if let Some(webview) = app.get_webview_window("main") { capture_position(&webview); queue_save(app); }
        },
        WindowEvent::ScaleFactorChanged { .. } => {
            if let Some(webview) = app.get_webview_window("main") {
                capture_position(&webview);
                let prefs = app.state::<Desktop>().inner.lock().unwrap().prefs.clone();
                let _ = apply_layout(&webview, &prefs);
                capture_position(&webview); queue_save(app);
            }
        },
        WindowEvent::CloseRequested { api, .. } if state(app).tray_available => { api.prevent_close(); let _ = perform(app, Action::Hide, None); },
        _ => (),
    }
}

fn create_tray(app: &AppHandle) -> tauri::Result<bool> {
    if let Some(icon) = app.default_window_icon().cloned() {
        let show = MenuItem::with_id(app, "show", "Open LittleLife", true, None::<&str>)?;
        let compact = MenuItem::with_id(app, "compact", "Compact companion", true, None::<&str>)?;
        let interact = MenuItem::with_id(app, "interact", "Interact / restore clicks", true, None::<&str>)?;
        let hide = MenuItem::with_id(app, "hide", "Hide companion", true, None::<&str>)?;
        let reset = MenuItem::with_id(app, "reset", "Reset position to primary display", true, None::<&str>)?;
        let walk = MenuItem::with_id(app, "walk", "Walk around the desktop", true, None::<&str>)?;
        let fly = MenuItem::with_id(app, "fly", "Fly around the desktop", true, None::<&str>)?;
        let swim = MenuItem::with_id(app, "swim", "Swim around the desktop", true, None::<&str>)?;
        let roam = MenuItem::with_id(app, "roam", "Pause / resume roaming", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "Quit LittleLife", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show, &compact, &walk, &fly, &swim, &roam, &interact, &hide, &reset, &quit])?;
        let tray = TrayIconBuilder::with_id("littlelife").icon(icon).tooltip("LittleLife · restore clicks from this menu")
            .menu(&menu).show_menu_on_left_click(true)
            .on_menu_event(|app, event| {
                match event.id.as_ref() {
                    "walk" | "fly" | "swim" => {
                        let mode = match event.id.as_ref() { "fly" => crate::motion::Movement::Fly, "swim" => crate::motion::Movement::Swim, _ => crate::motion::Movement::Walk };
                        let _ = desktop_movement(app.clone(), mode);
                        let _ = perform(app, Action::Roaming, Some(true));
                        let _ = perform(app, Action::Compact, None); return;
                    },
                    "roam" => { let _ = perform(app, Action::Roaming, Some(!state(app).roaming)); return; },
                    _ => (),
                }
                let action = match event.id.as_ref() { "show" => Action::Expand, "compact" => Action::Compact,
                    "interact" => Action::Interact, "hide" => Action::Hide, "reset" => Action::Reset, "quit" => Action::Quit, _ => return };
                if perform(app, action, None).is_err() {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_ignore_cursor_events(false); let _ = window.show(); let _ = window.set_focus();
                        { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
                          s.click_through = false; s.visible = window.is_visible().unwrap_or(true); }
                        notify(app);
                    }
                }
            }).build(app);
        return Ok(tray.is_ok());
    }
    Ok(false)
}
