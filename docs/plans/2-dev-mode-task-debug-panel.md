# 2: Dev Mode Task Debug Panel

**Status:** completed
**Goal:** Add a development-only debug surface for quickly seeding, clearing, and reloading tasks during local testing.

## Tasks
- [x] 1. Add task-hook helpers for seeding sample tasks and clearing the current day quickly.
- [x] 2. Add a dev-only panel to the app shell that exposes the debug actions without affecting production UX.
- [x] 3. Keep the dev controls small and local to the action area instead of expanding the settings surface.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The debug surface is gated to `import.meta.env.DEV`, so it only appears in development builds.
- The first dev mode slice focuses on task debugging: single sample task, sample pack, clear day, and reload.
- Debug controls stay inline with the sticky task surface instead of becoming a permanent app setting or production feature.

## Notes
- Frontend changes landed in `src/hooks/useTasks.ts`, `src/components/DevToolsPanel.tsx`, `src/App.tsx`, and `src/styles/sticky.css`.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="2-1-dev-mode-star-focus-time-scale"></a>

## 2-1: Dev Mode Star Focus Time Scale

**Goal:** Add dev-only Star Focus time-speed controls so the mission track can be inspected without waiting on real-time sessions.

### Tasks
- [x] 1. Extend the shared Star Focus hook with a simulated mission clock that can run slower or faster in development.
- [x] 2. Add compact dev-only controls for switching mission time scale without expanding the production UI.
- [x] 3. Keep the debug behavior non-persistent so production sessions and native Star Focus state stay unchanged.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Mission speed controls stay gated to `import.meta.env.DEV` through the existing dev tray.
- Time-scale changes affect the active mission track and the next launched session, but the selected scale is not persisted into native Star Focus state.
- The current Star Focus model is still mission-track progression, not vehicle construction; a construction metaphor would be a separate follow-up slice.

### Notes
- Frontend changes landed in `src/hooks/useStarFocus.ts`, `src/components/DevToolsPanel.tsx`, `src/App.tsx`, and `src/styles/sticky.css`.
