# 1-14: Star Focus Orbital Map Camera Controls

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add direct map interaction so the Star Focus orbital scene can be panned, zoomed, and tilted above or below without introducing a full 3D engine.

## Tasks
- [x] 1. Extend the shared orbital-scene component with local camera state for pan, zoom, and tilt.
- [x] 2. Add direct drag and wheel interaction plus compact camera controls that fit both Mission Control and Tracking Station.
- [x] 3. Keep the camera model lightweight and non-persistent so it stays within the v1 SVG/CSS telemetry approach.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Camera controls stay local to each rendered map instance and reset with the component instead of becoming persisted user settings.
- The above/below view is a pseudo-3D camera tilt built with CSS perspective and SVG, not real 3D assets or a WebGL renderer.
- Dragging and zooming should happen directly on the map surface, while the explicit camera buttons stay compact and secondary.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
