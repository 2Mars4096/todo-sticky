# 1-35: Star Focus 3D Eclipse And Transit Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add more body-to-body realism to the true 3D Tracking Station renderer by letting the Earth-Moon pair show eclipse and transit cues instead of behaving like separately lit objects.

## Tasks
- [x] 1. Add a moon-transit shadow cue on Earth that follows the live Earth-Moon-sun alignment.
- [x] 2. Add lunar-eclipse shading so the Moon reacts when it moves into Earth's shadow.
- [x] 3. Keep the new interaction driven by the existing orbital geometry instead of hardcoded timelines or static decals.
- [x] 4. Re-run frontend verification and record the new 3D eclipse-and-transit boundary in the tracking docs.

## Decisions
- Keep the Earth transit cue as a shader overlay on the globe instead of attempting a full volumetric shadow projection system.
- Treat lunar eclipse as a restrained material response on the Moon mesh so the effect stays legible in the current compressed orbital scene.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
