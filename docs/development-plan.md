# Development Plan

## Current Goal

- [ ] Decide whether the new local archive-retention controls should stay as small Tracking Station presets or expand into a broader settings surface later.

## Near-Term Milestones

- [x] Finalize the three-column product model:
  left goals, center sticky todo list, right Star Focus Mission Control.
- [x] Finalize the Star Focus interaction model:
  task -> launch -> focus session -> cinematic mission progress -> persistent starmap update.
- [x] Decide the minimum viable animation system for launch, ascent, heating, staging, atmosphere exit, and orbital insertion.
- [x] Create follow-up numbered plans for the first implementation slice after the design is approved.
- [x] Land [1-1-star-focus-mission-control-shell](plans/1-1-star-focus-mission-control-shell.md).
- [x] Validate that Star Focus v1 can stay local-only and sidebar-only before opening deeper persistence or overlay tracks.
- [x] Land [1-2-star-focus-session-controls-and-animation](plans/1-2-star-focus-session-controls-and-animation.md).
- [x] Decide whether the next plan should target deeper persistence or a larger tracking-station surface.
- [x] Land [1-3-star-focus-persistence-hardening](plans/1-3-star-focus-persistence-hardening.md).
- [x] Land [1-4-star-focus-overlay-reassessment](plans/1-4-star-focus-overlay-reassessment.md).
- [x] Land [1-5-star-focus-tracking-station-overlay-shell](plans/1-5-star-focus-tracking-station-overlay-shell.md).
- [x] Land [1-6-star-focus-compact-layout-and-overlay-polish](plans/1-6-star-focus-compact-layout-and-overlay-polish.md).
- [x] Land [1-7-star-focus-archive-retention-and-browsing](plans/1-7-star-focus-archive-retention-and-browsing.md).
- [x] Land [1-8-star-focus-markdown-sync-reassessment](plans/1-8-star-focus-markdown-sync-reassessment.md).
- [x] Land [1-9-star-focus-archive-retention-settings](plans/1-9-star-focus-archive-retention-settings.md).
- [x] Land [1-10-star-focus-copy-density-polish](plans/1-10-star-focus-copy-density-polish.md).
- [x] Land [1-11-star-focus-guided-copy-minimization](plans/1-11-star-focus-guided-copy-minimization.md).
- [x] Land [1-12-star-focus-hierarchy-trim](plans/1-12-star-focus-hierarchy-trim.md).
- [x] Land [4-ready-shell-and-ux-path-pass](plans/4-ready-shell-and-ux-path-pass.md).

## Open Questions

- [x] Star Focus persistence should live in a dedicated local native surface, separate from the general settings payload.
- [x] The default local Star Focus archive should retain the most recent 12 missions, with a simple `Recent` vs `Full` archive view and no filters/pagination in v1.
- [x] After persistence hardening, there is enough unmet value to justify an expanded overlay, but the right rail still remains the quick-control entry point.
- [x] The compact sticky-note baseline can stay at the current default width for now if both rails start collapsed and compact-mode expansion keeps only one rail open at a time.
- [x] Restored active sessions auto-open Tracking Station once when the right rail is collapsed; mission completion stays user-invoked.
- [ ] Should the local archive cap stay on the current `6` / `12` / `24` presets, or expand into a broader settings surface later?
- [x] Completed Star Focus mission history should remain native-local only; markdown/project files stay the task source of truth.
