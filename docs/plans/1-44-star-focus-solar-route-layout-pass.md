# 1-44: Star Focus Solar Route Layout Pass

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Reframe Focus Mode around a clear task, timer, and solar-system destination while making the Tracking Station useful at both compact and wide window sizes.

## Tasks

- [x] 1. Audit the compact and wide Tracking Station layouts in the rendered app.
- [x] 2. Add a deterministic Solar Route model that maps completed focus legs to named destinations without expanding the persisted state schema.
- [x] 3. Rebuild the Tracking Station hierarchy around the current route, primary focus controls, and one dominant orbital scene.
- [x] 4. Tighten the Mission Control sidebar so route progress is visible without adding more map chrome.
- [x] 5. Verify idle, armed, and active states at compact and wide breakpoints, then sync user-facing and tracking docs.

## Decisions

- Rename the expanded surface to Focus Mode while retaining Star Focus and Tracking Station as the product and instrument identities.
- Treat every completed focus session as one route leg from an origin to a named destination.
- Derive the route leg from the highest retained mission orbit index so the feature needs no Rust or persistence migration.
- Keep duration as focus-burn length, not fictional astronomical travel time.
- Put the task, remaining time, and session controls before the orbital scene on compact windows.
- Keep archive retention and destructive maintenance controls visually secondary to the live focus workflow.

## Notes

- Baseline visual QA found that compact header stats pushed the Flight Deck below the fold, while the wide Flight Deck spent most of its height empty in idle state.
- The route loops through Earth → Moon → Venus → Mars → Saturn → Earth and advances from the highest retained mission orbit index.
- Frontend changes landed in `src/starFocusJourney.ts`, `src/components/TrackingStationOverlay.tsx`, `src/components/MissionControlSidebar.tsx`, both orbital-map components, and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`, plus Playwright visual checks at `460x720` and `1100x760` for idle, armed, active, map, and expanded-rail states.
