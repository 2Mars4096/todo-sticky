# 16-1: Automatic Sync Frequency

**Parent:** [16-sync-efficiency](16-sync-efficiency.md)
**Status:** completed
**Goal:** Keep both clients current during ordinary use without repeatedly opening Account or pressing Sync now.

## Tasks
- [x] Review desktop/phone triggers, foreground lifecycle and draft protection.
- [x] Check remote changes every 15 seconds while visible/foregrounded; retain 900ms saved-edit debounce.
- [x] Sync promptly on return; fix Mac empty-field polling and visibility handling.
- [x] Allow Mac tasks/goals to sync during Focus while deferring incoming focus history.
- [x] Verify desktop scheduling, retries, drafts, conflicts and lifecycle with synthetic records.
- [x] Run phone lifecycle/retry regressions and existing suite with a compatible Flutter SDK.
- [x] Update usage and architecture documentation with timing and limits.
- [x] Rebuild/install Mac with rollback backup, signature/hash checks and preserved task/settings data.
- [x] Build and verify original-key Android +15 APK at `release/todo-sticky.apk`.

## Decisions
- Existing account sign-in/explicit initial enablement remain; no background Android service, push infrastructure or backend changes.
- A 15-second poll discovers remote changes and retries failures automatically. Network/transfer time and protected drafts can extend this; it is not a real-time delivery guarantee.
- Preserve local-first startup, save recovery, revision checks and explicit conflict choices.
- User requested Mac reinstall and a new production APK on 2026-11-07; deliver locally without a public release or backend change.

## Notes
- Before: both clients polled every 60 seconds. Mac poll/focus/online triggers skipped every focused input, even an empty capture. Mac lacked visibility-change handling and blocked all sync throughout an active Focus session. Phone already resumed after 900ms and retried on its next foreground poll.
- Desktop: all 23 Node suites, TypeScript and production frontend build pass. New real-hook fake-clock coverage verifies automatic remote arrival with empty capture, draft deferral/resume, hidden/paused polling, immediate visibility return, automatic offline retry, overlapping triggers, saved-edit debounce, cleanup and Focus-scoped history deferral.
- Initial review: Android lifecycle/remote-arrival/automatic-retry tests were added, but execution was blocked by the older PATH SDK and missing temporary Flutter SDK. Official pinned archive/manifest requests returned 404. This was resolved during the local delivery below.

## Local delivery — 2026-11-07
- Restored Rust 1.99.1 in `/private/tmp/sticky-rustup`; Mac optimized app built and signed with the existing service origin. All 23 Node suites and TypeScript pass.
- Mac installed at `/Applications/Sticky Todo.app` and launched. Exact build/installed hashes and signature verify; all 56 task-folder files (55 Markdown files) and native config remain unchanged after launch. Rollback app, task archive, native state and WebKit state: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-sync-frequency-install-20261107-232633`.
- Restored Flutter 3.47.8 / Dart 3.13.7 from official Git tag `737ba8f885dc774b53b442759999a312c9461e4e`, bypassing unavailable release archives. All 102 phone tests pass (one optional screenshot test skipped), analyzer is clean and changed-file formatting passes. Corrected the fake-clock test callback to use `expectSync`; no phone runtime fix was needed.
- Production Android `2.1.15+15` / versionCode `2015` delivered at `release/todo-sticky.apk`, 19,753,663 bytes (19.75 MB), ARM64 only. V2 signature, ZIP integrity, 16 KB alignment and prefilled production service origin verify. Certificate matches previous +14 and original `1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`; updates the existing production app without uninstalling. SHA-256: `89c6bb8b06e48d9d6e1fe5a4184eb613240505b8bbd37bb7edfd711ec980577f`.
- Verification reports, build/test logs, source hashes and previous +14 APK are retained under ignored `output/sync-frequency-delivery/`. Phone installation was not requested/performed. No public release or backend change.
