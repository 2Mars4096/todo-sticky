# 1-11: Star Focus Guided Copy Minimization

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Reduce Star Focus UI text to action-oriented guidance instead of explanatory prose.

## Tasks
- [x] 1. Remove low-value support copy from Mission Control state cards.
- [x] 2. Remove low-value support copy from Tracking Station state cards and banners.
- [x] 3. Keep only labels, metrics, and minimal action guidance where it helps the next step.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

## Decisions
- Star Focus should guide through labels and actions first, not by explaining the system.
- Empty and completed states should stay terse; users can infer structure from layout and controls.
- Descriptive helper text should only remain when it materially changes the next action.

## Notes
- This pass is intentionally narrower than `1-10`; it pushes the same visual direction further toward instrument-panel behavior.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx` and `src/components/TrackingStationOverlay.tsx`.
