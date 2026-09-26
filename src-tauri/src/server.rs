use crate::config::{self, WelcomeConfig};
use axum::{
    extract::{DefaultBodyLimit, Multipart, Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Json, Redirect, Response},
    routing::{get, post},
    Router,
};
use serde_json::json;
use std::{
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, Manager};
use tower_http::services::ServeDir;

const PORT_RANGE_START: u16 = 7480;
const PORT_RANGE_END: u16 = 7500;
const EVENT_CONFIG_CHANGED: &str = "config-changed";
const EVENT_CONNECTION_CHANGED: &str = "connection-changed";
const EVENT_SHOW_QR: &str = "show-qr";
const MAX_UPLOAD_BYTES: usize = 20 * 1024 * 1024;

pub struct AppState {
    pub app: AppHandle,
    pub config_path: PathBuf,
    pub files_dir: PathBuf,
    pub control_dir: PathBuf,
    pub port: u16,
    pub config: Mutex<WelcomeConfig>,
}

pub type SharedState = Arc<AppState>;

/// Enumerate usable IPv4 addresses (interface name, address), excluding loopback and
/// link-local (169.254.*), deduplicated by address
pub fn enumerate_ips() -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = Vec::new();
    if let Ok(ifas) = local_ip_address::list_afinet_netifas() {
        for (name, ip) in ifas {
            if let std::net::IpAddr::V4(v4) = ip {
                let s = v4.to_string();
                if v4.is_loopback() || s.starts_with("169.254.") {
                    continue;
                }
                if !out.iter().any(|(_, a)| *a == s) {
                    out.push((name, s));
                }
            }
        }
    }
    out
}

impl AppState {
    /// IP used in QR URLs: prefer the address selected in the control page (must still
    /// be a local address), else the default-route adapter, else the first enumerated one
    pub fn effective_ip(&self) -> String {
        let selected = self.config.lock().unwrap().settings.network.ip.clone();
        let ips = enumerate_ips();
        if !selected.is_empty() && ips.iter().any(|(_, a)| *a == selected) {
            return selected;
        }
        if let Ok(auto) = local_ip_address::local_ip() {
            let s = auto.to_string();
            if ips.iter().any(|(_, a)| *a == s) {
                return s;
            }
        }
        ips.into_iter()
            .next()
            .map(|(_, a)| a)
            .unwrap_or_else(|| "127.0.0.1".into())
    }

    pub fn control_url(&self) -> String {
        let token = self.config.lock().unwrap().settings.token.clone();
        format!(
            "http://{}:{}/c/?t={}",
            self.effective_ip(),
            self.port,
            token
        )
    }
}

/// Initialize directories, load the config, bind a port. Returns the shared state and listener.
pub fn init(app: &AppHandle) -> Result<(SharedState, TcpListener), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;
    let files_dir = data_dir.join("files");
    std::fs::create_dir_all(&files_dir)?;
    let config_path = data_dir.join("config.json");

    let mut cfg = config::load(&config_path);
    let mut dirty = false;
    if cfg.settings.token.is_empty() {
        cfg.settings.token = config::generate_token();
        dirty = true;
    }
    if cfg.template_id.is_empty() {
        cfg.template_id = "classic-red".into();
        dirty = true;
    }
    if dirty {
        config::save(&config_path, &cfg)?;
    }

    let listener = bind_listener()?;
    let port = listener.local_addr()?.port();
    let control_dir = resolve_control_dir(app);

    let state = Arc::new(AppState {
        app: app.clone(),
        config_path,
        files_dir,
        control_dir,
        port,
        config: Mutex::new(cfg),
    });
    Ok((state, listener))
}

fn bind_listener() -> std::io::Result<TcpListener> {
    let mut last_err = None;
    for port in PORT_RANGE_START..=PORT_RANGE_END {
        match TcpListener::bind(("0.0.0.0", port)) {
            Ok(l) => return Ok(l),
            Err(e) => last_err = Some(e),
        }
    }
    Err(last_err.unwrap_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::AddrInUse,
            "no available port in the configured range",
        )
    }))
}

fn resolve_control_dir(app: &AppHandle) -> PathBuf {
    // Dev: vite output lives in the project's dist-control/ (relative to src-tauri)
    for cand in ["../dist-control", "dist-control", "../../dist-control"] {
        let p = std::path::Path::new(cand);
        if p.join("control.html").exists() {
            return p.to_path_buf();
        }
    }
    // Release: resource dir packaged with the installer (resources/control)
    if let Ok(res) = app.path().resource_dir() {
        return res.join("control");
    }
    PathBuf::from("../dist-control")
}

pub fn apply_autostart(app: &AppHandle, enabled: bool) {
    use tauri_plugin_autostart::ManagerExt;
    let autolaunch = app.autolaunch();
    let result = if enabled {
        autolaunch.enable()
    } else {
        // Nothing to disable if autostart was never enabled (avoids a missing-registry-key error)
        match autolaunch.is_enabled() {
            Ok(false) => Ok(()),
            _ => autolaunch.disable(),
        }
    };
    if let Err(e) = result {
        eprintln!("[autostart] failed to set auto-start ({enabled}): {e}");
    }
}

pub fn spawn(state: SharedState, listener: TcpListener) {
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_server(state, listener).await {
            eprintln!("[server] HTTP server exited unexpectedly: {e}");
        }
    });
}

async fn run_server(state: SharedState, listener: TcpListener) -> std::io::Result<()> {
    listener.set_nonblocking(true)?;
    let listener = tokio::net::TcpListener::from_std(listener)?;
    // Log the base URL only — never the connection token
    let base_url = format!("http://{}:{}", state.effective_ip(), state.port);
    let app = router(state);
    println!("[server] control page served at {base_url}");
    axum::serve(listener, app).await
}

fn router(st: SharedState) -> Router {
    let api = Router::new()
        .route("/config", get(get_config).put(put_config))
        .route("/meta", get(get_meta))
        .route("/upload", post(upload))
        .route("/qr", post(post_show_qr))
        .route("/token", post(post_reset_token))
        .route_layer(middleware::from_fn_with_state(st.clone(), auth))
        .with_state(st.clone());

    Router::new()
        .nest("/api", api)
        .route("/", get(root_page))
        .route("/c", get(|| async { Redirect::permanent("/c/") }))
        .route("/c/", get(control_index))
        .nest_service("/c/assets", ServeDir::new(st.control_dir.join("assets")))
        .nest_service("/files", ServeDir::new(st.files_dir.clone()))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_BYTES))
        .with_state(st)
}

// ---------- Auth ----------

/// Constant-time equality so token comparison exposes no timing side channel
fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.bytes()
        .zip(b.bytes())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

async fn auth(State(st): State<SharedState>, req: Request, next: Next) -> Response {
    let token = st.config.lock().unwrap().settings.token.clone();
    let provided = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::to_string)
        .or_else(|| {
            req.uri()
                .query()
                .and_then(|q| q.split('&').find_map(|pair| pair.strip_prefix("t=")))
                .map(str::to_string)
        });
    let authorized = provided.is_some_and(|t| constant_time_eq(&t, &token));
    if authorized {
        next.run(req).await
    } else {
        // The control page maps 401 to its own localized message; this body is
        // for direct API consumers
        error(StatusCode::UNAUTHORIZED, "Invalid connection token")
    }
}

// ---------- API handlers ----------

async fn get_config(State(st): State<SharedState>) -> Response {
    let mut cfg = st.config.lock().unwrap().clone();
    // Never hand the token out: the control page already carries it in its URL
    cfg.settings.token = String::new();
    Json(cfg).into_response()
}

async fn put_config(
    State(st): State<SharedState>,
    Json(incoming): Json<WelcomeConfig>,
) -> Response {
    // Validate/clamp first; the token cannot be changed here (see /api/token).
    // The first successful save marks setup mode as done
    let mut incoming = incoming;
    if let Err(msg) = sanitize_and_validate(&mut incoming) {
        return error(StatusCode::BAD_REQUEST, &msg);
    }
    validate_network_ip(&mut incoming);
    incoming.settings.setup_done = true;
    let mut cfg = st.config.lock().unwrap();
    incoming.settings.token = cfg.settings.token.clone();
    *cfg = incoming;
    let snapshot = cfg.clone();
    drop(cfg);

    if let Err(e) = config::save(&st.config_path, &snapshot) {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Failed to save config: {e}"),
        );
    }
    cleanup_files(&st.files_dir, &snapshot);
    apply_autostart(&st.app, snapshot.settings.auto_start);
    // IP changes alter QR URLs — notify the screen so it stays in sync
    if let Err(e) = st.app.emit(EVENT_CONFIG_CHANGED, &snapshot) {
        eprintln!("[server] failed to notify the screen about the config change: {e}");
    }
    if let Err(e) = st.app.emit(
        EVENT_CONNECTION_CHANGED,
        json!({ "token": snapshot.settings.token, "url": st.control_url() }),
    ) {
        eprintln!("[server] failed to notify the screen about the connection change: {e}");
    }
    let mut res = snapshot.clone();
    res.settings.token = String::new();
    Json(res).into_response()
}

/// Truncate by chars (String::truncate cuts by bytes and would panic inside CJK text)
fn clamp_len(s: &mut String, max_chars: usize) {
    if s.chars().count() > max_chars {
        *s = s.chars().take(max_chars).collect();
    }
}

fn is_valid_file_path(p: &str) -> bool {
    let Some(name) = p.strip_prefix("files/") else {
        return false;
    };
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return false;
    }
    matches!(
        name.rsplit('.').next().unwrap_or(""),
        "png" | "jpg" | "webp"
    )
}

fn valid_hhmm(s: &str) -> bool {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 2 {
        return false;
    }
    let (Ok(h), Ok(m)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) else {
        return false;
    };
    h <= 23 && m <= 59
}

fn sanitize_and_validate(cfg: &mut WelcomeConfig) -> Result<(), String> {
    clamp_len(&mut cfg.welcome.title, 20);
    clamp_len(&mut cfg.welcome.guest, 40);
    clamp_len(&mut cfg.welcome.subtitle, 30);
    clamp_len(&mut cfg.elements.marquee, 80);
    cfg.settings.qr.display_seconds = cfg.settings.qr.display_seconds.clamp(10, 120);
    cfg.settings.qr.hold_seconds = cfg.settings.qr.hold_seconds.clamp(1, 5);
    if cfg.settings.qr.summon_corner != "bottom-left" {
        cfg.settings.qr.summon_corner = "bottom-right".into();
    }
    if !matches!(cfg.settings.clock.format.as_str(), "12h" | "24h") {
        cfg.settings.clock.format = "24h".into();
    }
    if !matches!(
        cfg.settings.marquee_speed.as_str(),
        "slow" | "normal" | "fast"
    ) {
        cfg.settings.marquee_speed = "normal".into();
    }
    if !matches!(cfg.settings.locale.as_str(), "auto" | "zh-CN" | "en") {
        cfg.settings.locale = "auto".into();
    }
    if !valid_hhmm(&cfg.settings.schedule.start) {
        cfg.settings.schedule.start = "22:00".into();
    }
    if !valid_hhmm(&cfg.settings.schedule.end) {
        cfg.settings.schedule.end = "07:00".into();
    }
    for p in [&cfg.background, &cfg.logo] {
        if !p.is_empty() && !is_valid_file_path(p) {
            return Err(format!("Invalid file path: {p}"));
        }
    }
    Ok(())
}

/// The selected IP must be a currently usable local address, else fall back to auto
fn validate_network_ip(cfg: &mut WelcomeConfig) {
    let selected = cfg.settings.network.ip.clone();
    if !selected.is_empty() && !enumerate_ips().iter().any(|(_, a)| *a == selected) {
        cfg.settings.network.ip = String::new();
    }
}

/// Delete uploaded files no longer referenced by the config to bound disk usage
fn cleanup_files(files_dir: &std::path::Path, cfg: &WelcomeConfig) {
    let referenced = [cfg.background.as_str(), cfg.logo.as_str()];
    let Ok(entries) = std::fs::read_dir(files_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let rel = format!("files/{}", entry.file_name().to_string_lossy());
        if !referenced.contains(&rel.as_str()) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

async fn get_meta(State(st): State<SharedState>) -> Response {
    let ips: Vec<serde_json::Value> = enumerate_ips()
        .into_iter()
        .map(|(name, addr)| json!({ "name": name, "addr": addr }))
        .collect();
    Json(json!({
        "ip": st.effective_ip(),
        "port": st.port,
        "url": st.control_url(),
        "version": env!("CARGO_PKG_VERSION"),
        "ips": ips,
    }))
    .into_response()
}

async fn post_show_qr(State(st): State<SharedState>) -> Response {
    if let Err(e) = st.app.emit(EVENT_SHOW_QR, ()) {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Failed to notify the screen: {e}"),
        );
    }
    Json(json!({ "ok": true })).into_response()
}

async fn post_reset_token(State(st): State<SharedState>) -> Response {
    let new_token = config::generate_token();
    {
        let mut cfg = st.config.lock().unwrap();
        cfg.settings.token = new_token.clone();
        if let Err(e) = config::save(&st.config_path, &cfg) {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to save: {e}"),
            );
        }
    }
    let url = st.control_url();
    // Notify the screen of the new QR URL, otherwise a summoned code would be stale
    let _ = st.app.emit(
        EVENT_CONNECTION_CHANGED,
        json!({ "token": new_token, "url": url }),
    );
    Json(json!({ "token": new_token, "url": url })).into_response()
}

fn ext_from(content_type: Option<&str>, filename: Option<&str>) -> Option<&'static str> {
    match content_type.unwrap_or("") {
        "image/png" => return Some("png"),
        "image/jpeg" => return Some("jpg"),
        "image/webp" => return Some("webp"),
        _ => {}
    }
    let name = filename.unwrap_or("").to_lowercase();
    if name.ends_with(".png") {
        Some("png")
    } else if name.ends_with(".jpg") || name.ends_with(".jpeg") {
        Some("jpg")
    } else if name.ends_with(".webp") {
        Some("webp")
    } else {
        None
    }
}

async fn upload(State(st): State<SharedState>, mut mp: Multipart) -> Response {
    let mut saved: Option<String> = None;
    while let Ok(Some(field)) = mp.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "kind" {
            let _ = field.text().await;
            continue;
        }
        if name != "file" {
            continue;
        }
        let filename = field.file_name().map(|s| s.to_string());
        let content_type = field.content_type().map(|s| s.to_string());
        let Some(ext) = ext_from(content_type.as_deref(), filename.as_deref()) else {
            return error(
                StatusCode::BAD_REQUEST,
                "Only PNG / JPG / WebP images are supported",
            );
        };
        let data = match field.bytes().await {
            Ok(d) => d,
            Err(e) => {
                return error(StatusCode::BAD_REQUEST, &format!("Failed to read upload data: {e}"))
            }
        };
        if data.is_empty() {
            return error(StatusCode::BAD_REQUEST, "Uploaded file is empty");
        }
        let file_name = format!("{}.{}", uuid::Uuid::new_v4().simple(), ext);
        if let Err(e) = tokio::fs::write(st.files_dir.join(&file_name), &data).await {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to write file: {e}"),
            );
        }
        saved = Some(format!("files/{file_name}"));
    }
    match saved {
        Some(path) => Json(json!({ "path": path })).into_response(),
        None => error(StatusCode::BAD_REQUEST, "Upload request is missing the file"),
    }
}

// ---------- Static pages ----------

async fn control_index(State(st): State<SharedState>) -> Response {
    match tokio::fs::read_to_string(st.control_dir.join("control.html")).await {
        Ok(html) => Html(html).into_response(),
        Err(_) => error_page(
            StatusCode::SERVICE_UNAVAILABLE,
            "Control page not bundled; in dev mode run npm run build:control first",
        ),
    }
}

/// Status page for anyone opening the screen URL directly; bilingual because the
/// viewer's language is unknown before the control page connects
async fn root_page(State(st): State<SharedState>) -> Response {
    let body = format!(
        "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>欢迎屏 · Welcome Screen</title>\
         <style>body{{font-family:'Microsoft YaHei',sans-serif;background:#101418;color:#e8e2d8;\
         display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}\
         div{{text-align:center;line-height:2}}b{{color:#f0b35c}}</style></head><body><div>\
         <div style=\"font-size:28px\">欢迎屏运行中</div>\
         <div style=\"font-size:20px\">Welcome screen running</div>\
         <div>控制端地址（需令牌）：<b>http://{}:{}/c/</b></div>\
         <div>Control page (token required): <b>http://{}:{}/c/</b></div>\
         <div style=\"opacity:.6;font-size:14px\">请在大屏长按底角呼出二维码扫码连接</div>\
         <div style=\"opacity:.6;font-size:14px\">Long-press the bottom corner of the big screen to show the QR code</div>\
         </div></body></html>",
        st.effective_ip(),
        st.port,
        st.effective_ip(),
        st.port
    );
    Html(body).into_response()
}

fn error(status: StatusCode, msg: &str) -> Response {
    (status, Json(json!({ "error": msg }))).into_response()
}

fn error_page(status: StatusCode, msg: &str) -> Response {
    (
        status,
        [("content-type", "text/plain; charset=utf-8")],
        msg.to_string(),
    )
        .into_response()
}
