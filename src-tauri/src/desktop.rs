use crate::motion::{self, Roam};
use crate::placement::{self, Area, Preferences, COMPACT};
use crate::sense::{self, Activity};
use crate::spaces;
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
    roam: Roam,
    /// The frontend wants the character moving right now.
    roaming: bool,
    /// Asked to stop while off a display or in the air: carry on until back in view.
    returning: bool,
    /// Awake and free to move, so it comes after the person when they change Space.
    lively: bool,
    /// A speech bubble is showing, so the whole window takes clicks.
    attention: bool,
    /// What the window was last told about pointer events, to avoid repeating it.
    ignoring: Option<bool>,
}
impl Default for Session {
    fn default() -> Self { Self { prefs: Preferences::default(), click_through: false, visible: false,
        tray_available: false, storage_available: true, path: None, revision: 0, saving: false,
        roam: Roam::new(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(1, |t| t.as_nanos() as u64)),
        roaming: false, returning: false, lively: false, attention: false, ignoring: None } }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopState {
    compact: bool, click_through: bool, visible: bool, always_on_top: bool,
    tray_available: bool, storage_available: bool,
    roaming: bool, movement: crate::motion::Movement, awareness: bool,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Action { Ready, Expand, Compact, Hide, Interact, ClickThrough, AlwaysOnTop, Reset, Roaming, Awareness, Quit }

pub fn state(app: &AppHandle) -> DesktopState {
    let desktop = app.state::<Desktop>();
    let s = desktop.inner.lock().unwrap();
    DesktopState { compact: s.prefs.compact, click_through: s.click_through, visible: s.visible,
        always_on_top: s.prefs.always_on_top, tray_available: s.tray_available, storage_available: s.storage_available, roaming: s.prefs.roaming, movement: s.prefs.movement, awareness: s.prefs.awareness }
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
        Action::Awareness => prefs.awareness = value.ok_or("invalid_action")?,
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
    if cfg!(target_os = "macos") && prefs.always_on_top { lift(&window); }
    else { window.set_always_on_top(prefs.always_on_top).map_err(|_| "window")?; }
    if visible { window.show().map_err(|_| "window")?; window.unminimize().map_err(|_| "window")?; }
    else { window.hide().map_err(|_| "window")?; }
    window.set_ignore_cursor_events(click_through).map_err(|_| "window")?;
    if visible && !click_through { let _ = window.set_focus(); }
    // The layout may have moved the window, so the frontend asks for roaming again from there.
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
      s.prefs = prefs; s.click_through = click_through; s.visible = visible;
      s.roaming = false; s.returning = false; s.ignoring = Some(click_through); }
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
      s.prefs.movement = movement; s.roam.rest(); }
    queue_save(&app); notify(&app); state(&app)
}

/// Positions used for roaming. macOS lays every display out in one logical space,
/// while Windows does so in physical pixels, so each uses the consistent one.
#[cfg(target_os = "macos")]
fn units(window: &WebviewWindow, x: f64, y: f64) -> (f64, f64) {
    let scale = window.scale_factor().unwrap_or(1.0).max(0.1);
    (x / scale, y / scale)
}
#[cfg(not(target_os = "macos"))]
fn units(_: &WebviewWindow, x: f64, y: f64) -> (f64, f64) { (x, y) }
#[cfg(target_os = "macos")]
fn place(window: &WebviewWindow, x: f64, y: f64) { let _ = window.set_position(tauri::LogicalPosition::new(x, y)); }
#[cfg(not(target_os = "macos"))]
fn place(window: &WebviewWindow, x: f64, y: f64) { let _ = window.set_position(tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32)); }
fn roam_areas(window: &WebviewWindow) -> Vec<Area> {
    let mut all = areas(window).unwrap_or_default();
    if cfg!(target_os = "macos") {
        for a in &mut all {
            let k = if a.scale.is_finite() && a.scale > 0.0 { a.scale } else { 1.0 };
            a.x = (f64::from(a.x) / k).round() as i32; a.y = (f64::from(a.y) / k).round() as i32;
            a.width = (f64::from(a.width) / k).round() as u32; a.height = (f64::from(a.height) / k).round() as u32;
            a.scale = 1.0;
        }
    }
    all
}
/// The pointer in roaming units, and how many of them make one logical pixel of the window.
fn pointer(window: &WebviewWindow) -> Option<((f64, f64), f64)> {
    let cursor = window.cursor_position().ok()?;
    if cfg!(target_os = "macos") {
        let primary = window.primary_monitor().ok()??.scale_factor().max(0.1);
        Some(((cursor.x / primary, cursor.y / primary), 1.0))
    } else { Some(((cursor.x, cursor.y), window.scale_factor().ok()?)) }
}

/// Start or stop moving the character-only window. Movement itself runs natively.
#[tauri::command]
pub fn desktop_roam(app: AppHandle, active: bool) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("window")?;
    if active {
        let position = window.outer_position().map_err(|_| "window")?;
        let (x, y) = units(&window, f64::from(position.x), f64::from(position.y));
        let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
        if !s.visible || !s.prefs.compact || !s.prefs.roaming { return Ok(()); }
        // Still on its way back into view: carry on from where the walk really is.
        if !std::mem::take(&mut s.returning) {
            s.roam.x = x; s.roam.y = y; s.roam.rest();
        }
        s.roaming = true;
    } else {
        // The movement thread finishes the step back into view, then remembers the place.
        let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
        if std::mem::replace(&mut s.roaming, false) { s.returning = true; }
    }
    Ok(())
}
/// A speech bubble needs clicks across the whole window; otherwise only the character does.
#[tauri::command]
pub fn desktop_attention(app: AppHandle, active: bool) {
    app.state::<Desktop>().inner.lock().unwrap().attention = active;
}

/// Whether the companion is awake and free to come after the person between Spaces.
#[tauri::command]
pub fn desktop_lively(app: AppHandle, active: bool) {
    app.state::<Desktop>().inner.lock().unwrap().lively = active;
}

#[derive(Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Motion { direction: i8, falling: bool, moving: bool, peeking: bool }
#[derive(Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Sensed { activity: Activity, audio: bool, idle_seconds: u32 }

/// One quiet background thread: it moves the window while roaming, lets clicks through
/// everywhere except the character, and looks at the person's activity every few seconds.
/// The session lock is never held across a window call, which may wait for the main thread.
fn presence(app: AppHandle) {
    let (mut displays, mut displays_at) = (Vec::new(), None::<Instant>);
    let (mut last, mut hover_at, mut sense_at) = (Instant::now(), Instant::now(), None::<Instant>);
    let (mut motion, mut near, mut sensed, mut activity) = (None::<Motion>, false, None::<Sensed>, Activity::Other);
    let (mut over, mut held) = (false, false);
    let mut places = spaces::positions();
    loop {
        let (visible, compact, mut roaming, mode, click_through, attention, awareness, lively) = {
            let desktop = app.state::<Desktop>(); let s = desktop.inner.lock().unwrap();
            (s.visible, s.prefs.compact, s.roaming || s.returning, s.prefs.movement, s.click_through, s.attention, s.prefs.awareness,
                s.lively && s.prefs.roaming)
        };
        // The person went to another Space: step out of sight and come in after them,
        // on the display they are using, from the side they came from.
        if spaces::changed() {
            let now = spaces::positions();
            let side = spaces::side(&places, &now);
            places = now;
            if let (true, Some(window)) = (visible && compact && lively, app.get_webview_window("main")) {
                displays = roam_areas(&window); displays_at = Some(Instant::now());
                if let (Some((point, _)), Ok(position)) = (pointer(&window), window.outer_position()) {
                    let (x, y) = units(&window, f64::from(position.x), f64::from(position.y));
                    let start = {
                        let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
                        if !s.roaming && !s.returning { s.roam.x = x; s.roam.y = y; }
                        motion::follow(mode, &displays, COMPACT, &mut s.roam, point, side).then(|| {
                            if !s.roaming { s.returning = true; }
                            (s.roam.x, s.roam.y)
                        })
                    };
                    if let Some((x, y)) = start {
                        place(&window, x, y); roaming = true; last = Instant::now();
                        let _ = app.emit_to("main", "desktop-followed", ());
                    }
                }
            }
        }
        let moving = visible && compact && roaming;
        std::thread::sleep(Duration::from_millis(if moving { 33 } else if visible { 125 } else { 1000 }));
        let Some(window) = app.get_webview_window("main") else { continue; };
        let seconds = last.elapsed().as_secs_f64(); last = Instant::now();
        if !visible { motion = None; continue; }
        let mut arrived = false;
        // Never pull the window out of the person's hand; carry on from where it is dropped.
        if moving && over && sense::pressed() { held = true; continue; }
        if moving && std::mem::take(&mut held) {
            if let Ok(position) = window.outer_position() {
                let (x, y) = units(&window, f64::from(position.x), f64::from(position.y));
                let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
                s.roam.x = x; s.roam.y = y; s.roam.rest();
            }
        }
        if moving {
            if displays_at.map_or(true, |at| at.elapsed() > Duration::from_secs(3)) {
                displays = roam_areas(&window); displays_at = Some(Instant::now());
            }
            let step = {
                let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
                if !s.roaming && s.returning && motion::settled(&displays, COMPACT, &s.roam) { s.returning = false; arrived = true; }
                // Stopped while this thread slept: leave the window where it was put.
                ((s.roaming || s.returning) && motion::advance(mode, &displays, COMPACT, &mut s.roam, seconds))
                    .then(|| (s.roam.x, s.roam.y, Motion { direction: if s.roam.dx < 0.0 { -1 } else { 1 }, falling: s.roam.falling(), moving: true, peeking: s.roam.peeking() }))
            };
            if let Some((x, y, now)) = step {
                place(&window, x, y);
                if motion.as_ref() != Some(&now) { let _ = app.emit_to("main", "desktop-motion", now.clone()); motion = Some(now); }
            }
        }
        if arrived { capture_position(&window); queue_save(&app); }
        if !moving || arrived {
            if let Some(last) = motion.take().filter(|m| m.moving) {
                let _ = app.emit_to("main", "desktop-motion", Motion { moving: false, falling: false, peeking: false, ..last });
            }
        }
        if hover_at.elapsed() >= Duration::from_millis(110) {
            hover_at = Instant::now();
            // Without a readable pointer the window stays clickable, so it can always be reached.
            let (mut inside, mut close) = (true, false);
            over = false;
            if compact {
                if let (Some(((px, py), k)), Ok(position)) = (pointer(&window), window.outer_position()) {
                    let (wx, wy) = units(&window, f64::from(position.x), f64::from(position.y));
                    let (x, y) = ((px - wx) / k, (py - wy) / k);
                    let within = x >= 0.0 && x <= COMPACT.0 && y >= 0.0 && y <= COMPACT.1;
                    over = within;
                    inside = within && (attention || ((x - COMPACT.0 / 2.0).abs() <= 52.0 && y >= COMPACT.1 - 150.0));
                    close = (x - COMPACT.0 / 2.0).hypot(y - (COMPACT.1 - 80.0)) < 150.0;
                }
            }
            let ignore = click_through || !inside;
            let changed = { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap();
                // A tray action may have just restored clicks; only apply a still-current answer.
                s.click_through == click_through && s.ignoring.replace(ignore) != Some(ignore) };
            if changed { let _ = window.set_ignore_cursor_events(ignore); }
            if close != near { near = close; let _ = app.emit_to("main", "desktop-cursor", near); }
        }
        if sense_at.map_or(true, |at| at.elapsed() >= Duration::from_secs(4)) {
            sense_at = Some(Instant::now());
            let now = if awareness {
                let reading = sense::read();
                if !sense::own(&reading) { activity = sense::classify(&reading); }
                Sensed { activity, audio: reading.audio, idle_seconds: (reading.idle_seconds.min(86_400.0) as u32) / 30 * 30 }
            } else { activity = Activity::Other; Sensed { activity, audio: false, idle_seconds: 0 } };
            if sensed.as_ref() != Some(&now) { let _ = app.emit_to("main", "desktop-activity", now.clone()); sensed = Some(now); }
        }
    }
}

/// Keep the companion on every Space and above full-screen applications.
#[cfg(target_os = "macos")]
fn overlay(app: &AppHandle, window: &WebviewWindow) {
    // Without a Dock presence, macOS lets the window sit beside another app's full-screen Space.
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    let _ = window.set_visible_on_all_workspaces(true);
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(pointer) = target.ns_window() else { return; };
        let ns_window = pointer.cast::<objc2::runtime::AnyObject>();
        if ns_window.is_null() { return; }
        // NSWindowCollectionBehavior: canJoinAllSpaces, stationary, ignoresCycle and
        // fullScreenAuxiliary on; moveToActiveSpace, managed, transient, participatesInCycle
        // and fullScreenPrimary off.
        const ON: usize = 1 | 1 << 6 | 1 << 8;
        const OFF: usize = 1 << 1 | 1 << 2 | 1 << 3 | 1 << 4 | 1 << 5 | 1 << 7;
        panel(ns_window);
        // SAFETY: a live NSWindow on the main thread, with NSUInteger-sized arguments.
        unsafe {
            let current: usize = objc2::msg_send![ns_window, collectionBehavior];
            let _: () = objc2::msg_send![ns_window, setCollectionBehavior: (current | ON) & !OFF];
        }
    });
}
/// macOS only lets a non-activating panel sit in another application's full-screen Space,
/// so the window becomes one. It still takes the keyboard for the settings fields.
#[cfg(target_os = "macos")]
fn panel(ns_window: *mut objc2::runtime::AnyObject) {
    use objc2::{class, msg_send, sel, runtime::{AnyClass, AnyObject, Bool, ClassBuilder, Sel}};
    extern "C-unwind" fn yes(_: &AnyObject, _: Sel) -> Bool { Bool::YES }
    static CLASS: std::sync::OnceLock<Option<&'static AnyClass>> = std::sync::OnceLock::new();
    let class = CLASS.get_or_init(|| {
        let mut builder = ClassBuilder::new(c"LittleLifePanel", class!(NSPanel))?;
        // The window library keeps one word of its own state after the NSWindow fields.
        // Reserving the same word keeps that state inside this class's layout.
        builder.add_ivar::<usize>(c"reserved");
        // SAFETY: both selectors take no arguments and return BOOL.
        unsafe {
            builder.add_method(sel!(canBecomeKeyWindow), yes as extern "C-unwind" fn(_, _) -> _);
            builder.add_method(sel!(canBecomeMainWindow), yes as extern "C-unwind" fn(_, _) -> _);
        }
        Some(builder.register())
    });
    let Some(class) = class else { return; };
    // SAFETY: a live window on the main thread. Its class is only replaced when both
    // layouts have the same size, so no field moves.
    unsafe {
        if (*ns_window).class().instance_size() != class.instance_size() { return; }
        AnyObject::set_class(&*ns_window, class);
        let mask: usize = msg_send![ns_window, styleMask];
        // NSWindowStyleMaskNonactivatingPanel
        let _: () = msg_send![ns_window, setStyleMask: mask | 1 << 7];
    }
}
#[cfg(not(target_os = "macos"))]
fn overlay(_: &AppHandle, _: &WebviewWindow) {}
#[cfg(target_os = "macos")]
fn lift(window: &WebviewWindow) {
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(pointer) = target.ns_window() else { return; };
        let ns_window = pointer.cast::<objc2::runtime::AnyObject>();
        if ns_window.is_null() { return; }
        // NSStatusWindowLevel: in front of the Dock and menu bar, behind menus and alerts.
        // SAFETY: a live window on the main thread, with an NSInteger argument.
        unsafe { let _: () = objc2::msg_send![ns_window, setLevel: 25isize]; }
    });
}
#[cfg(not(target_os = "macos"))]
fn lift(_: &WebviewWindow) {}

pub fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").ok_or("Missing companion window")?;
    let path = app.path().app_config_dir().ok().map(|p| p.join("desktop-v1.json"));
    let prefs = path.as_ref().and_then(|p| std::fs::read_to_string(p).ok()).map(|raw| placement::decode(&raw)).unwrap_or_default();
    { let desktop = app.state::<Desktop>(); let mut s = desktop.inner.lock().unwrap(); s.prefs = prefs.clone(); s.path = path; }
    apply_layout(&window, &prefs).map_err(std::io::Error::other)?;
    window.set_always_on_top(prefs.always_on_top)?;
    let available = create_tray(app).unwrap_or(false);
    app.state::<Desktop>().inner.lock().unwrap().tray_available = available;
    overlay(app, &window);
    spaces::watch();
    let handle = app.clone();
    std::thread::Builder::new().name("presence".into()).spawn(move || presence(handle))?;
    Ok(())
}

pub fn window_event(window: &tauri::Window, event: &WindowEvent) {
    if window.label() != "main" { return; }
    let app = window.app_handle();
    match event {
        // While roaming, the place is remembered once, when the character stops.
        WindowEvent::Moved(_) | WindowEvent::ScaleFactorChanged { .. } if { let desktop = app.state::<Desktop>(); let s = desktop.inner.lock().unwrap(); s.roaming || s.returning } => (),
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
