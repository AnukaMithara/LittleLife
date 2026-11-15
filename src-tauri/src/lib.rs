mod jev;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(jev::Service::default())
        .invoke_handler(tauri::generate_handler![
            jev::jev_status, jev::jev_save_key, jev::jev_forget_key,
            jev::jev_configure, jev::jev_decide
        ])
        .run(tauri::generate_context!())
        .expect("LittleLife could not start");
}
