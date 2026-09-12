//! SwitchBot Open API v1.1 クライアント。
//!
//! 認証は `token + t + nonce` を HMAC-SHA256(secret) で署名し、Base64 化したものを
//! `sign` ヘッダーに載せる方式。トークンとシークレットはこのモジュールの外に出さない。

use anyhow::{anyhow, bail, Result};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine as _;
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Method;
use serde::Serialize;
use serde_json::Value;
use sha2::Sha256;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const BASE: &str = "https://api.switch-bot.com/v1.1";

#[derive(Clone)]
pub struct SwitchBot {
    token: String,
    secret: String,
    http: reqwest::Client,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub device_id: String,
    pub name: String,
    /// 実機は deviceType、赤外線リモコンは remoteType が入る
    pub kind: String,
    pub hub_device_id: String,
    /// 赤外線リモコン（仮想デバイス）なら true。状態取得に対応しない
    pub infrared: bool,
    /// クラウド連携が無効なデバイスは API から操作できない
    pub cloud_enabled: bool,
}

impl SwitchBot {
    pub fn new(token: impl Into<String>, secret: impl Into<String>) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!("SwitchBotWidget/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("HTTP クライアントの初期化に失敗しました");
        Self {
            token: token.into(),
            secret: secret.into(),
            http,
        }
    }

    fn auth_headers(&self) -> Result<HeaderMap> {
        let t = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_millis()
            .to_string();
        let nonce = uuid::Uuid::new_v4().to_string();
        let sign = sign_request(&self.token, &self.secret, &t, &nonce)?;

        let mut h = HeaderMap::new();
        h.insert(AUTHORIZATION, HeaderValue::from_str(self.token.trim())?);
        h.insert("sign", HeaderValue::from_str(&sign)?);
        h.insert("nonce", HeaderValue::from_str(&nonce)?);
        h.insert("t", HeaderValue::from_str(&t)?);
        h.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/json; charset=utf8"),
        );
        Ok(h)
    }

    async fn call(&self, method: Method, path: &str, body: Option<Value>) -> Result<Value> {
        let mut req = self
            .http
            .request(method, format!("{BASE}{path}"))
            .headers(self.auth_headers()?);
        if let Some(b) = body {
            req = req.json(&b);
        }

        let res = req
            .send()
            .await
            .map_err(|e| anyhow!("SwitchBot に接続できません: {}", short_reqwest_error(&e)))?;
        let status = res.status();
        let text = res.text().await.unwrap_or_default();

        if status.as_u16() == 401 {
            bail!("認証に失敗しました。トークンとシークレットを確認してください");
        }
        if status.as_u16() == 429 {
            bail!("APIの呼び出し回数上限に達しました。しばらく待ってから再試行してください");
        }

        let v: Value = serde_json::from_str(&text)
            .map_err(|_| anyhow!("APIの応答を解釈できませんでした (HTTP {})", status.as_u16()))?;

        let code = v.get("statusCode").and_then(Value::as_i64).unwrap_or(-1);
        if code != 100 {
            let msg = v.get("message").and_then(Value::as_str).unwrap_or("");
            bail!("{}", describe_error(code, msg));
        }
        Ok(v.get("body").cloned().unwrap_or(Value::Null))
    }

    /// 登録済みデバイスと赤外線リモコンを一覧する。
    pub async fn devices(&self) -> Result<Vec<Device>> {
        let body = self.call(Method::GET, "/devices", None).await?;
        let mut out = Vec::new();

        if let Some(list) = body.get("deviceList").and_then(Value::as_array) {
            for d in list {
                let Some(id) = d.get("deviceId").and_then(Value::as_str) else {
                    continue;
                };
                out.push(Device {
                    device_id: id.to_string(),
                    name: str_or(d, "deviceName", "(名前なし)"),
                    kind: str_or(d, "deviceType", "Unknown"),
                    hub_device_id: str_or(d, "hubDeviceId", ""),
                    infrared: false,
                    cloud_enabled: d
                        .get("enableCloudService")
                        .and_then(Value::as_bool)
                        // Hub や一部センサーはこのフィールド自体を持たない
                        .unwrap_or(true),
                });
            }
        }

        if let Some(list) = body.get("infraredRemoteList").and_then(Value::as_array) {
            for d in list {
                let Some(id) = d.get("deviceId").and_then(Value::as_str) else {
                    continue;
                };
                out.push(Device {
                    device_id: id.to_string(),
                    name: str_or(d, "deviceName", "(名前なし)"),
                    kind: str_or(d, "remoteType", "Others"),
                    hub_device_id: str_or(d, "hubDeviceId", ""),
                    infrared: true,
                    cloud_enabled: true,
                });
            }
        }

        Ok(out)
    }

    /// 実機デバイスの現在状態を取得する（赤外線リモコンは非対応）。
    pub async fn status(&self, device_id: &str) -> Result<Value> {
        self.call(
            Method::GET,
            &format!("/devices/{}/status", enc(device_id)),
            None,
        )
        .await
    }

    /// デバイスにコマンドを送る。`parameter` は文字列・オブジェクトのどちらも取れる。
    pub async fn command(
        &self,
        device_id: &str,
        command: &str,
        parameter: Value,
        command_type: &str,
    ) -> Result<Value> {
        let parameter = if parameter.is_null() {
            Value::String("default".into())
        } else {
            parameter
        };
        let body = serde_json::json!({
            "command": command,
            "parameter": parameter,
            "commandType": command_type,
        });
        self.call(
            Method::POST,
            &format!("/devices/{}/commands", enc(device_id)),
            Some(body),
        )
        .await
    }
}

/// `token + t + nonce` を secret で HMAC-SHA256 し、Base64 にしたものが署名になる。
fn sign_request(token: &str, secret: &str, t: &str, nonce: &str) -> Result<String> {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|e| anyhow!("シークレットが不正です: {e}"))?;
    mac.update(format!("{token}{t}{nonce}").as_bytes());
    Ok(B64.encode(mac.finalize().into_bytes()))
}

fn str_or(v: &Value, key: &str, fallback: &str) -> String {
    v.get(key)
        .and_then(Value::as_str)
        .unwrap_or(fallback)
        .to_string()
}

/// deviceId は英数字想定だが、念のためパスに使えない文字を落とす。
fn enc(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        .collect()
}

fn short_reqwest_error(e: &reqwest::Error) -> String {
    if e.is_timeout() {
        "応答がありません（タイムアウト）".into()
    } else if e.is_connect() {
        "ネットワークに接続できません".into()
    } else {
        e.to_string()
    }
}

/// SwitchBot の statusCode を日本語に読み替える。
fn describe_error(code: i64, message: &str) -> String {
    let base = match code {
        151 => "デバイスの種類に対応していません",
        152 => "デバイスが見つかりません",
        160 => "このコマンドには対応していません",
        161 => "デバイスがオフラインです",
        171 => "ハブがオフラインです。ハブの電源とネットワークを確認してください",
        190 => "SwitchBot 側で処理に失敗しました",
        -1 => "APIの応答が不正です",
        _ => "APIエラー",
    };
    if message.is_empty() {
        format!("{base} (code {code})")
    } else {
        format!("{base} (code {code}: {message})")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 署名は仕様どおりのhmacになる() {
        let sign = sign_request("tok", "sec", "1700000000000", "nonce-1").unwrap();
        assert_eq!(sign, "zEAC4LzFtZYlUa4RQQnxZtEoNbE6Icy2wL5JobF5wUs=");
    }

    #[test]
    fn 認証ヘッダーが必要な項目を揃える() {
        let sb = SwitchBot::new("my-token", "my-secret");
        let h = sb.auth_headers().unwrap();

        assert_eq!(h.get(AUTHORIZATION).unwrap(), "my-token");
        // Base64 にした SHA-256 は必ず 44 文字
        assert_eq!(h.get("sign").unwrap().len(), 44);
        // t はミリ秒のエポック
        let t: u64 = h.get("t").unwrap().to_str().unwrap().parse().unwrap();
        assert!(t > 1_700_000_000_000, "t がミリ秒になっていない: {t}");
        // nonce は毎回変わる
        let nonce1 = h.get("nonce").unwrap().to_str().unwrap().to_string();
        let nonce2 = sb.auth_headers().unwrap();
        assert_ne!(nonce1, nonce2.get("nonce").unwrap().to_str().unwrap());
    }

    #[test]
    fn デバイスidにパス区切りを混ぜられない() {
        assert_eq!(enc("ABC123"), "ABC123");
        assert_eq!(enc("../../v1.1/devices"), "....v1.1devices");
    }

    #[test]
    fn エラーコードを日本語にする() {
        assert!(describe_error(161, "device offline").contains("オフライン"));
        assert!(describe_error(171, "").contains("ハブ"));
        assert!(describe_error(999, "").contains("999"));
    }
}
