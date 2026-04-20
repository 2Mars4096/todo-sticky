# 1-16: Star Focus Orbital Map Declutter Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Keep the new solar-system feel while removing the visual clutter that made the map read as busy instead of deliberate.

## Tasks
- [x] 1. Identify the highest-noise elements in the shared orbital scene.
- [x] 2. Reduce the number of simultaneous celestial bodies, tags, and guide elements without losing the realism pass.
- [x] 3. Differentiate the sidebar and overlay density so Mission Control stays calmer than Tracking Station.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The sidebar should carry a lighter scene than Tracking Station instead of mirroring the full overlay density.
- Celestial bodies and archive markers stay, but only the highest-value ones should compete for attention at once.
- Cleanup should come from subtraction and quieter styling, not by replacing the solar-system direction.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
