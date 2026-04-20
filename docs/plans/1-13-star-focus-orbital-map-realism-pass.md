# 1-13: Star Focus Orbital Map Realism Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Replace the placeholder-feeling orbital map with a more credible mission-telemetry scene that makes completed focus sessions feel earned.

## Tasks
- [x] 1. Audit why the current orbital map reads as decorative instead of operational.
- [x] 2. Build a shared orbital-scene component so Mission Control and Tracking Station use the same higher-fidelity map model.
- [x] 3. Add stronger trajectory, archive-marker, and live-craft visuals without expanding the copy density.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The realism pass stays within the current Star Focus product model: mission telemetry and accumulated orbits, not vehicle construction.
- Mission identity should come primarily from visual markers and vehicle codes instead of adding more explanatory text.
- Mission Control and Tracking Station should share one orbital-scene implementation so the visual language does not drift.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx`, `src/components/MissionControlSidebar.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.
