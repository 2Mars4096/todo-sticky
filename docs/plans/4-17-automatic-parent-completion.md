# 4-17: Automatic Parent Completion

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Complete a parent automatically when its last unfinished current-day subtask is marked done.

## Tasks
- [x] 1. Update subtask toggling to persist parent completion in the same save.
- [x] 2. Verify completion, incomplete siblings, historical steps, and manual status behavior.
- [x] 3. Build, reinstall, and commit the change.
- [ ] 4. Push to `origin/main` after destination-specific approval.

## Decisions
- Evaluate the selected date's editable subtasks, matching the existing per-date Markdown persistence model.
- Trigger only when a subtask is marked done; preserve existing manual parent status and reopening behavior.
- Leave historical archives and agent API semantics unchanged.

## Notes
- Existing uncommitted layout and maintenance work is preserved separately from this commit.
- Validation: `node tests/task-completion.cjs` passes nine hook/persistence scenarios; `npm run build:frontend` passes.
- Release: rebuilt and reinstalled version 2.0.4; verified bundle signature, executable checksum, and running installed process. Rollback bundle: `/private/tmp/sticky-todo-before-completion-3m3r651f/Sticky Todo.app`.
- Push blocked by automatic approval review: explicit authorization for `git@github.com:2Mars4096/todo-sticky.git` on `main` is required.
