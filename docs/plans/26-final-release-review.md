# 26: Final release review

**Status:** completed
**Goal:** Preserve Dockit’s capabilities while checking release gates across web, Mac, Android and iPhone.

## Tasks
- [x] Preserve and push baseline `baseline/v3.0.0` at `127ff5bd49cd592562fa8ffdf8345047acf67b29` before review.
- [x] Inventory nested surfaces and distinguish current evidence from historical acceptance.
- [x] Improve keyboard-open checklist import, full drag-grip hit area, action spacing and warm-paper panel feedback.
- [x] Repair stale navigation and drag gesture fixtures without weakening persistence assertions.
- [x] Finish current build/render receipts; review implementation ready for main.
- [ ] Complete connected account/device/store release gates below.

## Changes

The checklist importer scrolls within its sheet and wraps Paste/Add tasks with explicit 12px horizontal and 8px vertical gaps. Its new 320×600, 1.5× text and 280px keyboard-inset regression imports a parent and nested step. Earlier-task drag handles accept the full slot. Tests use visible tooltip controls after the prior icon-only navigation change and cross the actual touch threshold before dropping.

Settings and planning panels retain the warm notebook palette, with restrained paper-edge highlights and deeper warm shadows. Active settings tabs gain an ink underline; pressed controls gain inset feedback. Related footer actions wrap with 8px separation. Touch settings/planning controls have 44px minimum height. Phone outlined controls match filled controls at 48px; sheets share the selected material color, a warm edge, drag handle and consistent elevation. Reduced-motion settings remove transitions. Existing Paper/Frosted/Liquid choices, Focus map and task workflows remain available.

## Surface inventory and evidence

“Current browser” means isolated Chromium production assets with synthetic notebook data. “Mac bridge” means the shared React UI with native-command fixtures, not an installed WKWebView. Phone tests run the shared Flutter renderer; platform variants do not certify physical-device behavior. The earlier exhaustive element ledger remains in [Plan 25](25-interface-element-review.md), not relabeled as new evidence.

| Surface (including nested routes) | Web / shared Mac | Android / iPhone |
| --- | --- | --- |
| Notebook, date calendar, capture, editing, nested steps, finish outcome, move/date, delete/undo, Earlier, reorder | Current browser plus Node persistence/recovery/rollover tests; native disk bridge remains fixture | Current widget/store tests, including reorder/move/restart and hidden completed rows |
| Search, date/status filters, no results, Progress, result-to-original task | Current browser; Node archive tests | Current archive/filter/count/workflow tests |
| Goals, routines/cadence, goal plan, step editing/removal, scheduled fragments and linked tasks | Current browser Goals; Node project-planning/linkage tests; deeper panels retain prior visual evidence | Current goal plan, scheduling and moved-task tests at normal/large text |
| Day plan, adjustments, AI proposals, stale proposals, apply/discard/undo | Current Mac-bridge plan; Node constrained planning and recovery tests | Current plan/schedule widget and provider fixtures |
| Focus entry, timer, pause/complete, history, orbital route/map and maintenance | Current browser Focus entry; logic regressions and prior map evidence; no fresh full 3D route traversal | Current focus/workflow/long-duration tests; native GPU behavior not reverified |
| Settings → Storage, Style, AI, machine details, Integrations, Account, Updates | Current browser all exposed tabs/details, including Mac-only fixture tabs; actual updater/OS dialogs not invoked | Current settings/shared-account tests; importer keyboard regression; OS pickers remain unverified |
| Account → sign-in, configuration, sync progress, conflicts, backups, restore and sign-out | Node owner/migration/merge/stale-choice/failure tests; prior dialog visual evidence | Shared account/sync/merge tests; live account and destructive restore not exercised |
| Albums → request, regenerate, retry/error, retained previous results | Current source inspection and album regression tests; no fresh live model batch | Current provider/panel tests; live album quality remains user acceptance |
| Mynit meeting intake, source citations, assignment/workspace, Shiprite linked status/approval | Contract/source tests and prior synthetic rendering; live cross-product chain not reverified | Meeting/assignment/link tests; live authenticated chain unverified |
| Suite chooser, language menu, native window/tray, capture helper, sent screenshots, developer tools, error boundary | Current chooser/settings language renders; platform-owned surfaces retain historical checks | Current drawer/locale/footer tests; system sharing and actual permission prompts unverified |
| Embedded Shiprite document/tasks/settings/recovery/execution panels | Existing plugin tests and Plan 25 evidence; not a new host installation | Not a separate phone surface |

## Framework and scope

The core planning mechanism exists: stable task trees, local persistence and recovery, dated work and rollover, goals/routines, editable AI proposals, scheduling, focus history, explicit sync conflict handling, citations and assignment receipts. Dockit can remain usable without Shiprite or a model provider. More templates, music curation choices, prompts and task content do not need another architecture layer.

Remaining mechanisms are production acceptance and operations rather than another generic task module: verified shared identity/entitlement behavior, multi-client connected sync, store signing/distribution and update/rollback on the actual installed app. Do not infer those from mocks. Adding features before these gates would increase risk without proving the existing workflow.

## Roadmap

### P0 — Before public release
- Verify a fresh user sign-in, explicit sign-out/account switch, two-device offline edit → reconnect → conflict/recovery, and ordered edit/reorder/completion after restart against production services.
- Verify real Mynit intake → Dockit task → Shiprite assignment → status/source return using authorized test records.
- Sign/provision and install iPhone on a physical device; verify Android original-signer upgrade, Mac native window/tray/capture permissions and signed updater/rollback. New source metadata does not update installed packages.
- Repeat critical changed screens on the exact store builds with keyboard, large text, narrow split-window, VoiceOver/TalkBack and interruptions. Complete conditional feature gates in Plan 25.

### P1 — Early access
- Collect failure receipts for persistence/sync, retry rates and first-task completion with user consent; prioritize data continuity over new AI features.
- Exercise long project/Focus histories and source-unavailable handoffs; measure startup chunks before splitting more code. The current frontend build warns about >500KB chunks.
- Finish live album batch acceptance and mixed-language/user-content cases.

### P2 — Later
- Add curated workflow templates, optional curation profiles and richer Focus content through existing extension points.
- Consider additional integrations only after their independent failure/recovery behavior is proven.

## Community pitfalls

The parent review supplied [sync-frustration discussion](https://www.reddit.com/r/todoist/comments/1c7faca) and [reorder/edit divergence discussion](https://www.reddit.com/r/todoist/comments/1n91lzj). These anecdotes prioritize tests; they do not establish vendor failure rates. Dockit’s existing and rerun gates cover stale writes, conflict copies, retry, no resurrection, preserved nested IDs, reorder/edit and restart. Production two-device behavior remains a release gate.

## Notes

Concurrent translation work modified catalogs, archive copy and translation-audit scripts during this review. Those changes are preserved and excluded from this review commit. Executed checks see the shared checkout, so commit-only reproduction should rerun after that work is integrated. No production data was edited and no store release was published.

## Current verification receipts — November 26

- `npm test`: all 33 Node regression suites pass. `npm run build:frontend` and `npx tsc --noEmit` pass.
- Pinned Flutter: 173 tests pass; one optional screenshot test is skipped in the standard run and passes separately with `STICKY_SCREENSHOTS`, producing seven current phone screenshots. `flutter analyze` reports two existing informational style lints (`interface_locale.dart:131`, `footer_surface_test.dart:60`), no errors or warnings; its default exit status is nonzero for infos.
- Android: `flutter build apk --debug --target-platform android-arm64 --no-pub` succeeds; local preview is `phone/build/app/outputs/flutter-apk/app-debug.apk`. Not installed or a production-signer upgrade test.
- iPhone: `flutter build ios --simulator --debug --no-pub` succeeds; local build is `phone/build/ios/iphonesimulator/Runner.app`. No physical-device signing/install claim. The build’s automatic CocoaPods project migration was reverted to preserve the repository configuration.
- `python3 scripts/interface-review/final-release.py`: 180 state renders per web-wide, web-compact and Mac-bridge profile, ten languages, 540 total; zero missing state gates and zero out-of-viewport control groups. This geometry check does not prove all states accessible or all in-panel content unclipped.
- Current screenshots and machine-readable ledgers: `output/playwright/final-review/`. Representative German compact AI settings before/after: `output/playwright/final-review-before/340-de-settings-tab-2.png` and `output/playwright/final-review/340-de-settings-tab-2.png`.
- Native Mac executable, actual WKWebView, OS menus, signed updater and installed phone experiences were not rerun. Release remains conditional on P0 acceptance.
