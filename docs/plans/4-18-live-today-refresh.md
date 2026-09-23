# 4-18: Live Today Refresh

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Keep the Today marker accurate across midnight and app resume.

## Tasks
- [x] 1. Identify why an idle window retains the previous day's Today marker.
- [x] 2. Refresh the local date at midnight and on focus, visibility, and page restoration.
- [x] 3. Verify rollover, resume, navigation, clock corrections, and listener cleanup; build the frontend.

- [x] 4. Rebuild and reinstall the fix; prepare the scoped commit for the user-authorized push.

## Decisions
- Preserve the selected date and its tasks; show Go to today once that date is no longer today.
- Schedule against local midnight with a one-minute maximum interval to catch clock/timezone changes and missed resume events.
- Remove the timer and all listeners on unmount, including React StrictMode cleanup.

## Notes
- Validation: `node tests/calendar-rollover.cjs` and `npm run build:frontend`.
- User requested desktop reinstall and commit/push after the source fix.
- Release: version 2.0.4 rebuilt, signature/checksum verified, installed, and relaunched from `/Applications/Sticky Todo.app`. Rollback: `/private/tmp/sticky-todo-before-calendar-v6swr4_0/Sticky Todo.app`.
