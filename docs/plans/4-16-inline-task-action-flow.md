# 4-16: Inline Task Action Flow

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Pack task actions into the unused space after the final text line and wrap the action group only when it cannot fit.

## Tasks

- [x] 1. Put task text, date context, and the action group into one shared inline-flow cell.
- [x] 2. Keep the complete icon group atomic so individual actions never split across lines.
- [x] 3. Preserve click-to-edit plus keyboard activation after changing the task-text element.
- [x] 4. Keep editing, status, drag, subtask indentation, and add-step alignment stable.
- [x] 5. Verify short, medium, long, and editing states at compact app widths.
- [x] 6. Build, install, and relaunch the macOS application.
- [x] 7. Right-align the atomic action group while preserving final-line packing and fallback wrapping.
- [x] 8. Build, reinstall, and relaunch the right-aligned follow-up.

- [x] 9. Extend blank-space click-to-edit through the text cell and stretch the editor to the right-side action group.

## Decisions

- The drag handle and checkbox remain fixed flex columns; only the text/action cell uses inline flow.
- The icon group follows the final text fragment when space permits and stays pinned to the right edge whether inline or wrapped.
- Do not clamp or truncate task text.

## Notes

- This replaces the compact rule that reserved a full second action row and right-aligned a small icon group inside it.
- Browser checks at `460px` and the `340px` minimum confirmed inline final-line packing, atomic fallback wrapping, exact text-column alignment after wrapping, and keyboard entry into edit mode.
- `npm run build:frontend` and `git diff --check` pass.
- Built, ad-hoc signed, checksum-matched, installed, and relaunched version `2.0.4`; the prior app remains at `/private/tmp/Sticky Todo.previous-before-inline-actions.app`.
- Follow-up browser measurements at `460px` and `340px` confirm every action group is flush with the content cell's right edge, remains contained, and follows the final text line without splitting; edit mode remains intact.
- Rebuilt, signature-verified, checksum-matched, installed, and relaunched version `2.0.4`; the pre-follow-up bundle remains at `/private/tmp/Sticky Todo.previous-before-right-aligned-actions.app`.

- 2026-10-03: Frontend build and diff checks pass. Isolated real-component browser checks at 340px and 460px verify task/subtask blank-space clicks, editor/button boundaries, Enter/Escape, independent action clicks, wrapped titles, and read-only rows. Source change only; installed native app was not rebuilt in this pass.
