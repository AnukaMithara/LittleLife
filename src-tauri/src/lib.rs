mod jev;
mod desktop;
mod placement;
mod motion;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = desktop::perform(app, desktop::Action::Interact, None);
        }))
        .manage(desktop::Desktop::default())
        .manage(jev::Service::default())
        .setup(|app| desktop::setup(app.handle()))
        .on_window_event(desktop::window_event)
        .invoke_handler(tauri::generate_handler![
            jev::jev_status, jev::jev_save_key, jev::jev_forget_key,
            jev::jev_configure, jev::jev_decide,
            desktop::desktop_status, desktop::desktop_action, desktop::desktop_step, desktop::desktop_movement
        ])
        .build(tauri::generate_context!())
        .expect("LittleLife could not start")
        .run(|app, event| match event {
            tauri::RunEvent::ExitRequested { .. } => desktop::persist(app),
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => { let _ = desktop::perform(app, desktop::Action::Interact, None); },
            _ => (),
        });
}
