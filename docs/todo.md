# Todo

## Phase 0 - Documentation Scaffold

- [x] Add `AGENTS.md` and the `docs/` tracking scaffold.
- [x] Create the first active plan: [1-star-focus-integration-design](plans/1-star-focus-integration-design.md).

## Phase 1 - Star Focus Design Lock

- [x] [1-star-focus-integration-design](plans/1-star-focus-integration-design.md) - Lock the right-sidebar Star Focus design, mission loop, and cinematic animation model.
- [x] Capture the sidebar information architecture: long-term goals on the left, todos in the center, starmap-driven Mission Control on the right.
- [x] Decide how active focus sessions transition between launch cinematic and persistent starmap state.
- [x] Define what is intentionally out of scope for v1 so the sticky todo workflow stays lightweight.

## Phase 2 - Follow-Up Plans

- [x] Create the first implementation sub-plan after the Star Focus design is approved.
- [x] [1-1-star-focus-mission-control-shell](plans/1-1-star-focus-mission-control-shell.md) - Add the frontend-only right sidebar shell, local Star Focus state, and task-selection handoff.
- [x] [1-2-star-focus-session-controls-and-animation](plans/1-2-star-focus-session-controls-and-animation.md) - Tighten session lifecycle and upgrade the sidebar-only cinematic feel.
- [x] [1-3-star-focus-persistence-hardening](plans/1-3-star-focus-persistence-hardening.md) - Move Star Focus beyond browser-local persistence while keeping task markdown untouched and finish native verification.
- [x] [1-4-star-focus-overlay-reassessment](plans/1-4-star-focus-overlay-reassessment.md) - Reassess whether the persistent sidebar is enough or whether Star Focus now needs an expanded tracking-station surface.
- [x] [1-5-star-focus-tracking-station-overlay-shell](plans/1-5-star-focus-tracking-station-overlay-shell.md) - Add the first expanded Tracking Station overlay while keeping the right rail as the quick-control entry point.
- [x] [1-6-star-focus-compact-layout-and-overlay-polish](plans/1-6-star-focus-compact-layout-and-overlay-polish.md) - Tighten the compact sticky-note baseline and polish overlay entry/exit behavior.
- [x] [1-7-star-focus-archive-retention-and-browsing](plans/1-7-star-focus-archive-retention-and-browsing.md) - Decide how much mission history to retain and whether Tracking Station needs deeper archive browsing controls.
- [x] [1-8-star-focus-markdown-sync-reassessment](plans/1-8-star-focus-markdown-sync-reassessment.md) - Lock that Star Focus mission history remains native-local instead of syncing into markdown/project storage.
- [x] [1-9-star-focus-archive-retention-settings](plans/1-9-star-focus-archive-retention-settings.md) - Let users adjust the local Star Focus archive cap without expanding into markdown sync.
- [x] [1-10-star-focus-copy-density-polish](plans/1-10-star-focus-copy-density-polish.md) - Keep the Star Focus visual direction but trim the amount of descriptive UI copy.
- [x] [1-11-star-focus-guided-copy-minimization](plans/1-11-star-focus-guided-copy-minimization.md) - Push Star Focus further toward labels, metrics, and actions instead of descriptive helper text.
- [x] [1-12-star-focus-hierarchy-trim](plans/1-12-star-focus-hierarchy-trim.md) - Remove duplicate secondary labels and quiet the Star Focus hierarchy without changing the layout model.
- [x] [1-13-star-focus-orbital-map-realism-pass](plans/1-13-star-focus-orbital-map-realism-pass.md) - Rebuild the Star Focus orbital map so it feels like mission telemetry instead of a placeholder diagram.
- [x] [1-14-star-focus-orbital-map-camera-controls](plans/1-14-star-focus-orbital-map-camera-controls.md) - Add drag, zoom, and above/below camera controls to the shared Star Focus orbital map.
- [x] [1-15-star-focus-compressed-solar-system-pass](plans/1-15-star-focus-compressed-solar-system-pass.md) - Add celestial bodies and astronomical texture so the shared orbital map feels closer to a real solar-system view.
- [x] [1-16-star-focus-orbital-map-declutter-pass](plans/1-16-star-focus-orbital-map-declutter-pass.md) - Trim the shared orbital map so it stays real-looking without feeling messy.
- [x] [1-17-star-focus-sidebar-map-simplification](plans/1-17-star-focus-sidebar-map-simplification.md) - Remove sidebar map chrome so Tracking Station remains the richer orbital surface.
- [x] [1-18-star-focus-orbital-map-materials-pass](plans/1-18-star-focus-orbital-map-materials-pass.md) - Improve planetary materials and scene atmosphere so the orbital map feels more premium.
- [x] [1-19-star-focus-tracking-station-cinematic-polish](plans/1-19-star-focus-tracking-station-cinematic-polish.md) - Push the shared orbital scene toward a more cinematic Tracking Station finish without adding new chrome.

## Phase 3 - Developer Tools

- [x] [2-dev-mode-task-debug-panel](plans/2-dev-mode-task-debug-panel.md) - Add a development-only panel for seeding, clearing, and reloading tasks during local debugging.
  - [x] [2-1-dev-mode-star-focus-time-scale](plans/2-1-dev-mode-star-focus-time-scale.md) - Add dev-only Star Focus mission time-speed controls for inspecting track progress.

## Backlog

- [ ] Revisit whether Star Focus archive retention needs a wider preset range or a dedicated settings-panel home beyond the first local-only `6` / `12` / `24` control pass.
