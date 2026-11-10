# 15: Project Goals And Multi-Day Planning

**Status:** completed
**Goal:** Treat long-term goals as ongoing projects with attributed work, schedulable steps and reviewable AI planning across days.

## Tasks
- [x] 1. Expose project/goal planning on Mac, including phone-created description/steps, task assignment, linked progress and multi-day proposals; installed in [15-3](15-project-goals-and-multiday-planning.md#15-3-mac-project-planning).
- [x] 2. Android: assign existing tasks to a project, retaining dates/status and related nested work; preserve explicitly different child projects.
- [x] 3. Android: retain existing manual goal-step scheduling and expose linked daily work alongside project steps.
- [x] 4. Android: add multi-day date range, per-project minutes/day and weekdays-only controls, editable proposal dates/text/estimates and explicit apply.
- [x] 5. Android: validate capacity, stale proposals, existing scheduled/assigned work, repeat application and atomic-save retry. Existing deadlines supplied as AI context; full calendar integration remains out of scope.
- [x] 6. Android: review normal/enlarged mobile UI, rebuild signed APK +12 and verify update preservation. See [15-1](15-project-goals-and-multiday-planning.md#15-1-android-project-planning).

## Decisions
- 2026-11-01 clarification: Goals represent project-based long-term work, not merely reminders. Daily tasks and subtasks retain their project attribution; daily completion contributes to project progress without automatically closing the project.
- Android already has goal steps, selected-date scheduling and linked progress. Desktop currently preserves that data but lacks the matching editor. Reuse these contracts rather than creating a second project/task store.
- AI planning belongs at the project level across multiple days, distinct from the current single-day time-block planner. Suggestions must be editable before daily tasks are created; no automatic rescheduling of user commitments.
- Use the offered default: AI can create the breakdown and dates while reusing unscheduled existing steps. Existing scheduled tasks are not rescheduled.
- This is the clarified next scope. The spacing build in plan 14 does not implement these additional project controls.


## Current delivery slice
- User requests minimal changes and specifically asks for the APK. Implement Android project assignment and a multi-day AI proposal inside the existing goal editor; desktop project-editor parity remains a separate follow-up.
- Reuse goal plans, stable goal/task links and atomic notebook saves. No backend/schema changes or second task database.
- Default AI behavior creates a breakdown when useful and reuses unscheduled existing steps. Date range, per-project daily budget and weekdays-only option are local proposal inputs. Users edit/remove proposed tasks, dates and estimates before explicit apply.
- Existing daily work is supplied as planning context; the budget applies to this project's proposed work, not a claim of full calendar availability. Existing scheduled tasks are never moved by a proposal.

## Mac parity — 2026-11-02

The user requests minimal Mac parity, self-explanatory-ui, installation and commit/push. [15-3](15-project-goals-and-multiday-planning.md#15-3-mac-project-planning) implements and installs the matching project editor while retaining the shared data model, ordinary task behavior and selected material.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="15-1-android-project-planning"></a>

## 15-1: Android Project Planning

**Goal:** Deliver project task attribution and reviewable multi-day AI planning in the production APK with minimal UI changes.

### Tasks
- [x] Add Assign to project to the existing task menu and retain distinct child-project links.
- [x] Add Plan across days to the existing goal editor, plus access to linked daily work.
- [x] Validate date ranges, project budget, weekdays, duplicates, existing scheduled IDs and stale work before mutation.
- [x] Apply project steps and all daily tasks in one atomic notebook snapshot; retry save without reapplication.
- [x] Verify normal/150% phone workflows and inspect proposal screenshots.
- [x] Build/verify original-key production APK +12 and deliver it.

### Decisions
- Android is the requested deliverable; desktop project UI remains a separate parent-plan follow-up. No backend changes, new sync fields or new task store.
- Reuse GoalItem.plan, goalId and goalStepId. Project completion stays deliberate; ordinary daily task completion supplies progress.
- Range is limited to 90 days and budget to 15–480 project minutes per day. AI may reuse unscheduled steps or add daily-sized work. Proposal edits/removal happen before Add to daily tasks; generation/Discard never mutate tasks.
- Existing daily work is context for AI. The budget is for the proposed project work, not measured calendar availability. Estimates stay proposal inputs; no new scheduling metadata is persisted.
- Assigned ordinary tasks appear in linked work/Progress. They do not acquire a fabricated plan-step ID. Existing explicit child assignments to another project survive parent assignment.
- No live AI call or real user notebook is used for test fixtures. Provider response quality and physical-device acceptance remain separate from validation/widget checks.

### Verification and delivery
- Flutter analyzer and formatting clean; all 97 tests pass. Dedicated project cases cover assignment, preserved child attribution, constraints, unscheduled ID reuse, stale proposals, duplicate assigned work, provider request context, date/text editing, and save retry.
- Normal/150% real-font screenshots reviewed under `output/project-planning-review/`; inputs, proposal list and fixed apply/discard controls remain usable.
- Original-key ARM64 production APK `release/todo-sticky.apk`, 2.1.15+12 / 2012, 19,753,663 bytes (19.75 MB). Signature and 16 KB alignment verified. SHA-256 `873195bbefd5a60d991f339c6c50387a9ad799e6e95607ac9d3aba8c27f75cba`.
- Dedicated emulator update from +9 to +12 succeeds, preserving synthetic notebook bytes/tasks/goals. No real account or live AI request was used for acceptance; physical-phone/live-provider behavior remains user acceptance.
- Mac installed app is unchanged by this APK-focused slice.

<a id="15-2-minimal-copy-pass"></a>

## 15-2: Self-Explanatory Project UI Pass

**Goal:** Clarify the Android project-planning flow with a single minimal-copy pass.

### Tasks
- [x] Review project actions, proposal controls and consequential messages against self-explanatory-ui.
- [x] Rename goal Generate plan to Suggest steps, label the daily project budget with units in its choices, and replace repeated proposal instruction text with a named edit icon.
- [x] Verify existing project workflows and normal/enlarged layout.
- [x] Rebuild signed APK +13 for the corrected interface.

### Decisions
- Scope is the new Android project/goal flow. No business logic, data model, navigation or desktop changes.
- Preserve Add to daily tasks, Discard, date/minute editor labels, deletion consequences, stale/validation errors and Retry save.
- Edit remains available by tapping the row and through an accessible Edit proposed task button. Remove remains explicit and separately named.

### Verification
- Flutter analyzer clean; all 97 tests pass. Eleven project tests also pass with real-font captures at 360px and normal/150% text. Reviewed proposal layouts and edit/remove affordances; no overflow or hidden primary actions.
- Original-key APK +13 / 2013 delivered at `release/todo-sticky.apk`, 19,753,663 bytes; signature and 16 KB alignment verified. SHA-256 `cede203e83851278106d7f8cec4ef28ae526fa4c44c92c9d8d6c3d3e4b3a4825`.

<a id="15-3-mac-project-planning"></a>

## 15-3: Mac Project Planning

**Goal:** Add the existing Android project workflows to Mac with minimal UI changes, reinstall, then commit and push.

### Tasks
- [x] Add project step editing/suggestions, linked daily work and progress filtering.
- [x] Add task assignment and editable multi-day proposals using the existing goal/task contract.
- [x] Protect stale proposals, duplicate scheduling and partial cross-file saves with explicit recovery.
- [x] Verify compact/material/keyboard flows and review self-explanatory UI.
- [x] Rebuild and reinstall Mac with data backups, including pending sync-efficiency fixes.
- [x] Commit coherent batches and push, preserving the existing Android work.

### Decisions
- Reuse the current Goals panel, center-page pattern, goalId/goalStepId and provider configuration. No new backend schema or second task store.
- Project completion stays manual. Existing scheduled tasks are opened rather than rescheduled.
- Desktop date files and goal state are separate stores: persist a recoverable operation journal and use native compare-before-write/backups, rather than claiming cross-file atomicity.
- Follow self-explanatory-ui: named actions, inline inputs, accessible icons, no standing instructional paragraphs. Show consequences only for removal/recovery choices.

### Delivery and review
- Long-term titles open the project page directly. Existing phone-created goal text/paragraphs and plan steps render without recreation. Project editing, unscheduled-step selection, dated task links, optional suggestions and editable multi-day proposals share the existing contract.
- Selected daily tasks expose a compact Project selector; explicit different child projects survive assignment. Progress filters project work and labels lifetime plan totals separately from dated task counts. Global focus totals are omitted under a project filter.
- Apply validates the current goal and canonical archive before journaling. Goal state saves first, followed by native compare-before-write/backed-up dates. Interrupted responses/retries skip already-written dates; Discard remaining preserves saved tasks and steps. No cross-file atomicity claim.
- AI reads only project work and relevant date-range context (bounded to 500 rows), not the unrelated full archive. Leaving a request does not save its late response.
- Reviewed liquid-material layouts at 340/460/1000px and enlarged text. Minimal-copy pass removes redundant explanations, preserves accessible labels, makes title opening direct, marks completed steps clearly, and retains removal/recovery consequences.
- Checks pass: 22 Node suites, TypeScript, 40 native tests, production project workflows (including partial failure/retry), paragraph editing and materials/promotion. Existing Android formatting/analyzer and 100 tests also pass.
- Installed exact signed Mac bundle and launched successfully; all 56 task files/native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-mac-projects-install-20261102-090034`. This installation also includes the pending sync-efficiency changes from plan 16. No Android APK rebuild or backend deployment was needed.
- Native AI transport is compiled and proposal validation uses synthetic responses; live model quality and physical user acceptance remain separate.

### Publication

- `6b7e2a79` — feat: refine Android project planning and task controls
- `1d334ed6` — perf: reduce redundant sync work and resume after editing
- `3572b9f3` — feat: bring shared project details and planning to Mac
- `f78ea29d` — docs: record Mac project parity and verified installation

Source batches pushed to origin/main and remote verified at `f78ea29d`; this documentation-only completion receipt follows. No generated/private artifacts included.

<a id="15-4-project-editing-review"></a>

## 15-4: Convenient Project Editing And Review

**Goal:** Make description, step and scheduled-work revision consistent and easy without adding a new workflow.

### Tasks
- [x] Review editing, proposal review, scheduled-task navigation and cancellation.
- [x] Use one inline Save/Cancel pattern with keyboard shortcuts and stale-edit protection.
- [x] Allow scheduled task text/work-date revision inside the project, preserving status/deadline/links; provide direct return from full daily-task review.
- [x] Verify edit/cancel/retry and compact layouts, reinstall Mac and record delivery.

### Decisions
- Apply self-explanatory-ui. Keep AI proposals directly editable and explicit Apply/Discard; keep consequential removal warnings.
- Inline scheduled text/work-date revision edits the actual daily task, not a duplicate plan record. Status/deadline edits stay on its full daily view. Root date moves save destination before source removal, reject collisions and use the existing recovery journal.

### Review findings and corrections
- Step editing lacked Cancel and Escape could leave the project. Description and step editors now share Save/Cancel, Cmd/Ctrl+Enter, Escape and focus restoration.
- Scheduled text revision required leaving the project. Its date row now offers an inline editor for actual task text and root work date; status, deadline, nested content and goal linkage remain intact.
- The daily task lacked a direct return path. Review navigation now exposes a compact Project return button in the existing date-header row.
- Edits now retain their original goal/task snapshot; incoming changes are rejected instead of overwritten. Cancel after a stale-edit error refreshes the latest work.
- Switching pages or editors with a changed draft keeps it visible and requests Save/Cancel inline. No additional confirmation modal is introduced. Pending native writes use the existing explicit recovery controls rather than letting newer text diverge from a saved journal.
- AI proposals stay directly editable with existing Apply/Discard. No new planning menu or extra approval step.

### Verification
- 22 Node suites, TypeScript/build and the production project browser suite pass. New cases cover description/step cancel, keyboard save, inline scheduled text/date changes, preserved completion/deadline/children, stale external edits, unsaved navigation and return-to-project.
- Screenshots reviewed at compact/default/wide sizes and enlarged text under ignored `output/project-edit-review/`.

- Rebuilt and installed the exact signed Mac bundle. Launch succeeds; all 56 task files/native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-project-edit-review-install-20261102-151302`. Android and backend unchanged.
