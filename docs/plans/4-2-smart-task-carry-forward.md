# 4-2: Smart Task Carry-Forward

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make the task arrow carry stale work to today while preserving next-day movement for current and future task dates.

## Tasks

- [x] 1. Lock the date-target behavior and copy for past, current, and future selected dates.
- [x] 2. Centralize carry-forward target resolution so the action label and native move use the same rule.
- [x] 3. Update task and subtask arrow labels plus success/error feedback.
- [x] 4. Run frontend and type verification, then sync tracking and user-facing docs.

## Decisions

- A past selected date moves directly to the user's local today.
- Today moves to tomorrow.
- A future selected date moves to the day after that selected date, never backward to real-world tomorrow.
- Keep the familiar arrow icon, but make its tooltip and accessible name state the resolved destination.

## Notes

- The previous action always added one day to the selected date, so stale work could remain stale after several clicks.
- `src/taskCarryForward.ts` now owns the destination rule used by `useTasks`, task/subtask labels, and App feedback.
- Verification: `npm run build:frontend`; focused TypeScript compilation plus four fixed-date assertions covering past, today, future, and month-boundary movement.
- Repository-wide `tsc --noEmit` remains blocked by pre-existing Star Focus typing errors recorded in `docs/bugs.md`.
