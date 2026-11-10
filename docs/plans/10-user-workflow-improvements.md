# 10: User Workflow Improvements

**Status:** completed
**Goal:** Improve awareness, retrieval, recurring work, planning and progress review while preserving the compact working note.

## Tasks
- [x] 1. Reconcile the twelve review proposals with the user's feedback and existing functionality.
- [x] 2. Review PRODUCT.md, DESIGN.md, past UI refinements and recorded failures; capture regression gates.
- [x] 3. Define a concrete proposed scope and delivery order.
- [x] 4. Implement the desktop-first scope in [10-1](10-user-workflow-improvements.md#10-1-desktop-workflow), in sequential workflow slices.
- [x] 5. Verify desktop workflows and perform frontend/user-perspective review; evidence and acceptance limits are in [10-1](10-user-workflow-improvements.md#10-1-desktop-workflow).
- [x] 6. Android UI parity, second review, Mac installation and signed APK delivery in [10-2](10-user-workflow-improvements.md#10-2-review-install-and-android).

Optional synchronized schedule definitions and physical-device/user studies remain backlog work, outside the completed local delivery.

## Decisions

The 2026-10-30 feedback sets the following direction. The user subsequently requested sequential implementation and a frontend/user-perspective review. Desktop implementation is complete in [10-1](10-user-workflow-improvements.md#10-1-desktop-workflow); second review, Mac installation and matching Android APK delivery are complete in [10-2](10-user-workflow-improvements.md#10-2-review-install-and-android). The table records the agreed direction, with implementation decisions below and in the sub-plan.

| Original point | Revised scope |
|---|---|
| 1. Today priorities | Reuse task/subtask ordering and the existing next-step summary. Do not introduce a separate sequencing or priority system in this pass. |
| 2. Backlog review | Make existing unfinished work noticeable through the Earlier tasks disclosure, its count and a quiet attention cue. Opening it reveals actionable existing rows. Start with awareness, not a new inbox or compulsory daily dialog. |
| 3. Search | Search task and step text across dates, including done and stopped work. Show source date, parent context and state; selecting a result opens the original task. |
| 4. Goal linking | On hold. Keep current goals independent. |
| 5. Recurrence | Optional Daily / Weekdays / Weekly choices beside a routine; Manual remains the default. Show the next occurrence and offer Skip / Pause. See recurrence rules below. |
| 6. Smarter planning | Keep available time, estimates and exceptions together in Plan. Reuse prior preferences, offer quick duration choices and editable AI estimates on explicit generation, and expose unavailable periods inline. Avoid mandatory per-task setup or trips to Settings. Existing list order supplies the default preference order. |
| 7. Plan editing | Retain editing of generated subtasks after Apply. No separate timeline editor in this pass. Replanning must not silently discard user edits to previously generated steps. |
| 8. Date clarity | Use concise, consistent meanings for the list/work date and Due date. Move changes list placement; Due changes the deadline. Show the destination in the move affordance and keep the saved deadline visible. Avoid adding a second permanent date row to every task. |
| 9. Completion changes | Deferred. Preserve current checkbox, parent/step cascade and Outcome review behavior. |
| 10. Post-focus review | Offer an optional Review task action in the existing completion surface. Return to the original task and its existing steps/Outcome controls; allow an ordinary step to express the next action or blocker. Back to tasks and Another session remain available. |
| 11. Progress dashboard | Add an on-demand Progress page with day/week selection, completion summaries and the underlying task lists. Keep it separate from the default capture surface. Use the data definitions below rather than invented historical completion dates. |
| 12. Sync status | Prefer one small day/account status indicator with an accessible name and details on activation. Distinguish disabled/local-only, waiting, syncing, acknowledged and attention states. Do not recolor task text or imply per-task acknowledgement when sync tracks an entire date. |

### Recurrence direction and desktop scope

- Preserve existing manually reset routines unless the user opts into a schedule.
- Proposed behavior: scheduled routines create ordinary dated task occurrences; completing one does not complete or delete the routine definition.
- Use a stable routine-plus-occurrence identity so reopening or syncing two devices cannot create duplicate occurrences. Editing an occurrence affects that occurrence; editing the routine affects future occurrences.
- Proposed missed-date policy: surface the current due occurrence on return, without flooding Today with a task for every missed day. Existing unfinished occurrences remain visible through Earlier tasks.
- Desktop implementation uses the device local calendar, weekly anchoring on the configured weekday and device-local folder-scoped schedule definitions. Existing goal records remain unchanged; generated tasks use normal task sync. Detailed Pause/Skip/retry behavior is in 10-1. Cross-client schedule editing remains follow-on work.

### Progress data definitions

- Current task records have status and source/list date, but no completion timestamp. For historical data, label counts as completed tasks **on the selected day's list**, not tasks completed on that date.
- Count parent tasks separately from steps. Stopped work is separate from done; carried tasks are not counted again merely because they appear on Today.
- A true completion timeline requires future completion-event recording, including reopen/Undo behavior, without changing completion interactions. Do not backfill invented timestamps. Decide this explicitly in the dashboard implementation sub-plan.
- Focus records have completion timestamps but store planned duration. Label planned minutes honestly, and disclose retained-history limits; do not claim lifetime totals or actual focused time.
- Partial/unavailable archives must appear as incomplete coverage, not zero activity. Use the same canonical source dates as normal navigation.

## Proposed Delivery Order

1. Awareness and retrieval: Earlier tasks cue, Search, date wording and compact sync status.
2. Planning: remember useful defaults, inline duration/availability controls, preserve edited generated work.
3. Recurrence: implement occurrence semantics and safe persistence on desktop; keep generated tasks compatible with existing clients.
4. Reflection: post-focus task return and the Progress page with honest metrics.

## Design And Regression Gates

- The user is glancing at a small warm-paper note beside active work. Keep capture immediately writable, titles prominent and supporting controls quiet.
- Preserve 340×440 desktop, default and wide layouts; check phone at 360px and enlarged text. No idle rail squeeze, overlapping footer or growing permanent header.
- Keep direct desktop action icons and phone drag grips/icon actions. Preserve platform-specific action grouping; no restored global history checkbox, duplicate Edit command or Enter-to-add helper copy.
- Inline options and existing disclosures first. Progress/Search may use an intentional in-app page with Back; do not stack dialogs or make the dashboard the launch screen.
- Preserve stable Settings geometry, editor alignment and equal control spacing. Layout changes must not move pointer targets between press and release.
- Indicators need names/tooltips and keyboard/touch access. Color alone cannot carry meaning; sync success requires acknowledged current content, not merely a past successful run.
- Search/dashboard history loads must not block Today, capture or native reveal. Retain canonical archive ownership, unavailable-file notices, bounded rendering and stale-result cancellation.
- Keep explicit AI requests, editable suggestions, Apply/Discard/Undo, saved-setting clarity and error detail. Ordinary selection never calls AI.
- Preserve save retries, move destination-before-source ordering, concurrent edits, recovery copies and conflict review. Recurrence and summaries cannot bypass these protections.
- Native and physical-device acceptance remain distinct from synthetic browser/widget checks. Use fictional data for review; do not mutate the user's archive to demonstrate features.

## Evidence And Prior Fixes

- [4-44 UI refinement](4-44-ui-interaction-refinement.md): direct icons supersede the initial More-menu proposal; compact controls, removed helper copy, startup reveal and stable Settings.
- [4-41-2 Outcome/Due presentation](4-41-finish-promises.md#4-41-2-outcome-due-presentation): aligned metadata and deliberate selection/editing.
- [4-35 fast task loading](4-35-fast-task-loading.md) and [bugs](../bugs.md): do not reintroduce blocking archive scans, repeated sections or moving click targets.
- [7-3 concise phone copy](7-3-concise-mobile-copy.md) and [7-4 phone controls](7-4-phone-task-controls.md): retain minimal text, touch targets and visible-row reorder mapping.
- [8-7 conflict workspace](8-7-account-conflict-workspace.md): keep detailed recovery in Account, with both versions preserved.
- `src/taskHistory.ts` and `phone/lib/state/sticky_store.dart`: applied plan blocks already become editable steps. Desktop replanning currently identifies replaceable unfinished blocks by generated ID, so manual edits require special care in the planning slice.
- `src/types.ts`, `phone/lib/models/models.dart` and `src/cloudSync.ts`: task completion dates are absent and sync acknowledgement is per record/date, constraining truthful progress/status displays.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="10-1-desktop-workflow"></a>

## 10-1: Desktop Workflow Implementation

**Goal:** Deliver the approved workflow improvements in the desktop source, preserving the small working note and existing task interactions.

### Tasks
- [x] 1. Awareness/retrieval: Earlier tasks cue, original-date Search, concise date semantics and compact sync indicator.
- [x] 2. Planning: remembered window/machines, inline time budgets and breaks, validation and edited-step protection.
- [x] 3. Recurrence: Manual/Daily/Weekdays/Weekly, next occurrence, Pause/Resume/Skip, stable task identity and durable-save acknowledgement.
- [x] 4. Reflection: optional post-focus task review and day/week Progress with separate task/step/session counts.
- [x] 5. Review frontend hierarchy/accessibility and walk through everyday user workflows; fix identified friction.
- [x] 6. Verify TypeScript, production build, Node/native regressions and isolated browser workflows; document behavior and limits.

### Decisions
- Implement desktop first, as announced; Android UI and installed packages are unchanged. No backend deployment or task-data migration is needed.
- Preserve task/subtask sequencing, direct action icons, completion semantics and independent goals. No separate priority system or plan editor.
- Routines use device-local, folder-scoped schedules linked to existing goal IDs. Generated ordinary tasks can sync through the existing account flow. Schedule definitions do not sync; this avoids older phone clients dropping new goal fields. Cross-client schedule editing is follow-on work, not implied parity.
- The desktop's local calendar determines occurrences. Generate only for a fully loaded Today; resume/midnight follows the existing live calendar. Missing days do not create a backlog flood. Weekly uses the weekday when configured. Pause leaves existing tasks intact; Skip next advances only the next ungenerated occurrence. Changing cadence cancels a future skip while retaining today's handled marker.
- Persist a handled marker only after task writes succeed. Retry reuses the stable occurrence ID; corrupt/unreadable schedule data is never silently replaced. Manual selection retains the handled marker, preventing same-day recreation after moving/completing work.
- New plan IDs include an original-text fingerprint. Replanning replaces only untouched todo suggestions for that date. Edited, started, nested, metadata-bearing and legacy generated steps remain; legacy IDs lack evidence to identify original text safely. Undo remains independent of later edits.
- Progress groups current task states by list date. It does not infer completion timestamps. Parent tasks and steps are separate; stopped work is separate from completed work. Focus totals use retained sessions and planned minutes.
- Search/Progress share only in-flight canonical archive reads, report unavailable coverage, bound native waits and render 40 results at a time. They do not mount or fetch on normal startup.
- Sync indicates current acknowledged editor content, not merely the existence of a previous successful run. Edits during/after upload clear the acknowledgement; detailed status and recovery remain in Account.

### UI/UX Review
- Frontend pass: retain the warm note, flat lists, named existing actions and 30px minimum footer targets. At 340×440, production footer stays on one row under normal text and the task viewport measures 338×299px. At enlarged text it wraps without overlaps.
- User pass: Search focuses immediately and opens the original task/step; new plan results scroll into view; a scheduled routine creates one visible task; focus review does not complete the task; history failures do not prevent capture.
- Fixed during review: proposal hidden below expanded planning inputs, duplicate routine pause affordance, raw internal status labels in results, invalid progress-date fallback, and a narrow footer orphaning Settings.
- Supporting snapshots: `output/playwright/workflow-final/` (ignored, fictional data). No actual user task was edited for testing.

### Verification
- TypeScript and Vite production build pass. Existing large-chunk advisory remains; no new dependency was added.
- All 19 Node suites and 36 Rust tests pass, including new archive/recurrence/constraint cases and sync acknowledgement tests.
- Production Chrome checks pass for new workflows, refined shell, task interactions and Focus. Include 340×440, 460×640, 1000×760, 200% text, keyboard/dialog access, save Retry/Undo, stale plans, routine reload/Skip/retry, and graphics fallback.
- Synthetic provider responses validate the UI contract. Live provider behavior, installed WebView/physical-device acceptance and a real-person usability study are not claimed.

<a id="10-2-review-install-and-android"></a>

## 10-2: Review, Install And Android Workflow Parity

**Goal:** Review the desktop additions, install the verified Mac app and deliver a signed Android APK with matching workflows.

### Tasks
- [x] 1. Repeat desktop review and address consequential findings.
- [x] 2. Add Android Search/Progress, planning constraints/edit protection, optional routines, focus review and compact sync status.
- [x] 3. Verify both clients with synthetic workflow, persistence and layout checks.
- [x] 4. Back up the stopped Mac app/state/tasks; install, launch and verify data/signature preservation.
- [x] 5. Build a new same-key Android release; verify/update-test and replace the local delivery APK.
- [x] 6. Update documentation and record UI/UX findings and verification limits.

### Decisions
- User explicitly requests installation and a new APK, then selects matching Android features before building.
- Keep routine definitions local on each device; generated tasks share stable occurrence identities and use existing task sync. Preserve current account consent/keys and unrelated uncommitted work.
- No public release or backend deployment. No clearing user application data.

### Review Findings And Fixes
- Match Android replanning to desktop text fingerprints so synced edited/started/legacy steps survive a new plan. Verify Unicode hashing and occurrence IDs across clients.
- Harden desktop routine dictionaries against inherited entries from unusual goal IDs.
- Fix enlarged-text routine-header and plan-confirmation overflow. Put phone Focus controls before the map and reveal Review task after completion.
- Preserve phone task/goal status semantics; stopped work is not counted as completed in the Notes summary.

### Verification And Delivery
- Desktop: all 19 Node suites, TypeScript and the production workflow browser check pass; optimized native app builds successfully. Install exact signed bundle at `/Applications/Sticky Todo.app`, launch successfully and verify all 56 task files and native config unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-workflow-install-20261030-164552`.
- Android: analyzer clean, all 60 tests pass (plus optional visual captures). Focused sync acknowledgement checks also pass. Review Notes, Search, Progress, Routines, Focus and planning at 360px/normal and enlarged text.
- APK: `release/todo-sticky.apk`, ARM64 release 2.1.15+7, versionCode 2007, 19,491,291 bytes. V2 signature verifies; certificate matches previous release (`1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`). SHA-256: `d429208e548565856bcb4e7c19b28f798de9f6ccc6621ed5c26b459406b1af61`.
- Isolated `Todo_Release_35` emulator update from versionCode 2005 to 2007 succeeds. Notebook bytes/tasks/goals remain unchanged; new workflow controls visible after launch. No physical phone or user account was used in these tests.
- Evidence: `output/workflow-delivery/{macos-verification,apk-verification}.json`, phone-review screenshots, emulator screenshot/UI dump; previous delivered APK retained in the same ignored output folder. No release tags, public distribution or backend changes.
- Native launch/signature/data checks are smoke acceptance; live AI response quality, physical-phone behavior and a real-person usability study remain separate.

<a id="10-3-goals-material"></a>

## 10-3: Goals Material Consistency

**Goal:** Apply the selected note material to Goals and Routines in compact and wide desktop layouts.

### Tasks
- [x] Trace the fixed yellow backgrounds overriding the material.
- [x] Reuse the material surface through a shared CSS property, preserving Paper fallback.
- [x] Verify all three materials at compact/default/wide sizes and inspect screenshots.
- [x] Rebuild/reinstall Mac with backup and data/signature verification.

### Decisions
- Desktop fix in the context of the installed Mac app. Keep the saved material selection and all task/routine behavior.
- Both base and compact Goals background declarations must use the material token; fixing only one selector would leave the other layout incorrect.

### Verification
- Production browser checks pass for Paper/Frosted/Liquid at 340×440, 460×640 and 1000×760; Goals uses the selected background in both compact and wide modes. Existing promotion, keyboard, metadata and persistence checks also pass.
- Visually inspected Liquid compact and Frosted wide screenshots under `output/playwright/goals-material/`. Text, controls and layout remain readable; no extra animation/dependency.
- Rebuilt and installed `/Applications/Sticky Todo.app`; strict signature and exact bundle hashes verify, launch succeeds, all 56 task files and native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-goals-material-install-20261030-234012`. Saved material preferences were retained.
