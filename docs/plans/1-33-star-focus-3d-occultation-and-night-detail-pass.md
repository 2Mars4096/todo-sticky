# 1-33: Star Focus 3D Occultation And Night Detail Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add more local realism to the true 3D Tracking Station renderer by giving Earth a dark-side light pass and Saturn a dedicated ring-shadow cue instead of relying only on broad scene lighting.

## Tasks
- [x] 1. Add a dark-side light pass for Earth in the true 3D renderer.
- [x] 2. Add a dedicated Saturn ring-shadow overlay so the globe reads more like a lit body under ring occlusion.
- [x] 3. Keep the new details tied to the live light direction instead of baking them in as flat decals.
- [x] 4. Re-run frontend verification and record the new 3D local-detail boundary in the tracking docs.

## Decisions
- Keep the new local-detail cues shader-backed and planet-specific instead of moving the entire body stack to custom materials.
- Use restrained night-light intensity so Earth gains realism without turning into a decorative sci-fi object.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
