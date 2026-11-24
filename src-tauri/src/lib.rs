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

/// Leave the kiosk screen for the desktop. The window has no taskbar button of its own
/// (skipTaskbar), so one is added right after minimizing: it is the way back into
/// fullscreen. Adding it before minimizing does not stick.
#[tauri::command]
fn minimize_screen(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.minimize();
        let _ = win.set_skip_taskbar(false);
    }
}

/// Quit the welcome screen. It returns on the next launch, or on boot with auto-start on.
#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
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
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_connection_info,
            minimize_screen,
            exit_app
        ])
        .on_window_event(|window, event| {
            // Windows reports a 0x0 client size while minimized: a real size means the
            // window is back (taskbar click, second launch) — hide the taskbar button
            // again (see minimize_screen)
            if let tauri::WindowEvent::Resized(size) = event {
                if size.width > 0 && size.height > 0 {
                    let _ = window.set_skip_taskbar(true);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("WelcomeScreen exited unexpectedly");
}
