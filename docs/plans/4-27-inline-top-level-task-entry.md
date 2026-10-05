# 4-27: Inline Top-Level Task Entry

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Add a compact new-task box below the existing task list.

## Tasks
- [x] 1. Add an inline variant of the task composer and connect it to top-level task creation.
- [x] 2. Match the step field’s transparent fill, thin border, and plus-button alignment.
- [x] 3. Support Enter/plus submission, continued entry, Escape cancellation, and loading/error disabling.
- [x] 4. Build the frontend and update usage and tracking docs.

## Decisions
- Reveal the empty field on hover or focus, preserve visible drafts and touch access, and label it Add task to distinguish it from the per-parent Add step row.
- Retain the existing top composer and empty-state flow; show the additional field after a nonempty list.
- Reuse the existing addTask callback, preserving selected-date storage behavior.

## Notes
- Frontend production build passes. Full TypeScript checking reports existing errors in Star Focus modules; no errors reference the changed components.
- Desktop visual and interaction checks have not been run. This change has not been published or installed.
