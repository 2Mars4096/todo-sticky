# 1-36: Star Focus 3D Phase Rim Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D Tracking Station renderer show clearer planetary phases by adding restrained crescent/rim overlays to the bodies that benefit most from visible phase separation.

## Tasks
- [x] 1. Add phase-rim overlays for key planets so Venus and the inner bodies show clearer crescent behavior.
- [x] 2. Add a matching rim pass for the Moon so close inspection reads more like a phased body than a flat lit sphere.
- [x] 3. Keep the new rim cues subtle and tied to live sun/camera geometry instead of turning into decorative glow.
- [x] 4. Re-run frontend verification and record the new 3D phase-rim boundary in the tracking docs.

## Decisions
- Use additive shader overlays for phase rims instead of replacing the base body materials, keeping the new pass isolated and easy to tune.
- Focus the strongest rim read on Venus and the Moon because they benefit most visibly from the new phase behavior in the current compressed scene.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
