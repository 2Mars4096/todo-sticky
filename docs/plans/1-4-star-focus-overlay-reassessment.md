# 1-4: Star Focus Overlay Reassessment

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Decide whether the now-persistent sidebar Mission Control is sufficient or whether Star Focus needs an expanded tracking-station surface.

## Tasks
- [x] 1. Audit the current sidebar density with persistent mission history, maintenance controls, and active-session UI at sticky-note window widths.
- [x] 2. Decide whether an expanded tracking-station surface is needed for any of:
  launch cinematic payoff, orbit history browsing, or richer mission controls.
- [x] 3. If an expanded surface is justified, define the trigger, scope, and explicit v1 limits; if not, record that the sidebar remains the canonical Star Focus surface.
- [x] 4. Split the approved direction into follow-up implementation plans only after the product decision is locked.

## Decisions
- Persistent native storage removes one of the main blockers to evaluating a larger Star Focus surface honestly.
- Overlay work should still be justified by user-facing payoff, not by aesthetics alone.
- The current sticky-note baseline is too narrow to treat the fully expanded right sidebar as the honest long-term Star Focus surface:
  Tauri still defaults to a `380x560` window while the left and right rails already reserve roughly `176px` and `224px`.
- The right sidebar remains the fast-control Star Focus entry point, but an expanded in-window Tracking Station overlay is now justified for richer launch control, archive browsing, and starmap payoff.
- The overlay trigger should live in Mission Control itself, and sending a task to Focus may open the overlay directly when the rail is collapsed.
- The first overlay slice stays inside the same Tauri window and the same local persistence model:
  no separate native window, no 3D/WebGL scene, and no markdown/task-sync expansion.

## Notes
- This plan starts from the persistent sidebar baseline created in [1-3-star-focus-persistence-hardening](1-3-star-focus-persistence-hardening.md).
- The next implementation slice is [1-5-star-focus-tracking-station-overlay-shell](1-5-star-focus-tracking-station-overlay-shell.md).
