# 1-39: Star Focus 3D Cloud-Shell Scattering Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make Earth and Venus cloud shells feel more atmospheric by giving them day/night/terminator behavior and a restrained sun-view scattering response in the true 3D Tracking Station renderer.

## Tasks
- [x] 1. Replace the flat Earth/Venus cloud-shell material with a shader-driven shell that can respond to sun angle and camera angle.
- [x] 2. Add darker night-side cloud behavior, warmer/cooler terminator color, and a restrained silver-lining effect so the shells read more volumetric.
- [x] 3. Keep the new cloud-shell lighting tied to the existing cloud motion and mission-phase modulation instead of adding new scene chrome.
- [x] 4. Re-run frontend verification and record the new 3D cloud-shell boundary in the tracking docs.

## Decisions
- Upgrade the cloud shells themselves instead of stacking another glow-only layer on top of them.
- Keep the cloud-shell scattering subtle so the scene stays cinematic rather than turning into a loud VFX pass.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
