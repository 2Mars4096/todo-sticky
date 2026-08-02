# 1-20: Star Focus Projected 3D Orbital Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Rebuild the shared Star Focus orbital scene as a projected 3D view so Tracking Station feels more spatial without pulling the app into full WebGL.

## Tasks
- [x] 1. Replace the flat orbit layout with a projected 3D orbital scene in the shared renderer.
- [x] 2. Update drag/zoom/tilt behavior so the user can orbit the camera around the scene instead of only panning a flat map.
- [x] 3. Tune the atmosphere and depth styling so the 3D pass still feels premium and controlled rather than noisy.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The first 3D pass should stay inside SVG/CSS with projected depth instead of jumping immediately to Three.js or WebGL.
- Tracking Station remains the main beneficiary of the richer 3D view while Mission Control still stays quieter and lighter.
- The scene should read as a believable orbital display, not a literal simulator or vehicle-construction game.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
