# 1-12: Star Focus Hierarchy Trim

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Quiet the Star Focus surfaces further by removing duplicate secondary labels and readouts.

## Tasks
- [x] 1. Identify duplicate secondary labels that restate information already visible elsewhere.
- [x] 2. Remove low-value hierarchy markers from Mission Control without weakening the primary controls.
- [x] 3. Remove low-value hierarchy markers from Tracking Station and rebalance the caption alignment.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Prefer one strong readout over a label-plus-readout pair when the label is obvious from context.
- Trim hierarchy before changing the larger layout.
- Keep the Star Focus mood, but let the controls carry more of the meaning.

## Notes
- This slice removes duplicate phase/caption/archive labels rather than changing the Star Focus information architecture.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.
