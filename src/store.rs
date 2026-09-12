//! 設定ファイルと資格情報の永続化。
//!
//! トークンとシークレットは平文で残さず Windows 資格情報マネージャーに保存する。
//! それ以外の設定（ウィンドウ位置・並び順・エアコンの最後の操作内容）は JSON で保存する。

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

const SERVICE: &str = "SwitchBotWidget";
const KEY_TOKEN: &str = "token";
const KEY_SECRET: &str = "secret";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Config {
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_w: f64,
    pub window_h: f64,
    pub always_on_top: bool,
    /// ウィンドウ全体の不透明度 (0.35〜1.0)
    pub opacity: f64,
    /// 状態の自動更新間隔（秒）。0 で無効
    pub auto_refresh_sec: u64,
    /// ドラッグを終えたときにモニタの端へ吸着させるか
    pub snap_to_edges: bool,
    /// 起動時に新しいバージョンが出ていないか確かめるか
    pub auto_check_updates: bool,
    /// 表示順（deviceId の並び）。ここにない ID は末尾に回る
    pub order: Vec<String>,
    /// 非表示にしている deviceId
    pub hidden: Vec<String>,
    /// 赤外線エアコンは状態を取得できないため、最後に送った内容を覚えておく
    pub ac_state: HashMap<String, AcState>,
    pub launch_at_login: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            window_x: None,
            window_y: None,
            window_w: 360.0,
            window_h: 620.0,
            always_on_top: true,
            opacity: 1.0,
            auto_refresh_sec: 300,
            snap_to_edges: true,
            auto_check_updates: true,
            order: Vec::new(),
            hidden: Vec::new(),
            ac_state: HashMap::new(),
            launch_at_login: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AcState {
    pub temperature: i64,
    /// 1:自動 2:冷房 3:除湿 4:送風 5:暖房
    pub mode: i64,
    /// 1:自動 2:弱 3:中 4:強
    pub fan: i64,
    pub power: bool,
}

impl Default for AcState {
    fn default() -> Self {
        Self {
            temperature: 26,
            mode: 2,
            fan: 1,
            power: false,
        }
    }
}

impl Config {
    pub fn load(path: &Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)
                .with_context(|| format!("設定フォルダを作成できません: {}", dir.display()))?;
        }
        let json = serde_json::to_string_pretty(self)?;
        // 書き込み途中で落ちても設定を壊さないよう、一時ファイル経由で差し替える
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, json)?;
        std::fs::rename(&tmp, path)
            .with_context(|| format!("設定を保存できません: {}", path.display()))?;
        Ok(())
    }

    /// 値域を外れた設定を安全な範囲に丸める。
    pub fn sanitize(&mut self) {
        self.opacity = self.opacity.clamp(0.35, 1.0);
        self.window_w = self.window_w.clamp(320.0, 900.0);
        self.window_h = self.window_h.clamp(240.0, 1400.0);
        if self.auto_refresh_sec != 0 {
            // 上限 10,000 回/日を踏まえ、下限は 60 秒
            self.auto_refresh_sec = self.auto_refresh_sec.clamp(60, 3600);
        }
    }
}

pub fn config_path(dir: PathBuf) -> PathBuf {
    dir.join("config.json")
}

// ---- 資格情報 -------------------------------------------------------------

pub fn save_credentials(token: &str, secret: &str) -> Result<()> {
    keyring::Entry::new(SERVICE, KEY_TOKEN)?.set_password(token)?;
    keyring::Entry::new(SERVICE, KEY_SECRET)?.set_password(secret)?;
    Ok(())
}

pub fn load_credentials() -> Option<(String, String)> {
    let token = keyring::Entry::new(SERVICE, KEY_TOKEN).ok()?.get_password().ok()?;
    let secret = keyring::Entry::new(SERVICE, KEY_SECRET).ok()?.get_password().ok()?;
    if token.trim().is_empty() || secret.trim().is_empty() {
        return None;
    }
    Some((token, secret))
}

pub fn clear_credentials() -> Result<()> {
    for key in [KEY_TOKEN, KEY_SECRET] {
        if let Ok(entry) = keyring::Entry::new(SERVICE, key) {
            // 未登録なら NoEntry が返るだけなので無視してよい
            let _ = entry.delete_credential();
        }
    }
    Ok(())
}

// ---- 自動起動 -------------------------------------------------------------

#[cfg(windows)]
pub fn set_launch_at_login(enabled: bool) -> Result<()> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
    use winreg::RegKey;

    let run = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            KEY_SET_VALUE,
        )
        .context("スタートアップ設定のレジストリを開けません")?;

    if enabled {
        let exe = std::env::current_exe().context("実行ファイルのパスを取得できません")?;
        // 自動起動のときはトレイ常駐だけさせ、ウィンドウは出さない
        run.set_value(SERVICE, &format!("\"{}\" --hidden", exe.display()))
            .context("スタートアップに登録できません")?;
    } else {
        // 未登録のときの NotFound は成功扱いにする
        if let Err(e) = run.delete_value(SERVICE) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(e).context("スタートアップ登録を解除できません");
            }
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_launch_at_login(_enabled: bool) -> Result<()> {
    anyhow::bail!("このプラットフォームでは自動起動に対応していません")
}
