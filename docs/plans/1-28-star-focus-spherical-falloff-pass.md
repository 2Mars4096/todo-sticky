# 1-28: Star Focus Spherical Falloff Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Tighten the projected planets so their weather, bands, and surface detail read as volume wrapped around a sphere instead of flat painted layers.

## Tasks
- [x] 1. Remove the remaining lateral weather-layer slip from the shared drift animation.
- [x] 2. Add stronger limb/detail falloff so the planetary edges read less like flat badges.
- [x] 3. Lower cloud and band contrast where needed so the bodies feel less posterized at close range.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Realism gains should come from stronger spherical read and quieter detail, not from adding more UI chrome or more moving parts.
- The weather layers now rely on tiny breathing motion plus parent rotation instead of visible translation.
- Close-up realism still stays stylized, but the planets should now hold together better as single volumes.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`
