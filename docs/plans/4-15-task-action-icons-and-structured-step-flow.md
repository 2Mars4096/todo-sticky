# 4-15: Task Action Icons And Structured Step Flow

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make task actions compact and consistent while preserving parent-child structure when copying, focusing, or carrying a step forward.

## Tasks

- [x] 1. Replace text actions with a consistent icon-only set and keep Focus last.
- [x] 2. Give subtasks Copy, Focus, Delete, and Push actions.
- [x] 3. Move the manual add-step control below the task group while keeping it aligned with the parent checkbox.
- [x] 4. Copy a parent with all current steps and a selected step with its parent context.
- [x] 5. Merge carried subtasks beneath their parent on the destination date.
- [x] 6. Add native regression coverage and verify compact rendered behavior.
- [x] 7. Build, install, and relaunch the macOS application.

## Decisions

- Use one 20px icon-button vocabulary with tooltips and accessible names; action order is Breakdown, Copy, Delete, Push, Focus for parent tasks and Copy, Delete, Push, Focus for subtasks.
- Keep Focus last as the terminal handoff action.
- Keep the add-step button outside the trailing action strip and vertically aligned to the parent checkbox regardless of subtask count.
- Treat the parent task text as the merge key when carrying individual subtasks across dates, matching the app's existing cross-date aggregation model.

## Notes

- The requested screenshot shows repeated `Prompt` text consuming most of the narrow action strip; the icon pass should restore task-text space without hiding essential actions.
- `npm run build:frontend` passes, and all 21 native library tests pass.
- Isolated Playwright verification at `460x640` confirms icon order and accessible labels, subtask Focus handoff, hierarchy-aware clipboard content, parent-aware push payloads, and exact add-button/checkbox alignment at `x=70px`.
- Installed version `2.0.4` at `/Applications/Sticky Todo.app`; strict signature verification passes, the installed executable checksum matches the verified bundle, and the GUI process remains running after relaunch.
- The prior installation is recoverable at `/private/tmp/Sticky Todo.previous-before-action-icons.app`.
