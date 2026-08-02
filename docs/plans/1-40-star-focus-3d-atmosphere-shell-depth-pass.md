# 1-40: Star Focus 3D Atmosphere-Shell Depth Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D planets feel less flat by replacing the front atmosphere shell with a light- and view-responsive haze layer that reacts to day, terminator, and limb angle.

## Tasks
- [x] 1. Replace the flat front atmosphere shell with a shader-driven shell that can respond to sun angle and camera angle.
- [x] 2. Give Earth, Venus, Mars, and the outer haze different day, terminator, and night color behavior so the atmospheres feel less generic.
- [x] 3. Keep the new shell tied to the existing mission-phase atmosphere modulation instead of expanding the UI or scene scope.
- [x] 4. Re-run frontend verification and record the new 3D atmosphere-shell boundary in the tracking docs.

## Decisions
- Upgrade the front atmosphere shell itself instead of stacking another decorative glow layer above it.
- Keep the shell on normal alpha blending so the front haze reads as depth over the body rather than another additive flare pass.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
