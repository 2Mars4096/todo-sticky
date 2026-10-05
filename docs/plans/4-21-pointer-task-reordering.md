# 4-21: Pointer Task Reordering

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Replace unreliable native HTML dragging with captured pointer gestures and explicit keyboard focus.

## Tasks
- [x] 1. Trace the existing drag handles, order mutation, and persistence path.
- [x] 2. Use captured pointer events with a movement threshold, insertion markers, edge scrolling on movement, and cancel handling.
- [x] 3. Explicitly focus clicked handles for Arrow Up/Down reordering.
- [x] 4. Verify actual mouse movement and persistence payloads at 340px and 460px.
- [x] 5. Document the remaining desktop verification boundary.

## Decisions
- Start dragging after four pixels of motion. Pointer capture keeps events attached to the handle when the pointer leaves it.
- Keep parent groups intact and restrict step movement to the current parent.
- Escape, pointer cancellation, or lost capture clears the pending move. Release outside the list cancels.
- Keep the existing Markdown persistence path; no storage schema change.

## Notes
- User reports the installed HTML drag handles do not work. The exact macOS runtime cause remains unconfirmed; code presence and earlier browser tests were insufficient evidence of installed behavior.
- Isolated Playwright checks exercise real mouse movement, click then Arrow Up, step dragging, saved parent/step order, preserved children, cross-parent rejection, and Escape cancellation at both widths. Real task files are untouched.
- Frontend build and native check pass. Full TypeScript checking still reports the previously documented Star Focus errors, with no errors in the changed task components.
- Changes are source-only and unpublished. Installed macOS pointer behavior still requires a rebuilt app and desktop verification.
