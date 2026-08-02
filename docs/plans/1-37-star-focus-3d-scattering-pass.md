# 1-37: Star Focus 3D Scattering Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Push the true 3D Tracking Station renderer further toward a rendered-system feel by separating atmospheric terminator color from day/night glow and giving Saturn's rings a more optical scattering response.

## Tasks
- [x] 1. Upgrade the 3D atmosphere glow so day, terminator, and night contributions can carry different color cues.
- [x] 2. Replace the flat Saturn ring glow with a light/view-responsive scattering shader.
- [x] 3. Keep the new scattering behavior tied to the existing light geometry instead of adding more scene objects.
- [x] 4. Re-run frontend verification and record the new 3D scattering boundary in the tracking docs.

## Decisions
- Extend the existing atmosphere shader instead of creating a separate second atmosphere effect layer.
- Move Saturn's glow pass onto a shader so the ring can respond more like a thin scattering surface instead of a constant additive band.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`
