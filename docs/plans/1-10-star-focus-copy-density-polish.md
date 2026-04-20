# 1-10: Star Focus Copy Density Polish

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Keep the current Star Focus visual direction while reducing explanatory copy across Mission Control and Tracking Station.

## Tasks
- [x] 1. Audit the noisiest Star Focus empty, active, and archive states.
- [x] 2. Trim redundant explanatory copy in Mission Control without changing the current layout model.
- [x] 3. Trim Tracking Station copy and remove low-value descriptive panels that read like help text instead of controls.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Keep the current cinematic Star Focus look; this slice is copy-density reduction, not layout redesign.
- Prefer short state labels and compact support text over descriptive paragraphs.
- Remove redundant explanatory content before changing the visual system.

## Notes
- This slice intentionally preserves the current Star Focus structure while making the surfaces read more like an instrument panel.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx` and `src/components/TrackingStationOverlay.tsx`.
