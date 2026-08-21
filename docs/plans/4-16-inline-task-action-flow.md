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

## Decisions

- The drag handle and checkbox remain fixed flex columns; only the text/action cell uses inline flow.
- The icon group follows the final text fragment when space permits and wraps as one left-aligned unit when it does not.
- Do not clamp or truncate task text.

## Notes

- This replaces the compact rule that reserved a full second action row and right-aligned a small icon group inside it.
- Browser checks at `460px` and the `340px` minimum confirmed inline final-line packing, atomic fallback wrapping, exact text-column alignment after wrapping, and keyboard entry into edit mode.
- `npm run build:frontend` and `git diff --check` pass.
- Built, ad-hoc signed, checksum-matched, installed, and relaunched version `2.0.4`; the prior app remains at `/private/tmp/Sticky Todo.previous-before-inline-actions.app`.
