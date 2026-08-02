# 1-42: Star Focus 3D Solar-Scatter Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D solar system feel more star-lit by giving the sun a richer flare structure and a restrained illuminated scatter band through the system plane.

## Tasks
- [x] 1. Add a more structured solar flare texture instead of relying only on the core, corona, and halo spheres.
- [x] 2. Add a thin sun-lit scatter veil through the inner system so the star feels like it is illuminating surrounding dust instead of just glowing on its own.
- [x] 3. Tie the new solar layers into the existing mission-phase light tuning instead of adding more UI or scene chrome.
- [x] 4. Re-run frontend verification and record the new 3D solar-scatter boundary in the tracking docs.

## Decisions
- Keep the flare work sprite-based and centered on the sun rather than introducing a full post-processing bloom pipeline.
- Keep the solar scatter restrained so it supports realism and framing instead of becoming an obvious lens-effect gimmick.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
