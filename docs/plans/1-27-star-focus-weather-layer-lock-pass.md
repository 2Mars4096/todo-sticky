# 1-27: Star Focus Weather Layer Lock Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Keep atmospheric and cloud layers visually locked to each planet so close-up inspection reads as a coherent body instead of a drifting overlay.

## Tasks
- [x] 1. Reduce the weather-layer translation amplitudes so cloud and band groups stop reading as detached decals.
- [x] 2. Rework the shared weather-drift animation toward a subtler shimmer instead of obvious lateral sliding.
- [x] 3. Keep the planets alive without reintroducing the sloppy drifting effect in Tracking Station or the sidebar.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- The planetary bodies already have enough life from body rotation, lighting, and phase response; weather motion should stay secondary.
- Believability matters more than movement quantity, so the right fix is smaller, more centered motion rather than more animated layers.
- The correction should apply to the shared map so sidebar and overlay stay visually aligned.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`
