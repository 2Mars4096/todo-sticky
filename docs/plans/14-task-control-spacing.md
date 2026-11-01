# 14: Consistent Task Control Spacing

**Status:** completed
**Goal:** Align drag grips, checkboxes and first-line task text consistently on Mac and Android, then rebuild both apps.

## Tasks
- [x] Review the prior equal-gap fix and current paragraph/mobile layouts.
- [x] Use stable visual offsets independent of hit targets, shared phone grips and text-scaled vertical alignment.
- [x] Verify compact/wrapped/step layouts and drag/checkbox behavior.
- [x] Reinstall Mac with backup; build same-key Android +10.

## Decisions
- Preserve desktop 24px hit areas and the established 8px root-task visible spacing; remove paragraph-only margin/padding differences and fix flex sizing.
- Phone root/daily/Earlier grips share a six-dot painter inside 44px targets. Optical gap is 16px to the checkbox/title, with first-line alignment scaling with text. Nested rows share checkbox/title spacing and intentional indentation; action/history offsets follow the actual leading controls.
- No task/status/storage changes or added helper text. Existing deployment documentation changes remain intact.

## Verification
- Desktop browser geometry at 340/460/1000px: root visible gaps 8px/8px and step gaps 8.5px/8.5px, with 24px hit areas. Production build and TypeScript pass.
- Android analyzer and all 86 tests pass, including earlier drag and workflow checks. Normal/enlarged screenshots reviewed; nested no-handle steps retain a 12px text indent relative to the parent.
- Mac rebuilt, installed and launched; signature/bundle match and all 56 task files/settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-spacing-install-20261101-120854`.
- Android production +10 / 2010 rebuilt at `release/todo-sticky.apk`, 19,622,447 bytes; original certificate verified. SHA-256 `b42f18bd56414ce5c69a5ca7689a75dd1314b991d09fd67d2cbc9bbdc82350ba`.


## Source publication and rebuild — 2026-11-01

- User requested remote pull/merge, commit/push and a production APK rebuild.
- Fetch confirms origin/main is still ba07999, matching the local base; there is no incoming merge to resolve. Preserve the completed production deployment records and clarified project-goal scope alongside the spacing changes.
- Rebuild from the committed source using the existing +10 production version and original key; no feature changes or preview signing.
