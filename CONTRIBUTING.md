# Contributing to WelcomeScreen

Thanks for your interest in contributing! This document covers the development setup
and the conventions used in this repository.

## Development environment

- **Windows 10 (1809+) or 11** — the app targets Windows kiosks only
- **Node.js ≥ 20** and npm
- **Rust ≥ 1.90** with the `x86_64-pc-windows-msvc` toolchain (`rustup default stable`)
- WebView2 Runtime (preinstalled on up-to-date Windows)

```bash
git clone https://github.com/panlatent/welcome.git
cd welcome
npm install

npm run build:control   # build the phone control page once — the Rust server
                        # serves it from dist-control/ even in dev mode
npm run tauri dev       # run the kiosk app with hot reload (main window)
```

Tips for day-to-day work:

- `npm run dev` previews only the big-screen page in a browser (no Tauri APIs);
  `?tpl=tech-blue` picks a template, `&night=1` forces night mode
- The phone control page must be rebuilt (`npm run build:control`) after changes —
  it is a separate Vite entry with no dev-server wiring
- Regression API tests need the app running locally: `node scripts/regression-test.mjs`

## Before opening a PR

```bash
npm run format          # Prettier (all TS/Vue/MD/JSON files)
npm run typecheck       # vue-tsc, must pass with no errors
npm run build           # both Vite entries must build
cd src-tauri
cargo fmt --check       # rustfmt
cargo clippy -- -D warnings
```

CI runs the same checks on `windows-latest`. Please keep PRs focused; one logical
change per PR makes review much easier.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) style:
`feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`.

## Reporting issues

- Bug reports: use the bug report template and include Windows version, how the
  screen is connected to the network, and steps to reproduce
- Security vulnerabilities: **do not** open a public issue — see
  [SECURITY.md](SECURITY.md)

## Project conventions

- Code comments, log messages, and commit messages are written in English
- User-facing UI strings are Simplified Chinese (the product's primary audience); keep them consistent
- `README.md` is the primary (English) documentation; `README.zh-CN.md` mirrors it in Chinese — update both together when changing user-facing docs
- The big-screen renderer, the control page, and the Rust server share the config
  model — when changing it, update `shared/types.ts` **and** `src-tauri/src/config.rs`
  together, keeping serde defaults backward-compatible with existing config files
- New settings must be validated/clamped server-side (`sanitize_and_validate`), not
  only in the control page UI
