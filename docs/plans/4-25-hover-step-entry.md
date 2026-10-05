# 4-25: Hover Step Entry

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Keep idle step entry quiet while preserving immediate pointer and keyboard access.

## Tasks
- [x] 1. Hide the empty input text and border until its row is hovered on fine-pointer devices.
- [x] 2. Reveal on keyboard focus or plus activation and keep nonempty drafts visible.
- [x] 3. Preserve the transparent background, layout, hit area, and touch-device visibility.
- [x] 4. Verify idle, hover, focus, plus, draft, and Escape states at 340px and 460px.

## Decisions
- Use opacity rather than removing the input: retain its hit area, tab order, and row height.
- Hover-to-reveal applies only when hover and a fine pointer are supported; other devices show the field.
- Keep text visible while focused or while a draft exists, so pointer movement does not hide work.

## Notes
- Real browser interaction checks and frontend build pass. Published in v2.1.3.
