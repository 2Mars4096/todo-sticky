# 4-45: README and demo refresh

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Document the current interface with reproducible GIFs containing only fictional tasks.

## Tasks
- [x] 1. Review existing demo scenarios and current source behavior.
- [x] 2. Capture daily tasks, AI steps, tomorrow moves and day planning.
- [x] 3. Capture outcomes/due dates, Focus, and compact goals/settings.
- [x] 4. Refresh README, inspect media and verify links.

## Decisions
- Use the production frontend with the isolated browser fixture; never seed the real task archive.
- AI responses are deterministic samples, disclosed beside the demos.
- Keep original demo.gif/demo.mp4 paths and add focused GIFs.
- HyperFrames guidance reviewed; direct browser recordings suit these documentation demos. Usage lookup returned unknown.

## Validation
- Production frontend build passes; recorder completes all five interaction sequences without uncaught page errors.
- Exported frames visually reviewed for text, dialogs, full footer and Focus map; all GIFs are 600 × 720 and README media links resolve.
- JavaScript syntax and `git diff --check` pass. Native behavior is outside these browser-only recordings.
