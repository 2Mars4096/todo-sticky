# 1-32: Star Focus 3D Solar Lighting And Depth Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Push the true 3D Tracking Station scene further away from a clean diagram by making atmosphere and ring glow respond more directly to the sun angle and by adding layered starfield depth behind the system.

## Tasks
- [x] 1. Make the 3D atmosphere glow respond to both camera angle and sun direction instead of only using a view-facing fresnel shell.
- [x] 2. Improve Saturn ring lighting so brightness and glow react to both viewing angle and sun angle.
- [x] 3. Replace the single flat star cloud with layered background depth in the true 3D scene.
- [x] 4. Re-run frontend verification and record the new 3D lighting-and-depth boundary in the tracking docs.

## Decisions
- Keep the planet bodies on Three.js physical materials and only extend the atmosphere shell with a small shader pass.
- Use lightweight procedural point layers for the background depth instead of adding external skybox assets.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
