# 1-34: Star Focus 3D Reflected Light Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Push the true 3D Tracking Station renderer toward a more optical, rendered feel by adding reflected-light cues instead of only more direct glow and shadow.

## Tasks
- [x] 1. Add an Earth ocean-glint pass that responds to the live sun/camera relationship.
- [x] 2. Add a subtle Earthshine fill for the Moon so the Earth-Moon pair feels more physically related.
- [x] 3. Keep the new reflected-light cues restrained and tied to the existing light model.
- [x] 4. Re-run frontend verification and record the new 3D reflected-light boundary in the tracking docs.

## Decisions
- Keep the ocean glint in a separate shader overlay instead of rebuilding the full Earth material stack around a custom BRDF.
- Use a low-intensity Earth-centered fill light for Moon Earthshine because it is cheap, stable, and visually legible in the current overlay scene.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
