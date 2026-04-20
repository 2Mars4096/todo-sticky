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
