mod config;
mod server;

use serde::Serialize;
use server::SharedState;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionInfo {
    ip: String,
    port: u16,
    ips: Vec<String>,
    token: String,
    control_url: String,
}

#[tauri::command]
fn get_config(state: tauri::State<SharedState>) -> config::WelcomeConfig {
    let mut cfg = state.config.lock().unwrap().clone();
    cfg.settings.token = String::new();
    cfg
}

#[tauri::command]
fn get_connection_info(state: tauri::State<SharedState>) -> ConnectionInfo {
    let token = state.config.lock().unwrap().settings.token.clone();
    let ip = state.effective_ip();
    ConnectionInfo {
        ip,
        port: state.port,
        ips: server::enumerate_ips()
            .into_iter()
            .map(|(_, a)| a)
            .collect(),
        control_url: format!(
            "http://{}:{}/c/?t={}",
            state.effective_ip(),
            state.port,
            token
        ),
        token,
    }
}

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch exits and focuses the existing window
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Hide the mouse cursor on the kiosk screen
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_cursor_visible(false);
            }
            // Fail loudly with context instead of panicking: an unattended kiosk
            // operator only has the console message to go on
            let (state, listener) = match server::init(app.handle()) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[init] failed to initialize the app: {e}");
                    eprintln!("[init] data dir and log hints: %APPDATA%\\io.github.panlatent.welcomescreen");
                    std::process::exit(1);
                }
            };
            let auto_start = state.config.lock().unwrap().settings.auto_start;
            server::apply_autostart(app.handle(), auto_start);
            app.manage(state.clone());
            server::spawn(state, listener);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_config, get_connection_info])
        .run(tauri::generate_context!())
        .expect("WelcomeScreen exited unexpectedly");
}
