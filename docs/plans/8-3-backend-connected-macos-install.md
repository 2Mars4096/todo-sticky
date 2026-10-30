# 8-3: Backend-connected macOS install

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Reinstall the desktop app with the deployed sync origin prefilled while preserving local data and account consent.

## Tasks
- [x] Verify live backend public configuration and existing build-time URL support.
- [x] Run TypeScript and all 15 Node regression suites.
- [x] Build the macOS app with `VITE_SYNC_SERVER_URL` set to the canonical service.
- [x] Back up the stopped app, settings, WebKit state and task Markdown; install and verify signature/bundle hashes.
- [x] Launch and verify task/config preservation; document remaining Google login and sync opt-in.

## Decisions
- Use the existing isolated Rust toolchain under `/private/tmp/todo-sync-rustup`; leave global Rust settings unchanged.
- Preserve saved service overrides, Google account state and sync opt-in. Prefill only through the existing environment variable.
- No public release, version bump or Android changes.

## Verification
- Optimized macOS app built with the live service origin; frontend bundle URL verified. Strict deep code signature and all installed bundle file hashes match the build. Installed app process is running.
- All 56 task files and native configuration remain byte-identical after launch. Stopped-app backup includes the prior application, settings, WebKit state and tasks; backup content verified before replacement.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-backend-install-20261029-225511`; machine-readable results in its `verification.json`.
- TypeScript and all 15 Node regression suites pass. Native source was unchanged; optimized native compilation/packaging succeeds.
- Google browser sign-in and explicit folder-sync opt-in remain user actions; no real account sign-in or two-device acceptance is claimed. Existing saved service overrides take precedence over the build default.
