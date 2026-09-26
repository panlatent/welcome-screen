<!-- One logical change per PR. Conventional Commits style title, e.g. "feat: ..." -->

## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] `npm run format:check` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `cargo fmt --check` and `cargo clippy -- -D warnings` pass (src-tauri)
- [ ] Config model changes: `shared/types.ts` and `src-tauri/src/config.rs` updated together with serde defaults kept backward-compatible
- [ ] New settings validated server-side, not only in the control page UI
- [ ] User-facing doc changes applied to both `README.md` and `README.zh-CN.md`
