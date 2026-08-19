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
- [x] [1-20-star-focus-projected-3d-orbital-pass](plans/1-20-star-focus-projected-3d-orbital-pass.md) - Rebuild the shared orbital scene as a projected 3D view with orbit-camera interaction instead of a flat tilted map.
- [x] [1-21-star-focus-planet-detail-pass](plans/1-21-star-focus-planet-detail-pass.md) - Add finer-grained planet, moon, and ring detail so the projected orbital scene holds up better at close inspection.
- [x] [1-22-star-focus-planet-motion-and-atmosphere-pass](plans/1-22-star-focus-planet-motion-and-atmosphere-pass.md) - Add restrained planet motion, atmosphere shells, and stronger ring-shadow treatment so the projected scene feels more alive.
- [x] [1-23-star-focus-lighting-and-ring-occlusion-pass](plans/1-23-star-focus-lighting-and-ring-occlusion-pass.md) - Make planetary lighting follow the scene geometry more believably and let Saturn's ring occlusion follow the projected ring path.
- [x] [1-24-star-focus-ring-structure-and-scattering-pass](plans/1-24-star-focus-ring-structure-and-scattering-pass.md) - Add richer Saturn ring breakup and better atmospheric scattering falloff so local depth holds up better under close inspection.
- [x] [1-25-star-focus-disc-microtexture-pass](plans/1-25-star-focus-disc-microtexture-pass.md) - Add fine disc-level currents, swirls, dunes, and micro-bands so the planets keep their read when you zoom in.
- [x] [1-26-star-focus-phase-responsive-material-pass](plans/1-26-star-focus-phase-responsive-material-pass.md) - Let the shared orbital scene shift its materials, atmosphere, and motion pacing with the live mission phase instead of adding more chrome.
- [x] [1-27-star-focus-weather-layer-lock-pass](plans/1-27-star-focus-weather-layer-lock-pass.md) - Lock cloud and weather motion back onto the planets so close-up inspection stays coherent instead of sloppy.
- [x] [1-28-star-focus-spherical-falloff-pass](plans/1-28-star-focus-spherical-falloff-pass.md) - Strengthen the spherical read with quieter weather motion, stronger limb falloff, and less posterized cloud/band contrast.
- [x] [1-29-star-focus-true-3d-tracking-foundation](plans/1-29-star-focus-true-3d-tracking-foundation.md) - Start the first true 3D/WebGL Star Focus renderer in Tracking Station while keeping the sidebar on the lighter projected map.
- [x] [1-30-star-focus-3d-material-realism-pass](plans/1-30-star-focus-3d-material-realism-pass.md) - Deepen the true 3D Tracking Station renderer with layered planet materials, cloud shells, and textured rings.
- [x] [1-31-star-focus-3d-atmosphere-and-shadow-pass](plans/1-31-star-focus-3d-atmosphere-and-shadow-pass.md) - Add fresnel atmosphere glow, shadow-enabled lighting, and stronger ring occlusion cues to the true 3D renderer.
- [x] [1-32-star-focus-3d-solar-lighting-and-depth-pass](plans/1-32-star-focus-3d-solar-lighting-and-depth-pass.md) - Make the true 3D renderer react more directly to the sun angle and add layered background depth behind the system.
- [x] [1-33-star-focus-3d-occultation-and-night-detail-pass](plans/1-33-star-focus-3d-occultation-and-night-detail-pass.md) - Add Earth dark-side lights and Saturn ring-shadow detail to the true 3D renderer.
- [x] [1-34-star-focus-3d-reflected-light-pass](plans/1-34-star-focus-3d-reflected-light-pass.md) - Add Earth ocean glint and Moon Earthshine cues to the true 3D renderer.
- [x] [1-35-star-focus-3d-eclipse-and-transit-pass](plans/1-35-star-focus-3d-eclipse-and-transit-pass.md) - Add Earth-Moon eclipse and transit cues to the true 3D renderer.
- [x] [1-36-star-focus-3d-phase-rim-pass](plans/1-36-star-focus-3d-phase-rim-pass.md) - Add clearer phase and crescent rims to the true 3D renderer.
- [x] [1-37-star-focus-3d-scattering-pass](plans/1-37-star-focus-3d-scattering-pass.md) - Add color-separated atmospheric terminators and stronger ring scattering to the true 3D renderer.
- [x] [1-38-star-focus-3d-cloud-shadow-coupling-pass](plans/1-38-star-focus-3d-cloud-shadow-coupling-pass.md) - Add Earth/Venus cloud-shadow coupling so the true 3D bodies feel more light-linked and less like stacked layers.
- [x] [1-39-star-focus-3d-cloud-shell-scattering-pass](plans/1-39-star-focus-3d-cloud-shell-scattering-pass.md) - Upgrade Earth/Venus cloud shells with darker night sides, stronger terminators, and restrained silver-lining behavior.
- [x] [1-40-star-focus-3d-atmosphere-shell-depth-pass](plans/1-40-star-focus-3d-atmosphere-shell-depth-pass.md) - Replace the flat front atmosphere shell with a deeper day/terminator/limb haze pass in the true 3D renderer.
- [x] [1-41-star-focus-3d-background-depth-pass](plans/1-41-star-focus-3d-background-depth-pass.md) - Add layered nebula and dust-haze depth behind the true 3D system so the scene feels less empty.
- [x] [1-42-star-focus-3d-solar-scatter-pass](plans/1-42-star-focus-3d-solar-scatter-pass.md) - Add richer solar flare structure and a restrained sun-lit scatter band through the true 3D system.
- [x] [1-43-star-focus-3d-shadow-interaction-pass](plans/1-43-star-focus-3d-shadow-interaction-pass.md) - Let cloud shells and rings participate more cleanly in the shared solar shadow path.
- [x] [1-44-star-focus-solar-route-layout-pass](plans/1-44-star-focus-solar-route-layout-pass.md) - Reframe Focus Mode around a named solar route and a responsive task-first layout.

## Phase 3 - Developer Tools

- [x] [2-dev-mode-task-debug-panel](plans/2-dev-mode-task-debug-panel.md) - Add a development-only panel for seeding, clearing, and reloading tasks during local debugging.
  - [x] [2-1-dev-mode-star-focus-time-scale](plans/2-1-dev-mode-star-focus-time-scale.md) - Add dev-only Star Focus mission time-speed controls for inspecting track progress.

## Phase 4 - AI Provider Defaults

- [x] [3-kimi-moonshot-default-provider](plans/3-kimi-moonshot-default-provider.md) - Make Moonshot Kimi the default AI provider and use Kimi's recommended temperature.
  - [x] [3-1-openrouter-provider-adapter](plans/3-1-openrouter-provider-adapter.md) - Add first-class OpenRouter configuration and routed-model support.
  - [x] [3-2-quick-provider-switching](plans/3-2-quick-provider-switching.md) - Switch between saved provider profiles from the main action bar.
  - [x] [3-3-codex-background-provider](plans/3-3-codex-background-provider.md) - Use the locally authenticated Codex CLI as a keyless background provider.

## Phase 5 - Ready-To-Use Frontend

- [x] [4-ready-shell-and-ux-path-pass](plans/4-ready-shell-and-ux-path-pass.md) - Optimize the default layout, frameless-window resizing, and shortest paths through core workflows.
  - [x] [4-1-top-right-launch-placement](plans/4-1-top-right-launch-placement.md) - Open the installed app visibly in a predictable top-right launch position.
  - [x] [4-2-smart-task-carry-forward](plans/4-2-smart-task-carry-forward.md) - Carry past tasks to today and current/future tasks to their next day.
  - [x] [4-3-goals-rail-and-data-path-clarity](plans/4-3-goals-rail-and-data-path-clarity.md) - Align collapsed Goals metrics and clarify empty non-current dates.
  - [x] [4-4-stable-data-home-recovery](plans/4-4-stable-data-home-recovery.md) - Keep macOS task and app-state paths stable when a launcher overrides `HOME`.
  - [x] [4-5-task-copy-paste-and-agent-handoff](plans/4-5-task-copy-paste-and-agent-handoff.md) - Copy or paste task structures and export individual items as execution-ready agent prompts.
  - [x] [4-6-blank-launch-recovery](plans/4-6-blank-launch-recovery.md) - Prevent silent white-window launches and diagnose the installed frontend boot failure without touching task data.
  - [x] [4-7-cloud-archive-availability-state](plans/4-7-cloud-archive-availability-state.md) - Replace indefinite task loading with a recoverable cloud-only archive state.
  - [x] [4-8-stable-date-header-layout](plans/4-8-stable-date-header-layout.md) - Keep date navigation arrows fixed and the date label truly centered.
  - [ ] [4-9-data-history-recovery-and-merge](plans/4-9-data-history-recovery-and-merge.md) - Recover prior task and app history into the configured local knowledge-base store.
  - [x] [4-10-agent-task-api](plans/4-10-agent-task-api.md) - Expose task extraction and safe CRUD as a JSON API for reusable agent skills.
  - [x] [4-11-task-step-action-clarity](plans/4-11-task-step-action-clarity.md) - Distinguish manual step entry from AI task breakdown in every task row.
  - [x] [4-12-task-aware-album-recommendations](plans/4-12-task-aware-album-recommendations.md) - Generate an ephemeral work soundtrack from the current task list without expanding the sticky-note layout.
  - [x] [4-13-native-copy-paste-shortcuts](plans/4-13-native-copy-paste-shortcuts.md) - Replace visible clipboard controls with standard Command-C and Command-V behavior.

## Backlog

- [ ] Revisit whether Star Focus archive retention needs a wider preset range or a dedicated settings-panel home beyond the first local-only `6` / `12` / `24` control pass.
- [ ] Add a lightweight undo path for task deletion without introducing a confirmation modal.
