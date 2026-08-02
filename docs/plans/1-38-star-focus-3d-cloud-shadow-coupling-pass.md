# 1-38: Star Focus 3D Cloud-Shadow Coupling Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make Earth and Venus feel more like lit bodies by coupling the visible cloud shells to subtle surface shadow passes in the true 3D Tracking Station renderer.

## Tasks
- [x] 1. Add a cloud-shadow surface shader that can reuse the existing cloud alpha maps on Earth and Venus.
- [x] 2. Keep the shadow pass synchronized with the visible cloud-shell motion so the layered read stays coherent under inspection.
- [x] 3. Retune cloud brightness slightly so the shells and their surface shadows read as one lighting system instead of separate decals.
- [x] 4. Re-run frontend verification and record the new 3D cloud-shadow boundary in the tracking docs.

## Decisions
- Use a restrained surface-shadow overlay on the planet body instead of adding another volumetric cloud-light system.
- Keep the effect limited to Earth and Venus, where the cloud shells are already prominent enough for the added depth to matter.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
