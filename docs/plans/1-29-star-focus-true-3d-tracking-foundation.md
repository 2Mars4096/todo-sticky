# 1-29: Star Focus True 3D Tracking Foundation

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Start the first real WebGL/Three.js orbital scene for Star Focus by moving Tracking Station onto a true 3D renderer while keeping the sidebar on the lighter projected SVG path.

## Tasks
- [x] 1. Add the minimum 3D runtime dependency needed for a true orbital scene.
- [x] 2. Build a new true 3D Tracking Station map with real meshes, camera orbit, lighting, motion, and mission markers.
- [x] 3. Lazy-load the 3D renderer so the main sticky-note shell does not pay the full WebGL cost up front.
- [x] 4. Keep the sidebar map stable on the existing SVG path and re-run frontend verification.

## Decisions
- The first true 3D slice belongs in Tracking Station, not the sidebar, because the overlay has the space and intent for a heavier scene.
- The 3D map should load on demand with a projected-SVG fallback so the baseline app shell stays lighter.
- The first pass uses procedural materials and lightweight meshes instead of external assets, keeping the foundation portable inside the current repo.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.
- Dependency change: `three`
- Verification: `npm run build:frontend`
