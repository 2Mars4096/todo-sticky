# 1-26: Star Focus Phase Responsive Material Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Make the shared Star Focus orbital scene react more believably to mission state through phase-responsive materials, atmosphere, and motion pacing instead of adding more chrome.

## Tasks
- [x] 1. Feed the shared orbital viewport a reliable phase theme even when it is reused across sidebar and Tracking Station surfaces.
- [x] 2. Tune atmosphere, rim light, glow, ring intensity, and solar wash by mission phase so the scene feels more alive.
- [x] 3. Adjust background energy and subtle texture/weather motion pacing per phase without making the scene gamey.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Phase response should deepen the feel of a live mission state, not add more labels, banners, or descriptive copy.
- The effect stays physically suggestive and restrained, with calmer idle/orbit states and hotter ignition/heating states.
- Tracking Station keeps the fuller read, while the sidebar still inherits the quieter visual baseline.

## Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`
