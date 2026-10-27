# 8-1: Local account-sync install and Android delivery

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Integrate the existing account-sync implementation, reinstall macOS safely and deliver the matching Android APK.

## Tasks
- [x] Fetch upstream and fast-forward local main to account-sync commit `57fad2d`.
- [x] Preserve unrelated demo edits, resolving documentation additions without dropping either side.
- [x] Verify TypeScript and all 15 Node suites.
- [x] Build and verify the native macOS app; back up existing app/data and reinstall.
- [x] Download and verify the matching successful CI Android APK.
- [x] Document delivery and outstanding live service configuration.

## Decisions
- Reuse the account-enabled Android CI artifact from run `40055668420`; do not change the installed older Flutter SDK.
- No cloud deployment or live account sign-in is claimed. The implementation requires an actual Firebase/Cloud Run service URL.
- Preserve the demo-work backup stash. User subsequently authorized committing and pushing the integrated source and delivery documentation; no new version tag or release is requested.

## Verification
- CI run `40055668420` succeeds for Dart format, analysis, Flutter tests and ARM64 APK build at the exact integrated source. Downloaded ZIP matches GitHub’s SHA-256; `apksigner verify` passes. APK version 2.1.15+1, minimum Android API 24.
- Desktop app/config and all 55 task Markdown files backed up before replacement; location recorded in the final installation notes.

- macOS optimized build installed at `/Applications/Sticky Todo.app`, strict signature and complete bundle hashes verified, process launch confirmed; all 55 task files unchanged. All 35 native tests passed. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-account-sync-20261028-001529` (includes stopped-app WebKit/settings/tasks snapshot).
- APK: `output/account-sync/Sticky-Todo-2.1.15-account-sync-arm64.apk`; SHA-256 `92df297257d2f87d57771a50029aec5e8395133a1f0150c95cf6fdff18be5c3f`. Download/install notes and CI evidence are beside it.
- User subsequently authorized cloud deployment and Google sign-in; follow [8-2](8-2-cloud-deployment.md).
