# 16: Sync Efficiency And Interaction

**Status:** completed
**Goal:** Remove redundant sync storage/scan work and resume promptly after editing while preserving conflict and durability checks.

## Tasks
- [x] Trace both clients and identify repeated no-op writes, full scans and list reloads.
- [x] Batch unchanged acknowledgements and checkpoint only actual metadata changes.
- [x] Use targeted desktop date checks and one post-download reload; use scoped Android record snapshots.
- [x] Shorten debounce to 900ms, resume after editing, and count actual changes in progress.
- [x] Verify conflicts, schema migration, concurrent edits, save recovery and synthetic efficiency cases.
- [x] Rebuild/install Mac and deliver signed Android +14. Mac installation completed with [15-3](15-project-goals-and-multiday-planning.md#15-3-mac-project-planning).

## Decisions
- Client-only change; existing backend/schema, access rules, conflict resolution, backup and idempotent mutation ordering remain intact.
- Do not increase Android's 20-record cloud page size: the 16MB response guard must accommodate large permitted records. This pass targets local disk, scans and UI work, not claims of reduced network transfer.
- Acknowledgements that are already current require no local write. Changed acknowledgement baselines save together before actual transfers; pending upload identities still persist before network writes and acknowledgements remain durable after each transfer.
- Desktop downloads check only the affected date (or current goals/focus record) and retain native compare-before-write. List reload happens once after a download batch, including partial failures. Metadata migration has its own bounded refresh before uploads.
- Active nonempty draft editors defer sync; empty capture focus does not. Finishing editing schedules a retry. Desktop overlapping triggers queue one bounded follow-up. No startup dependency on accounts is introduced.
- Progress totals exclude unchanged acknowledgements. Actual conflict choices still require explicit review and retain both versions.

## Verification
- 21 Node suites and TypeScript pass; Android analyzer and 100 tests pass.
- Synthetic desktop checks: 200 equal records require one full scan, zero metadata writes and zero reloads. A 20-date download uses one full scan, 20 targeted reads and one reload, versus repeated full snapshots/reloads previously. Concurrent changes abort the affected apply while refreshing already applied dates.
- Android: 200 already-acknowledged records cause no notebook saves; 41 equal first-link records checkpoint once instead of once per record. Existing account/conflict/goal-migration/retry tests pass.
- Fix the desktop test harness's missing URLSearchParams global and assert that the held upload is actually reached, preventing a pending test promise from silently ending verification early.

- Editing-resume regression confirms leaving a draft starts a sync attempt after the 900ms debounce without waiting for the minute poll. Production Account UI check passes at 340px; its fixture now opens the Connection disclosure when the production build has a prefilled URL.

## Delivery
- Android production +14 / 2014 built at `release/todo-sticky.apk`, 19,753,663 bytes; original-key v2 signature and 16 KB alignment verified. SHA-256 `9427c191bc427af151382bc7c0d8bfa43cf19da131567dc9b78524f874d910b6`.
- Mac optimized bundle built and signed successfully. The normal Quit request stalled before backup/replacement. Cancelled only the installer and its osascript child; the running user app/data remain untouched. Installation awaits the user closing the app normally after saving edits.

- 2026-11-02: The Mac project build includes these sync changes and is installed/running. Bounded normal Quit/shortcut handling succeeded before backup and replacement; all 56 task files/settings unchanged. The earlier installation blocker is resolved.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="16-1-automatic-sync-frequency"></a>

## 16-1: Automatic Sync Frequency

**Goal:** Keep both clients current during ordinary use without repeatedly opening Account or pressing Sync now.

### Tasks
- [x] Review desktop/phone triggers, foreground lifecycle and draft protection.
- [x] Check remote changes every 15 seconds while visible/foregrounded; retain 900ms saved-edit debounce.
- [x] Sync promptly on return; fix Mac empty-field polling and visibility handling.
- [x] Allow Mac tasks/goals to sync during Focus while deferring incoming focus history.
- [x] Verify desktop scheduling, retries, drafts, conflicts and lifecycle with synthetic records.
- [x] Run phone lifecycle/retry regressions and existing suite with a compatible Flutter SDK.
- [x] Update usage and architecture documentation with timing and limits.
- [x] Rebuild/install Mac with rollback backup, signature/hash checks and preserved task/settings data.
- [x] Build and verify original-key Android +15 APK at `release/todo-sticky.apk`.

### Decisions
- Existing account sign-in/explicit initial enablement remain; no background Android service, push infrastructure or backend changes.
- A 15-second poll discovers remote changes and retries failures automatically. Network/transfer time and protected drafts can extend this; it is not a real-time delivery guarantee.
- Preserve local-first startup, save recovery, revision checks and explicit conflict choices.
- User requested Mac reinstall and a new production APK on 2026-11-07; deliver locally without a public release or backend change.

### Notes
- Before: both clients polled every 60 seconds. Mac poll/focus/online triggers skipped every focused input, even an empty capture. Mac lacked visibility-change handling and blocked all sync throughout an active Focus session. Phone already resumed after 900ms and retried on its next foreground poll.
- Desktop: all 23 Node suites, TypeScript and production frontend build pass. New real-hook fake-clock coverage verifies automatic remote arrival with empty capture, draft deferral/resume, hidden/paused polling, immediate visibility return, automatic offline retry, overlapping triggers, saved-edit debounce, cleanup and Focus-scoped history deferral.
- Initial review: Android lifecycle/remote-arrival/automatic-retry tests were added, but execution was blocked by the older PATH SDK and missing temporary Flutter SDK. Official pinned archive/manifest requests returned 404. This was resolved during the local delivery below.

### Local delivery — 2026-11-07
- Restored Rust 1.99.1 in `/private/tmp/sticky-rustup`; Mac optimized app built and signed with the existing service origin. All 23 Node suites and TypeScript pass.
- Mac installed at `/Applications/Sticky Todo.app` and launched. Exact build/installed hashes and signature verify; all 56 task-folder files (55 Markdown files) and native config remain unchanged after launch. Rollback app, task archive, native state and WebKit state: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-sync-frequency-install-20261107-232633`.
- Restored Flutter 3.47.8 / Dart 3.13.7 from official Git tag `737ba8f885dc774b53b442759999a312c9461e4e`, bypassing unavailable release archives. All 102 phone tests pass (one optional screenshot test skipped), analyzer is clean and changed-file formatting passes. Corrected the fake-clock test callback to use `expectSync`; no phone runtime fix was needed.
- Production Android `2.1.15+15` / versionCode `2015` delivered at `release/todo-sticky.apk`, 19,753,663 bytes (19.75 MB), ARM64 only. V2 signature, ZIP integrity, 16 KB alignment and prefilled production service origin verify. Certificate matches previous +14 and original `1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`; updates the existing production app without uninstalling. SHA-256: `89c6bb8b06e48d9d6e1fe5a4184eb613240505b8bbd37bb7edfd711ec980577f`.
- Verification reports, build/test logs, source hashes and previous +14 APK are retained under ignored `output/sync-frequency-delivery/`. Phone installation was not requested/performed. No public release or backend change.

<a id="16-2-smart-merge-and-stable-review"></a>

## 16-2: Smart Merge And Stable Conflict Review

**Goal:** Automatically retain independent edits on both devices and review genuine incompatible changes individually without background-refresh flashing.

### Tasks
- [x] Implement matching ID-aware three-way merges for goals, plan steps and nested daily tasks on Mac/Android.
- [x] Preserve exact originals, durable writes, revision guards and safe interrupted-merge retries.
- [x] Replace whole-record choices with per-item/field choices that always retain independent edits.
- [x] Keep background checks quiet and preserve review selections/scroll on unchanged refreshes.
- [x] Verify shared merge fixtures, concurrent changes, retries and compact review behavior.
- [x] Rebuild/reinstall Mac and deliver the matching signed APK before publication.

### Decisions
- Use the last acknowledged version as the ancestor. Without an ancestor, distinct IDs are additions; absence alone cannot establish deletion.
- Different additions, separate fields and edits to separate items merge automatically. Competing edits to the same field, delete-versus-edit and incompatible ordering require individual choices.
- Preserve unrelated changes regardless of a conflict choice. Identical text on different IDs is not deduplicated.
- An accepted, durably prepared upload can resume without repeating review only if its local fingerprint and remote expected revision are unchanged. A newer remote revision always requires reconciliation again.
- Saved original copies remain exportable. Apply a merged local record durably before revision-guarded upload; interrupted uploads retry from retained local content.
- User requests these fixes before committing, pushing and publishing 2.1.16. Publication has not started.

### Notes
- Whole goals/daily records are currently treated as conflicts even for independent additions. Review currently offers a whole-record version choice.
- Automatic progress mounts and busy-disabled radio focus events can disrupt review; background polling must not mount progress or reschedule sync from non-editor focus changes.
- 16 shared fixtures run against both implementations. Ordering combines independent insertions deterministically, honors a one-sided reorder and asks for an incompatible order. Project/step IDs merge as one assignment; unfinished new steps reopen completed parents. Invalid cross-parent combinations retain per-root-task review and schema validation, rather than storing duplicate task IDs. Combined lists exceeding limits require local editing.
- Desktop real-hook checks cover saved originals, durable merge before upload, failed save containment, pending mutation reuse and restoration of an existing service URL in public builds. Android controller checks cover mixed choices, actual notebook persistence before upload, offline retry and concurrent-edit preservation.
- All 25 Node suites, TypeScript, Android analysis and 121 phone tests pass (one optional screenshot test skipped). Browser checks at 340/460/1000px preserve DOM nodes, selections and scroll across repeated background refreshes; changed items alone invalidate their prior choice. Screenshot reviewed at 340px under ignored `output/playwright/merge-review/`.

### Delivery
- Source committed as `47d2271`; desktop version/tag `2.1.16` at `df8c0c2`. Both are pushed to origin/main; public release is tracked separately in [4-52](4-19-github-in-app-updates.md#4-52-publish-2-1-16).
- Mac 2.1.16 rebuilt/signed, installed and launched. Exact bundle hashes/signature verify; all 56 task-folder files and native config unchanged after launch. App/task/native/WebKit rollback copy: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-merge-review-install-20261108-102442`.
- Android 2.1.16+16 / 2016 delivered at `release/todo-sticky.apk`, 19,884,735 bytes (19.88 MB), ARM64. Original release certificate, v2 signature, 16 KB alignment, ZIP integrity and service URL verify. SHA-256 `61a3440831c59c673ffdcef44dcf6543535666e695e642ff69142ba20582dad9`. Previous +15 APK and reports remain under ignored `output/merge-review-delivery/`. No phone install or backend change.

<a id="16-3-false-local-change-detection"></a>

## 16-3: False Local Change Detection

**Goal:** Receive cloud dates consistently and retry genuine local changes on both clients without falsely blaming user edits.

### Tasks
- [x] Reproduce the reported November 7 read mismatch without modifying user data.
- [x] Make canonical single-date extraction match canonical history for absent, empty and duplicate sections.
- [x] Use neutral bounded automatic retry for actual concurrent local changes on Mac and phone.
- [x] Verify phone missing/empty date consistency and automatic-update races.
- [x] Verify native extraction and real-hook races; rebuild/reinstall Mac with the footer correction and deliver a new original-key APK.

### Decisions
- Canonical date requests return only actual sections and keep the first matching section. Default agent/API extraction retains its existing synthetic empty-date response.
- Never remove compare-before-write protection. A genuine local race gets one prompt automatic retry, then the normal periodic checks; it is not evidence that the user edited anything.
- Read-only live diagnosis prints only counts/representation differences, never task text or credentials.

### Evidence
- Installed CLI on 2026-11-08: November 7 has zero actual sections in its calendar owner, but targeted extraction returns one synthetic empty day. The two unchanged reads compare differently in the sync hook, producing the screenshot's false error.
- 41 native tests, 26 Node suites and TypeScript pass; 124 Flutter tests and analysis pass. New checks preserve real concurrent edits, retain independent automatic work on retry, keep the native stale-write guard and stop repeated races from causing a rapid retry loop.
- Read-only account metadata check confirms sync remains enabled and November 7 has an acknowledged revision with no pending mutation. Default CLI still intentionally synthesizes an absent date; the canonical read contract is verified separately by native regressions.
- Final combined Mac build reinstalled with data preserved; original-key APK 2.1.16+18 delivered. Typography, recovery clarification, hashes and rollback receipt are in [4-54](4-54-text-emphasis-consistency.md).

<a id="16-4-phone-sync-shortcut"></a>

## 16-4: Phone Sync Shortcut

**Goal:** Make the phone cloud control synchronize directly while keeping account configuration in Settings.

### Tasks
- [x] Check the current cloud control and explain the eye visibility control.
- [x] Replace cloud-to-Account navigation with the existing manual sync action and brief result feedback.
- [x] Keep unavailable/busy states safe and Account available through Settings.
- [x] Verify direct sync, no navigation, result feedback and local-only behavior.
- [x] Build and deliver the next original-key APK.

### Decisions
- One tap on an enabled cloud control requests sync. It never opens Account automatically or enables sync/sign-in implicitly.
- Existing controller draft/save/conflict protections remain authoritative. The button displays its result message.
- The eye control shows/hides completed and stopped tasks; it does not delete them.

### Verification
- Analyzer clean and all 127 phone tests pass (one optional screenshot test skipped).
- New widget checks verify a direct controller request without route changes, disabled/busy protection, authoritative result feedback and no implicit account enablement.

### Delivery
- Original-key Android 2.1.16+19 / versionCode 2019 delivered at `release/todo-sticky.apk`, 19,884,735 bytes (19.88 MB), ARM64. Production package, matching certificate, v2 signature, ZIP integrity, 16 KB alignment and service origin verify.
- SHA-256 `004512d8d9363a98dd793f9214571d60137e7abdc2c18aeea7c544217a88afc6`. Prior +18 APK, source hashes, test/build logs and verification report are retained under ignored `output/phone-sync-shortcut-delivery/`.
- Source for this shortcut and the preceding sync/typography/recovery corrections is committed as `f60e7ed` and pushed to origin/main; remote commit verified. No new release tag was requested.
