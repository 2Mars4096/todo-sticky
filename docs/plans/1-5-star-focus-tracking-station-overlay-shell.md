# 1-5: Star Focus Tracking Station Overlay Shell

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add the first expanded Tracking Station surface while keeping the right Mission Control rail as Star Focus's quick-control entry point.

## Tasks
- [x] 1. Add a Tracking Station trigger from Mission Control, including an entry path when the rail is collapsed.
- [x] 2. Build the first expanded overlay shell with larger starmap, mirrored session controls, full local mission archive, and maintenance actions.
- [x] 3. Tighten the compact baseline so new Star Focus state does not assume the full right rail stays open inside the default sticky-note window.
- [x] 4. Re-run frontend and native verification after the new overlay shell lands.

## Decisions
- Tracking Station is an in-app modal overlay, not a separate Tauri window.
- The right rail remains the fast-control entry surface; the overlay mirrors the critical launch/live/archive controls instead of replacing the rail entirely.
- New Star Focus state should default to a collapsed right rail so the center sticky-task column remains usable in narrow windows.
- Focus selection can open Tracking Station directly when the rail is collapsed so the compact default does not hide the launch path.

## Notes
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/components/TrackingStationOverlay.tsx`, `src/components/MissionControlSidebar.tsx`, `src/App.tsx`, `src/hooks/useStarFocus.ts`, `src/styles/sticky.css`, and `src-tauri/src/config.rs`.

