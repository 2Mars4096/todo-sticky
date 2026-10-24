# 4-51: Review Reliability Fixes

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Preserve accepted edits and saved goal data through asynchronous moves, storage faults, and native-listener lifecycle changes.

## Tasks

- [x] 1. Reproduce the stale carry-forward snapshot overwriting a capture accepted while the destination write is pending.
- [x] 2. Commit source removal against current task state after destination success; preserve conflicting edits, wait before navigation, and retain source-cleanup retry.
- [x] 3. Release a native file listener even when registration completes after cleanup; handle registration failure.
- [x] 4. Preserve exact unreadable goal bytes before replacement, retain readable goal items, and show recovery/save notices.
- [x] 5. Reopen closed destination parents when a new unfinished moved step arrives; preserve duplicate and finished-step behavior.
- [x] 6. Keep outcome suggestions from blurring and closing their editor when a request starts.
- [x] 7. Run Node regression suites, TypeScript, and production build.
- [x] 8. Run the production task-interaction browser regression, including the reproduced outcome-focus case.
- [x] 9. Run the added native moved-step tests after integration.

## Decisions

- Core capture and unrelated task edits remain available during a move. The move snapshots the selected task after pending writes drain, then deletes only an unchanged source after the destination succeeds.
- If the selected task changes during the native request, keep its new local version and the copied older destination version, with a specific explanation. A failed source cleanup retains Retry save and does not dispatch again.
- Goal recovery copies use `todo-sticky-goals-v1-recovery-<timestamp>` (with a collision suffix when needed). Failed backup or unreadable storage never replaces the original saved value.
- Moving an unfinished step follows manual Add step semantics: closed parents become partial and outcome review is cleared. A duplicate or completed/stopped step does not reopen a parent.
- Suggest outcome stays focusable while busy and exposes `aria-disabled`; its existing request guard prevents duplicate requests.

## Verification

- All 13 Node regression suites pass, including actual-source hook tests for pending-move captures, edit conflicts, destination/source failures, navigation drains, late listener registration, unreadable goals and failed recovery-copy writes.
- Full TypeScript checking and production Vite build pass. The existing lazy Focus 3D chunk still produces the size advisory.
- The existing outcome-interaction regression reproduced on both the base task UI and this worktree before the focus fix. After the fix the production suite passes: selection, outcome suggestions while typing, blur/Enter/Escape, due dates, IME title input, step add/reorder, 340/460px layout and reload persistence.
- These changes do not publish a version or install an app.

- Integrated main validation: all 14 Node regression suites and all 33 native Rust library tests pass.
