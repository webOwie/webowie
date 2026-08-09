mod commands;
mod models;
mod proxmox;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::test_connection,
            commands::fetch_inventory,
            commands::fetch_node_network,
            commands::fetch_guest_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running webOwie Proxmox Client");
}
