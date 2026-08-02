# 1-41: Star Focus 3D Background-Depth Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the true 3D Tracking Station feel less empty by adding richer layered background depth behind the planetary system without introducing more UI chrome.

## Tasks
- [x] 1. Add deeper far and near nebula layers so the scene has more parallax-rich space texture behind the solar system.
- [x] 2. Add broad dust-haze veils through the system plane so the planets feel embedded in an environment rather than floating in empty black.
- [x] 3. Keep the new background motion restrained and ambient so the renderer stays cinematic instead of becoming a noisy VFX scene.
- [x] 4. Re-run frontend verification and record the new 3D background-depth boundary in the tracking docs.

## Decisions
- Use a small number of textured sprite and veil layers instead of pushing the background toward a literal volumetric nebula simulation.
- Keep the background work scene-only; do not add new overlays, captions, or HUD framing to explain it.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
