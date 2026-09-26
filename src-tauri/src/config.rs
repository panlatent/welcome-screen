use serde::{Deserialize, Serialize};
use std::path::Path;

// All structs mirror shared/types.ts on the frontend: camelCase serialization plus
// field defaults so older config files and clients keep deserializing across versions.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WelcomeText {
    pub title: String,
    pub guest: String,
    pub subtitle: String,
}

impl Default for WelcomeText {
    fn default() -> Self {
        Self {
            title: "热烈欢迎".into(),
            guest: String::new(),
            subtitle: "莅临参观指导".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Elements {
    pub clock: bool,
    pub date: bool,
    pub marquee: String,
}

impl Default for Elements {
    fn default() -> Self {
        Self {
            clock: true,
            date: true,
            marquee: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct QrSettings {
    /// Corner hotspot for summoning the QR code: bottom-left | bottom-right (kiosk height only allows bottom corners)
    pub summon_corner: String,
    pub display_seconds: u64,
    /// Long-press seconds required to summon the QR overlay
    pub hold_seconds: u64,
}

impl Default for QrSettings {
    fn default() -> Self {
        Self {
            summon_corner: "bottom-right".into(),
            display_seconds: 30,
            hold_seconds: 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ClockSettings {
    /// Clock format: 24h | 12h
    pub format: String,
    pub show_seconds: bool,
}

impl Default for ClockSettings {
    fn default() -> Self {
        Self {
            format: "24h".into(),
            show_seconds: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ScheduleSettings {
    /// Night mode: the screen dims during this period
    pub enabled: bool,
    /// Start time (HH:MM)
    pub start: String,
    /// End time (HH:MM, may cross midnight)
    pub end: String,
}

impl Default for ScheduleSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            start: "22:00".into(),
            end: "07:00".into(),
        }
    }
}

/// Older config files lack the setupDone field; treat them as already deployed
/// (default true) so an upgrade does not re-enter setup mode. Fresh installs use
/// the Default impl (false).
fn default_setup_done() -> bool {
    true
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NetworkSettings {
    /// Screen IP used in QR URLs; empty = auto (default-route adapter). With both
    /// Ethernet and Wi-Fi, phones may only reach one subnet — pick it manually.
    pub ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub auto_start: bool,
    /// Setup mode: when false the screen shows the QR overlay until the first config save
    #[serde(default = "default_setup_done")]
    pub setup_done: bool,
    /// Language of on-screen chrome (dates, QR prompts): auto | zh-CN | en.
    /// "auto" follows the kiosk OS language.
    pub locale: String,
    pub clock: ClockSettings,
    /// Marquee speed: slow | normal | fast
    pub marquee_speed: String,
    pub schedule: ScheduleSettings,
    pub network: NetworkSettings,
    pub qr: QrSettings,
    /// Connection token. Persisted with the config so QR codes survive restarts;
    /// must be cleared before returning it through any API (see server::get_config)
    pub token: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            auto_start: false,
            setup_done: false,
            locale: "auto".into(),
            clock: ClockSettings::default(),
            marquee_speed: "normal".into(),
            schedule: ScheduleSettings::default(),
            network: NetworkSettings::default(),
            qr: QrSettings::default(),
            token: String::new(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WelcomeConfig {
    pub template_id: String,
    pub welcome: WelcomeText,
    /// Uploaded background as a relative path (files/xxx.jpg); empty = template default
    pub background: String,
    /// Uploaded logo as a relative path; empty = none
    pub logo: String,
    pub elements: Elements,
    pub settings: Settings,
}

pub fn generate_token() -> String {
    uuid::Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .take(10)
        .collect()
}

pub fn load(path: &Path) -> WelcomeConfig {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

pub fn save(path: &Path, cfg: &WelcomeConfig) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_vec_pretty(cfg)?;
    // Write to a temp file first, then atomically replace to survive power loss mid-write
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, path)
}
