# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-27

### Added

- Fullscreen kiosk renderer with three built-in templates (Red & Gold, Deep Blue,
  Minimal White), custom background image and logo, burn-in protection
- Display elements: clock (12/24h, optional seconds), date, scrolling marquee with
  three speeds
- Phone control page served by the app itself over LAN (axum), QR-code pairing with
  connection token, one-click token reset; two-column layout with sticky live
  preview on wide viewports (≥1024px)
- Hidden QR summon gesture: long-press bottom corner (configurable corner, 1–5 s
  hold in 0.5 s steps, 1.5 s default)
- First-run setup mode with persistent QR, one per network adapter on multi-NIC hosts
- Live 16:9 preview in the control page (container-query scaled shared templates)
- Greeting history, local draft with unsaved-changes indicator
- Night mode with overnight-capable schedule
- Multi-NIC QR IP selection with server-side validation
- Config export/import and one-click display reset
- Auto-start on boot (registry), single-instance enforcement
- Server-side input validation/clamping and cleanup of unreferenced uploaded files
- NSIS installer bundling the control page; GitHub Actions CI and release pipeline
- Welcome profiles: save multiple named looks (template, greeting, background,
  logo, display elements) in the control page and switch the big screen with one
  tap; profiles can be renamed, updated from the current edits or deleted
  (renaming keeps the active one active). Device-level settings (language,
  network, night schedule, QR, auto-start, token) stay unchanged. A manual save
  detaches the active profile; images stay on disk as long as the live config or
  any profile references them
- Profile API under `/api/profiles` (list, create, update, delete, activate)
  with the same token auth as the existing endpoints
- An "Open on this PC" button under the QR overlay (setup and summoned modes)
  opens the control page in the kiosk's own browser via a loopback URL
  (`tauri-plugin-opener`), covering deployments with no phone at hand
- Bilingual UI (Simplified Chinese / English): per-device language toggle in the control
  page, configurable screen language (`auto` follows the kiosk OS) for dates,
  clock AM/PM, QR prompts and template labels; fresh installs get greeting
  defaults in the operator's language
