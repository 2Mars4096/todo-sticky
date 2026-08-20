# 4-14: Task And Subtask Reordering

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Let users directly reorder a day's tasks and the current-day subtasks within each task while preserving Markdown order.

## Tasks

- [x] 1. Add a visible, compact drag handle to editable task and subtask rows.
- [x] 2. Reorder top-level tasks without separating them from their subtasks.
- [x] 3. Constrain subtask reordering to the current parent task.
- [x] 4. Persist the resulting array order through the existing debounced Markdown save path.
- [x] 5. Add keyboard Arrow Up and Arrow Down reordering from the focused handle.
- [x] 6. Verify the production build, rendered compact layout, pointer drag, keyboard movement, and saved payload.
- [x] 7. Build, signature-check, install, and relaunch the macOS application bundle.

## Decisions

- Use the existing task-array order as the source of truth, so no Markdown schema or native command changes are needed.
- Dragging a top-level task carries its complete current-day subtask group with it.
- Subtasks cannot be dragged into another task or mixed with read-only subtasks from other dates.
- Keep the handle visible at low emphasis and show a precise insertion rule during a drag.

## Notes

- `npm run build:frontend` passes.
- Isolated Playwright verification at `460x640` confirmed top-level pointer reordering, subtask Arrow Up reordering, and the matching debounced save payload without reading or writing the real task archive.
- Installed version `2.0.4` at `/Applications/Sticky Todo.app`; strict signature verification passes, the installed GUI checksum matches the release bundle, and the `todo-sticky` process remains running after relaunch.
- The previous installation is recoverable at `/private/tmp/Sticky Todo.previous-before-task-reorder.app`.
