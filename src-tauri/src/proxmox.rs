use reqwest::{header, Client};
use serde::de::DeserializeOwned;
use url::Url;

use crate::models::{ApiEnvelope, ConnectionConfig};

pub struct ProxmoxClient {
    client: Client,
    api_root: String,
    auth_value: header::HeaderValue,
    secret: String,
}

pub fn normalize_base_url(input: &str) -> Result<String, String> {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Proxmox URL is required".into());
    }

    let mut url = Url::parse(trimmed).map_err(|_| "Invalid Proxmox URL".to_string())?;
    if url.scheme() != "https" {
        return Err("Proxmox URL must use HTTPS".into());
    }
    if url.host_str().is_none() {
        return Err("Proxmox URL must include a hostname or IP".into());
    }

    let path = url.path().trim_end_matches('/').to_string();
    if path.ends_with("/api2/json") {
        let clean = path.trim_end_matches("/api2/json").to_string();
        url.set_path(if clean.is_empty() { "/" } else { &clean });
    }
    url.set_query(None);
    url.set_fragment(None);

    Ok(url.as_str().trim_end_matches('/').to_string())
}

pub fn token_header_value(token_id: &str, token_secret: &str) -> Result<header::HeaderValue, String> {
    if token_id.trim().is_empty() || token_secret.trim().is_empty() {
        return Err("API token ID and secret are required".into());
    }
    let raw = format!("PVEAPIToken={}={}", token_id.trim(), token_secret.trim());
    header::HeaderValue::from_str(&raw).map_err(|_| "API token contains invalid characters".to_string())
}

impl ProxmoxClient {
    pub fn from_config(config: &ConnectionConfig) -> Result<Self, String> {
        let base = normalize_base_url(&config.base_url)?;
        let auth_value = token_header_value(&config.token_id, &config.token_secret)?;
        let client = Client::builder()
            .danger_accept_invalid_certs(config.accept_invalid_tls)
            .https_only(true)
            .build()
            .map_err(|e| format!("Unable to initialize HTTPS client: {e}"))?;

        Ok(Self {
            client,
            api_root: format!("{base}/api2/json"),
            auth_value,
            secret: config.token_secret.clone(),
        })
    }

    pub fn base_url(&self) -> String {
        self.api_root.trim_end_matches("/api2/json").to_string()
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, String> {
        let url = format!("{}{}", self.api_root, ensure_leading_slash(path));
        let response = self
            .client
            .get(&url)
            .header(header::AUTHORIZATION, self.auth_value.clone())
            .send()
            .await
            .map_err(|e| self.redact(&format!("Proxmox API request failed: {e}")))?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            let compact = body.chars().take(300).collect::<String>();
            return Err(self.redact(&format!("Proxmox API returned HTTP {status}: {compact}")));
        }

        let envelope = response
            .json::<ApiEnvelope<T>>()
            .await
            .map_err(|e| self.redact(&format!("Invalid Proxmox API response: {e}")))?;
        Ok(envelope.data)
    }

    fn redact(&self, message: &str) -> String {
        if self.secret.is_empty() {
            message.to_string()
        } else {
            message.replace(&self.secret, "[REDACTED]")
        }
    }
}

fn ensure_leading_slash(path: &str) -> String {
    if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_api_suffix_and_trailing_slash() {
        assert_eq!(
            normalize_base_url("https://pve01.example.test:8006/api2/json/").unwrap(),
            "https://pve01.example.test:8006"
        );
    }

    #[test]
    fn rejects_plain_http() {
        assert!(normalize_base_url("http://pve01:8006").is_err());
    }

    #[test]
    fn builds_proxmox_api_token_header() {
        let value = token_header_value("root@pam!webowie", "secret-value").unwrap();
        assert_eq!(value.to_str().unwrap(), "PVEAPIToken=root@pam!webowie=secret-value");
    }
}
