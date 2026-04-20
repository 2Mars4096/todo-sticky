# 1-6: Star Focus Compact Layout And Overlay Polish

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the compact sticky-note window and the new Tracking Station overlay feel intentional rather than merely workable.

## Tasks
- [x] 1. Reassess the remaining compact-window pressure now that Star Focus defaults to a collapsed rail:
  decide whether the left goals rail, the Tauri default window width, or both need follow-up changes.
- [x] 2. Refine overlay entry/exit behavior for key states such as restored sessions, session completion, and armed-but-not-launched tasks.
- [x] 3. Improve overlay archive and CTA clarity without expanding Star Focus beyond the current local-only v1 scope.
- [x] 4. Re-run frontend and native verification after the compact/layout polish lands.

## Decisions
- Keep the Tauri default window at `380x560` for now; the next compact fix should be rail coordination, not a wider default shell.
- New users now start with both the left goals rail and the right Mission Control rail collapsed.
- In compact window widths, expanding one side rail should auto-collapse the other so the center sticky-task column remains viable.
- Restored active sessions auto-open Tracking Station once when Mission Control is collapsed so the live session is visible after reload.
- Mission completion stays user-invoked:
  finishing a session should not pop Tracking Station over the sticky list unless the overlay is already open.
- Tracking Station should explain why it opened and what it retains through explicit armed/restored/completed banners and local archive-retention copy.

## Notes
- This plan starts from the overlay shell delivered in [1-5-star-focus-tracking-station-overlay-shell](1-5-star-focus-tracking-station-overlay-shell.md).
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/App.tsx`, `src/hooks/useGoals.ts`, `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.
