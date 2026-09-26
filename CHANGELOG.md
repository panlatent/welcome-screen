# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Bilingual UI (简体中文 / English): language toggle in the control page
  (remembered per device), configurable screen language (`auto` follows the
  kiosk OS) for dates, clock AM/PM, QR prompts and template labels; fresh
  installs get greeting defaults in the operator's language

### Changed

- Server-side API error messages are now English diagnostics; the control page
  shows localized messages for everything it can classify
- The root status page is bilingual

## [0.1.0] - 2026-09-27

### Added

- Fullscreen kiosk renderer with three built-in templates (Red & Gold, Deep Blue,
  Minimal White), custom background image and logo, burn-in protection
- Display elements: clock (12/24h, optional seconds), date, scrolling marquee with
  three speeds
- Phone control page served by the app itself over LAN (axum), QR-code pairing with
  connection token, one-click token reset
- Hidden QR summon gesture: long-press bottom corner (configurable corner, 1–5 s hold)
- First-run setup mode with persistent QR, one per network adapter on multi-NIC hosts
- Live 16:9 preview in the control page (container-query scaled shared templates)
- Greeting history, local draft with unsaved-changes indicator
- Night mode with overnight-capable schedule
- Multi-NIC QR IP selection with server-side validation
- Config export/import and one-click display reset
- Auto-start on boot (registry), single-instance enforcement
- Server-side input validation/clamping and cleanup of unreferenced uploaded files
- NSIS installer bundling the control page; GitHub Actions CI and release pipeline
