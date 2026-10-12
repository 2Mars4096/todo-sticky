# 4-33: Completion And Cumulative Rollover

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Complete whole task trees and keep unfinished past work visible on Today behind an aligned horizontal disclosure bar.

## Tasks
- [x] 1. Cascade parent completion through editable descendants and keep reopened parents consistent.
- [x] 2. Project unfinished earlier dates into Today without duplicating or migrating stored tasks.
- [x] 3. Preserve original dates, IDs, completed archive rows, and Diane receipt keys when editing carried work.
- [x] 4. Add a flat collapsible bar and origin labels, keeping ordinary row alignment.
- [x] 5. Follow Today across midnight/resume, flush pending saves, and reject stale loads.
- [x] 6. Handle unavailable archives without suppressing readable work.
- [x] 7. Verify completion, rollover/persistence, browser layout, and native extraction; update tracking docs.

## Decisions
- Automatic rollover is a Today projection over original Markdown sections. Completed roots stop carrying; older dates remain available through the calendar.
- Labels use “From yesterday” and otherwise the full original ISO date, avoiding year ambiguity.
- Existing historical “All” subtasks remain read-only context, separate from the editable task tree.
- Reordering persists within original dates. The shared bar defaults expanded; no cards or extra indentation.
- Explicitly browsed dates remain selected at midnight; an open Today view advances.
- No release, installation, or real-task data migration in this change.

## Notes
- Passed: frontend build; task-completion, task-rollover, calendar-rollover, update-persistence; narrow browser alignment/disclosure/edit/complete/delete/reload checks; 25 native unit tests.
- Full TypeScript check retains 16 existing Star Focus errors, with no errors in changed modules.
- Browser fixtures use localStorage and API stubs, never the user's task archive.
