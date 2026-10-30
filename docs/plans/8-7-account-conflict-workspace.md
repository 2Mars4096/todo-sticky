# 8-7: Account controls and conflict workspace

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Replace the rough Account layout with concise controls and a safe, readable conflict/recovery workspace.

## Tasks
- [x] Review the screenshot, existing design rules and Dropbox's conflicted-copy guidance.
- [x] Reorganize identity, sync action/progress and secondary connection controls with minimal copy.
- [x] Add readable comparisons, difference filtering, explicit version selection, saved-copy browsing and scoped export.
- [x] Save both versions on detection, deduplicate recovery snapshots and reject choices based on stale comparisons on both clients.
- [x] Verify UI at compact/wide sizes and conflict safety, then reinstall Mac and deliver the APK with the pending progress work.

## Decisions
- Source: https://help.dropbox.com/organize/conflicted-copy. Adopt preservation-first review, not a claim of automatic text merging.
- Conflicts remain per date/goals/focus record. Both full copies are saved locally before resolution. Users can compare/select or export for manual merging; the app does not silently combine task trees or delete conflicts.
- Keep the product copy to labels, counts, data and action-critical errors. Move recovery export into the review workspace and connection details below the main controls.
- The screenshot concerns desktop; Android receives the same preservation/stale-choice protection alongside its progress update.

## Verification and delivery
- TypeScript and all 18 Node suites pass. Conflict tests cover full-copy detachment, duplicate suppression, first-detection persistence, nested/moved/deleted comparisons, and stale-choice rejection before native writes. Flutter analysis/all 50 tests pass with the same first-detection and stale-choice protection.
- Browser review with fictional notes verifies explicit selection before Apply, progressing to the next conflict, saved-copy read-only export, minimum-width stacking without horizontal overflow, checkbox spacing and active-sync layout. Evidence under `output/playwright/account-*.png` and `conflict-review-desktop.png`.
- Installed Mac bundle/signature/hash checks pass; all 56 task files/native settings unchanged after launch. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-account-workspace-install-20261030-004841`.
- Android +5 is signed with the existing release key; emulator update preserves its earlier-day synthetic task. Final size 19,425,307 bytes; SHA-256 `1578cc82b89c6172c985d6c69b7f267593629c9382d1b75cecbb08d341cd6b3c`.
- Real user conflicts were not resolved by the agent. Recovery snapshots are device-local and exportable. Whole-date/version selection is explicit; task-level automatic merging and restoring historical snapshots directly are not claimed.
