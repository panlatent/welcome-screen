// Prevent a console window from popping up in release builds on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    welcome_screen_lib::run()
}
