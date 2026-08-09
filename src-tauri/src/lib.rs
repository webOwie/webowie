mod commands;
mod models;
mod proxmox;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    std::env::set_var("GIO_USE_VFS", "local");

    let mut context = tauri::generate_context!();

    #[cfg(target_os = "linux")]
    context.set_default_window_icon(None);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::test_connection,
            commands::fetch_inventory,
            commands::fetch_node_network,
            commands::fetch_guest_config
        ])
        .run(context)
        .expect("error while running webOwie Proxmox Client");
}
