use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub base_url: String,
    pub token_id: String,
    pub token_secret: String,
    #[serde(default)]
    pub accept_invalid_tls: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionResult {
    pub ok: bool,
    pub version: Option<String>,
    pub release: Option<String>,
    pub base_url: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiEnvelope<T> {
    pub data: T,
}
