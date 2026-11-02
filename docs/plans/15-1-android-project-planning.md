# 15-1: Android Project Planning

**Parent:** [15-project-goals-and-multiday-planning](15-project-goals-and-multiday-planning.md)
**Status:** completed
**Goal:** Deliver project task attribution and reviewable multi-day AI planning in the production APK with minimal UI changes.

## Tasks
- [x] Add Assign to project to the existing task menu and retain distinct child-project links.
- [x] Add Plan across days to the existing goal editor, plus access to linked daily work.
- [x] Validate date ranges, project budget, weekdays, duplicates, existing scheduled IDs and stale work before mutation.
- [x] Apply project steps and all daily tasks in one atomic notebook snapshot; retry save without reapplication.
- [x] Verify normal/150% phone workflows and inspect proposal screenshots.
- [x] Build/verify original-key production APK +12 and deliver it.

## Decisions
- Android is the requested deliverable; desktop project UI remains a separate parent-plan follow-up. No backend changes, new sync fields or new task store.
- Reuse GoalItem.plan, goalId and goalStepId. Project completion stays deliberate; ordinary daily task completion supplies progress.
- Range is limited to 90 days and budget to 15–480 project minutes per day. AI may reuse unscheduled steps or add daily-sized work. Proposal edits/removal happen before Add to daily tasks; generation/Discard never mutate tasks.
- Existing daily work is context for AI. The budget is for the proposed project work, not measured calendar availability. Estimates stay proposal inputs; no new scheduling metadata is persisted.
- Assigned ordinary tasks appear in linked work/Progress. They do not acquire a fabricated plan-step ID. Existing explicit child assignments to another project survive parent assignment.
- No live AI call or real user notebook is used for test fixtures. Provider response quality and physical-device acceptance remain separate from validation/widget checks.

## Verification and delivery
- Flutter analyzer and formatting clean; all 97 tests pass. Dedicated project cases cover assignment, preserved child attribution, constraints, unscheduled ID reuse, stale proposals, duplicate assigned work, provider request context, date/text editing, and save retry.
- Normal/150% real-font screenshots reviewed under `output/project-planning-review/`; inputs, proposal list and fixed apply/discard controls remain usable.
- Original-key ARM64 production APK `release/todo-sticky.apk`, 2.1.15+12 / 2012, 19,753,663 bytes (19.75 MB). Signature and 16 KB alignment verified. SHA-256 `873195bbefd5a60d991f339c6c50387a9ad799e6e95607ac9d3aba8c27f75cba`.
- Dedicated emulator update from +9 to +12 succeeds, preserving synthetic notebook bytes/tasks/goals. No real account or live AI request was used for acceptance; physical-phone/live-provider behavior remains user acceptance.
- Mac installed app is unchanged by this APK-focused slice.
