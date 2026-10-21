# 4-41-2: Outcome / Due Presentation

**Parent:** [4-41-finish-promises](4-41-finish-promises.md)
**Status:** completed
**Goal:** Present finish metadata consistently in two stable inline rows.

## Tasks
- [x] Use Outcome / Due labels with fixed label/value alignment in display and edit states.
- [x] Single-click selects; double-click or Enter edits the title.
- [x] Show grey suggestions and No date on selection; hide unsaved metadata when unselected.
- [x] Keep Tab acceptance, typing/clearing, explicit review and persistent deadlines.
- [x] Verify browser interactions, dates, build and locally reinstall.

## Decisions
- Selecting a task can request an ephemeral outcome suggestion using the configured provider; manual editing remains independent.
- Saved Outcome / Due rows remain visible when unselected. Date labels use Today, N days overdue, or weekday/month/day without redundant By/Due text.

## Verification
- TypeScript and date-boundary tests pass. Both browser finish suites pass, including single-click selection, double-click title editing, suggestion overwrite/clear/Tab, hiding unaccepted metadata, review and carry-forward persistence.
- Inspected 350px selected-row screenshot; Outcome / Due align consistently.
- Optimized app installed and launched; strict signature and exact bundle hashes verified, all 56 task-file hashes unchanged.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-outcome-due-l1es1k83/Sticky Todo.app`. Remains on feature/finish-promises; no main merge.
