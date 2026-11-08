# 4-53: Consistent Footer Control Shape

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Give Goals and its neighboring footer buttons one explicit rounded-rectangle shape without a native macOS bezel.

## Tasks
- [x] Inspect the Goals markup, shared footer styles and screenshot.
- [x] Remove native button appearance and retain consistent 4px corners and keyboard focus styling.
- [x] Visually verify WebKit and Chrome at compact sizes, including keyboard focus.
- [x] Rebuild/reinstall the Mac app with data and rollback verification.

## Decisions
- Use the existing footer's 4px rounded rectangle, not a capsule. Apply the native-appearance reset to all footer buttons so neighboring controls match.
- Keep labels, hit areas and visible keyboard focus. No task/sync behavior, Android build or new public release is part of this narrow visual correction.

## Notes
- Existing `.action-bar button` defines 4px corners, but leaves native appearance enabled; macOS/WebKit can paint its own bezel inside the custom border.
- WebKit/Chrome at 340/460px now report `appearance: none`, one 4px border shape and no native shadow. Actual keyboard input preserves a visible solid focus outline. Screenshots were reviewed under ignored `output/playwright/footer-shape/`.
- Final combined Mac build installed and verified with tasks/config unchanged; delivery and rollback are recorded in [4-54](4-54-text-emphasis-consistency.md).
