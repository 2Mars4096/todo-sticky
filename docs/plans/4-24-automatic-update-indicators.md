# 4-24: Automatic Update Indicators

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Discover updates quietly and guide users from Settings to the install action.

## Tasks
- [x] 1. Check on native app startup and every 15 minutes, with overdue focus/visibility/online checks.
- [x] 2. Deduplicate checks, keep automatic errors quiet, and preserve known available updates.
- [x] 3. Show a Settings dot and another beside Download and install or Restart now.
- [x] 4. Verify scheduling, disposal, state transitions, and update-action indicators; add scheduling checks to release CI.

## Decisions
- Installation and restart remain manual; automatic checks never open Settings or interrupt focus.
- A known available update is retained instead of repeatedly rechecking it. Dots persist until the relevant action is taken; opening Settings does not dismiss them.
- Manual checks bypass the 15-minute throttle and retain visible error reporting.
- Resume/online checks observe the same throttle; browser-only previews do not contact the updater.

## Notes
- Controller and hook checks cover launch, cadence, resume, online throttling, clock rollback, concurrent checks, quiet errors, resource cleanup, and manual checks.
- Browser checks verify install/restart indicators and no dot when current.
- Frontend build and existing updater persistence checks pass. Published in v2.1.3.

- 2026-10-08: Shorten the periodic interval and shared resume/online throttle to 15 minutes. Updated scheduling regression, updater lifecycle/persistence checks, and frontend build pass. Cadence change published in v2.1.6.
