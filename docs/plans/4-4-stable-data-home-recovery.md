# 4-4: Stable Data Home Recovery

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make installed macOS launches consistently load the signed-in user's existing task and app-state stores even when the launcher overrides `HOME`.

## Tasks

- [x] 1. Audit normal and launcher-isolated task/config stores without modifying user data.
- [x] 2. Confirm the running app's inherited home and identify the path-resolution failure.
- [x] 3. Resolve macOS task and app-data roots from the signed-in account instead of the inherited environment.
- [x] 4. Add regression coverage for account-home precedence and stable path construction.
- [x] 5. Rebuild, install, relaunch, and verify the existing current-day task count.
- [x] 6. Update tracking and user-facing documentation.

## Decisions

- Keep `/Users/lizhi/Documents/Sticky Todo` and the normal bundle app-data directory as the existing source of truth; do not copy, merge, or overwrite either store during recovery.
- Leave the fresh launcher-isolated files in place so the repair remains reversible.
- Scope environment-independent account-home lookup to macOS; retain the existing platform path behavior elsewhere.

## Notes

- The running installed app inherited `HOME=/Users/lizhi/.codex-accounts/ph` and therefore opened an empty default task directory.
- The existing archive under `/Users/lizhi/Documents/Sticky Todo` remains intact with five top-level tasks and five subtasks for `2026-08-10`.
- After the repaired app was relaunched with the same isolated `HOME`, the normal Star Focus store updated while the isolated store remained untouched, confirming stable account-home resolution at runtime.
- Verification: `npm run build:frontend`, `cargo test --manifest-path src-tauri/Cargo.toml` with 13 passing tests, release app build, ad-hoc signature verification, and exact installed-bundle comparison.
- Installed rollback: `/private/tmp/sticky-todo-install.cRDJ7B/Sticky Todo.app`.
