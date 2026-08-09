use serde_json::Value;

use crate::{
    models::{ConnectionConfig, ConnectionResult},
    proxmox::ProxmoxClient,
};

#[tauri::command]
pub(crate) async fn test_connection(config: ConnectionConfig) -> Result<ConnectionResult, String> {
    let client = ProxmoxClient::from_config(&config)?;
    let version: Value = client.get("/version").await?;
    Ok(ConnectionResult {
        ok: true,
        version: version.get("version").and_then(Value::as_str).map(ToOwned::to_owned),
        release: version.get("release").and_then(Value::as_str).map(ToOwned::to_owned),
        base_url: client.base_url(),
    })
}

#[tauri::command]
pub(crate) async fn fetch_inventory(config: ConnectionConfig) -> Result<Vec<Value>, String> {
    ProxmoxClient::from_config(&config)?.get("/cluster/resources").await
}

#[tauri::command]
pub(crate) async fn fetch_node_network(
    config: ConnectionConfig,
    node: String,
) -> Result<Vec<Value>, String> {
    validate_segment(&node)?;
    ProxmoxClient::from_config(&config)?
        .get(&format!("/nodes/{node}/network"))
        .await
}

#[tauri::command]
pub(crate) async fn fetch_guest_config(
    config: ConnectionConfig,
    node: String,
    kind: String,
    vmid: u64,
) -> Result<Value, String> {
    validate_segment(&node)?;
    let endpoint_kind = match kind.as_str() {
        "qemu" => "qemu",
        "lxc" => "lxc",
        _ => return Err("Guest kind must be qemu or lxc".into()),
    };
    ProxmoxClient::from_config(&config)?
        .get(&format!("/nodes/{node}/{endpoint_kind}/{vmid}/config"))
        .await
}

fn validate_segment(value: &str) -> Result<(), String> {
    if value.is_empty()
        || !value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    {
        return Err("Invalid Proxmox path segment".into());
    }
    Ok(())
}
