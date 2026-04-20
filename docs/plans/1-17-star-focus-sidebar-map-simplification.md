# 1-17: Star Focus Sidebar Map Simplification

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the Mission Control sidebar map quieter by removing overlay-style HUD and camera chrome while preserving the richer Tracking Station experience.

## Tasks
- [x] 1. Identify which sidebar map elements still read as unnecessary chrome after the declutter pass.
- [x] 2. Remove the sidebar HUD and camera dock so the orbital scene can sit as background atmosphere rather than a second control panel.
- [x] 3. Keep Tracking Station as the primary rich interaction surface for camera controls and map readouts.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The sidebar keeps direct map interaction available, but visible camera chrome belongs to Tracking Station only.
- The overlay should own the explicit map readouts and camera buttons; the sidebar should stay faster and quieter.
- This slice is subtraction only and does not alter the shared scene model itself.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx`.
