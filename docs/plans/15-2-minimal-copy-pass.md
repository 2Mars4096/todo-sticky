# 15-2: Self-Explanatory Project UI Pass

**Parent:** [15-project-goals-and-multiday-planning](15-project-goals-and-multiday-planning.md)
**Status:** completed
**Goal:** Clarify the Android project-planning flow with a single minimal-copy pass.

## Tasks
- [x] Review project actions, proposal controls and consequential messages against self-explanatory-ui.
- [x] Rename goal Generate plan to Suggest steps, label the daily project budget with units in its choices, and replace repeated proposal instruction text with a named edit icon.
- [x] Verify existing project workflows and normal/enlarged layout.
- [x] Rebuild signed APK +13 for the corrected interface.

## Decisions
- Scope is the new Android project/goal flow. No business logic, data model, navigation or desktop changes.
- Preserve Add to daily tasks, Discard, date/minute editor labels, deletion consequences, stale/validation errors and Retry save.
- Edit remains available by tapping the row and through an accessible Edit proposed task button. Remove remains explicit and separately named.

## Verification
- Flutter analyzer clean; all 97 tests pass. Eleven project tests also pass with real-font captures at 360px and normal/150% text. Reviewed proposal layouts and edit/remove affordances; no overflow or hidden primary actions.
- Original-key APK +13 / 2013 delivered at `release/todo-sticky.apk`, 19,753,663 bytes; signature and 16 KB alignment verified. SHA-256 `cede203e83851278106d7f8cec4ef28ae526fa4c44c92c9d8d6c3d3e4b3a4825`.
