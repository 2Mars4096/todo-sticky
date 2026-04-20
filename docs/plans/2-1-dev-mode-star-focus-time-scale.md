# 2-1: Dev Mode Star Focus Time Scale

**Parent:** [2-dev-mode-task-debug-panel](2-dev-mode-task-debug-panel.md)
**Status:** completed
**Goal:** Add dev-only Star Focus time-speed controls so the mission track can be inspected without waiting on real-time sessions.

## Tasks
- [x] 1. Extend the shared Star Focus hook with a simulated mission clock that can run slower or faster in development.
- [x] 2. Add compact dev-only controls for switching mission time scale without expanding the production UI.
- [x] 3. Keep the debug behavior non-persistent so production sessions and native Star Focus state stay unchanged.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Mission speed controls stay gated to `import.meta.env.DEV` through the existing dev tray.
- Time-scale changes affect the active mission track and the next launched session, but the selected scale is not persisted into native Star Focus state.
- The current Star Focus model is still mission-track progression, not vehicle construction; a construction metaphor would be a separate follow-up slice.

## Notes
- Frontend changes landed in `src/hooks/useStarFocus.ts`, `src/components/DevToolsPanel.tsx`, `src/App.tsx`, and `src/styles/sticky.css`.
