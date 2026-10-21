# 4-37: Backlog Cleanup

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Clear the accumulated carried backlog by marking previous tasks done at the user's request.

## Tasks
- [x] 1. Inspect canonical past dates and preserve today's work.
- [x] 2. Back up all 27 affected weekly files before editing.
- [x] 3. Mark 303 unfinished task nodes done using revision-checked API edits.
- [x] 4. Verify zero unfinished nodes before 2026-10-12, unchanged text/IDs, and unchanged current/future statuses.

## Decisions
- “Previous tasks” means dates before 2026-10-12.
- Completed 224 unfinished parent tasks, plus remaining unfinished descendants (303 status changes total across 87 dates).
- Retained full-file backups and an ID/status audit manifest under the knowledge base's `.sticky-todo-backups/complete-before-2026-10-12-174542` directory.
- No application code or release changes.
