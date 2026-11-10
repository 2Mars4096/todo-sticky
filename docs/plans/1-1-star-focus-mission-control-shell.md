# 1-1: Star Focus Implementation History

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add the first frontend-only Star Focus shell so the app has a real three-column layout and a usable Mission Control sidebar.

## Tasks
- [x] 1. Add Star Focus frontend state and types for:
  sidebar collapse, selected task, active session, mission history, and lightweight starmap progress.
- [x] 2. Add a right-sidebar Mission Control shell to the app layout with:
  empty, task-selected, active-session, and mission-complete states.
- [x] 3. Add a task-to-Mission-Control handoff from the center list without breaking existing edit, status, delete, or push flows.
- [x] 4. Render a static first-pass starmap and phase timeline in the sidebar using lightweight 2D UI primitives only.
- [x] 5. Persist Star Focus v1 state locally and verify the existing markdown-backed task workflow is unchanged.
- [x] 6. Run the default frontend verification command and update tracking docs with follow-up work.

## Decisions
- Mission Control is a frontend-only slice in this plan; no Tauri commands or markdown schema changes belong here.
- The shell should prove layout, state ownership, and basic interaction before animation-heavy work begins.
- The initial selected-task handoff can use an explicit task-level Focus CTA instead of overloading existing click-to-edit behavior.
- Session completion creates persistent local mission history but intentionally leaves task completion status under manual user control.

## Notes
- Keep the right sidebar narrow and information-dense enough to coexist with the current sticky-note window.
- Defer richer animation choreography, overlay experiments, and non-local persistence to later plans if the shell lands cleanly.
- Implementation landed in `src/hooks/useStarFocus.ts`, `src/components/MissionControlSidebar.tsx`, and the task-list handoff flow in `src/components/TaskList.tsx` and `src/components/TaskItem.tsx`.
- Verification: `npm run build:frontend`

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="1-2-star-focus-session-controls-and-animation"></a>

## 1-2: Star Focus Session Controls And Animation

**Goal:** Refine the Mission Control shell so focus sessions feel deliberate and cinematic without adding backend sync or a larger overlay.

### Tasks
- [x] 1. Tighten the session lifecycle with pause, resume, restore-on-reload, and clearer completion/cancel semantics.
- [x] 2. Upgrade the sidebar cinematic system so each phase feels visually distinct while staying 2D and lightweight.
- [x] 3. Tune task-selection and mission-history density so the three-column layout still reads cleanly at sticky-note window widths.
- [x] 4. Re-run frontend verification and decide whether the following plan should target deeper persistence or an expanded tracking-station view.

### Decisions
- Stay frontend-only and local-only for this slice unless the current shell proves materially insufficient.
- Keep the sidebar as the primary Star Focus surface; an overlay remains backlog until the polished sidebar clearly fails.
- The polished sidebar still carries the concept, so the next plan should target persistence hardening before any expanded tracking-station surface.
- Active sessions now lock task selection, support pause/resume, survive reloads, and keep cancel semantics distinct from successful completion.

### Notes
- This plan assumes [1-1-star-focus-mission-control-shell](1-1-star-focus-mission-control-shell.md) is the baseline, not a throwaway prototype.
- Verification: `npm run build:frontend`
- Implementation landed in `src/hooks/useStarFocus.ts`, `src/components/MissionControlSidebar.tsx`, and supporting task-list/style updates.

<a id="1-3-star-focus-persistence-hardening"></a>

## 1-3: Star Focus Persistence Hardening

**Goal:** Harden Star Focus persistence so sessions and mission history survive more reliably than browser-local state and are ready for longer-term product decisions.

### Tasks
- [x] 1. Decide the target persistence layer for Star Focus beyond browser `localStorage`:
  keep local-only but move into Tauri-backed settings/store, with a migration path from the current frontend state shape.
- [x] 2. Migrate Star Focus session and mission-history state without regressing the existing markdown-backed task workflow.
- [x] 3. Add mission-history maintenance controls:
  clear history, reset orbit map, and preserve safe behavior for active sessions.
- [x] 4. Re-run frontend verification and native-side sanity checks if the persistence layer touches Rust or Tauri commands.

### Decisions
- Expanded overlay work stays deferred until persistence and longer-lived mission state prove insufficient inside the sidebar.
- Task markdown remains the source of truth for todos; this plan hardens Star Focus mission state only.
- Star Focus persistence now lives in a dedicated native app-data file managed by Tauri, not in the browser store and not inside the general settings payload.
- Legacy browser `localStorage` state is migrated forward on first native-backed load, then cleared after a successful native save.
- The settings panel continues to own only AI/provider and KB settings so a normal settings save cannot accidentally wipe Star Focus mission state.
- Persistence hardening is sufficient to unlock the next question:
  whether the current sidebar is enough long-term or whether Star Focus now warrants an expanded tracking-station surface.

### Notes
- This plan starts only after [1-2-star-focus-session-controls-and-animation](1-1-star-focus-mission-control-shell.md#1-2-star-focus-session-controls-and-animation) is accepted as the sidebar baseline.
- Frontend verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/api.ts`, `src/hooks/useStarFocus.ts`, `src/components/MissionControlSidebar.tsx`, `src-tauri/src/config.rs`, `src-tauri/src/commands.rs`, and `src-tauri/src/lib.rs`.

<a id="1-4-star-focus-overlay-reassessment"></a>

## 1-4: Star Focus Overlay Reassessment

**Goal:** Decide whether the now-persistent sidebar Mission Control is sufficient or whether Star Focus needs an expanded tracking-station surface.

### Tasks
- [x] 1. Audit the current sidebar density with persistent mission history, maintenance controls, and active-session UI at sticky-note window widths.
- [x] 2. Decide whether an expanded tracking-station surface is needed for any of:
  launch cinematic payoff, orbit history browsing, or richer mission controls.
- [x] 3. If an expanded surface is justified, define the trigger, scope, and explicit v1 limits; if not, record that the sidebar remains the canonical Star Focus surface.
- [x] 4. Split the approved direction into follow-up implementation plans only after the product decision is locked.

### Decisions
- Persistent native storage removes one of the main blockers to evaluating a larger Star Focus surface honestly.
- Overlay work should still be justified by user-facing payoff, not by aesthetics alone.
- The current sticky-note baseline is too narrow to treat the fully expanded right sidebar as the honest long-term Star Focus surface:
  Tauri still defaults to a `380x560` window while the left and right rails already reserve roughly `176px` and `224px`.
- The right sidebar remains the fast-control Star Focus entry point, but an expanded in-window Tracking Station overlay is now justified for richer launch control, archive browsing, and starmap payoff.
- The overlay trigger should live in Mission Control itself, and sending a task to Focus may open the overlay directly when the rail is collapsed.
- The first overlay slice stays inside the same Tauri window and the same local persistence model:
  no separate native window, no 3D/WebGL scene, and no markdown/task-sync expansion.

### Notes
- This plan starts from the persistent sidebar baseline created in [1-3-star-focus-persistence-hardening](1-1-star-focus-mission-control-shell.md#1-3-star-focus-persistence-hardening).
- The next implementation slice is [1-5-star-focus-tracking-station-overlay-shell](1-1-star-focus-mission-control-shell.md#1-5-star-focus-tracking-station-overlay-shell).

<a id="1-5-star-focus-tracking-station-overlay-shell"></a>

## 1-5: Star Focus Tracking Station Overlay Shell

**Goal:** Add the first expanded Tracking Station surface while keeping the right Mission Control rail as Star Focus's quick-control entry point.

### Tasks
- [x] 1. Add a Tracking Station trigger from Mission Control, including an entry path when the rail is collapsed.
- [x] 2. Build the first expanded overlay shell with larger starmap, mirrored session controls, full local mission archive, and maintenance actions.
- [x] 3. Tighten the compact baseline so new Star Focus state does not assume the full right rail stays open inside the default sticky-note window.
- [x] 4. Re-run frontend and native verification after the new overlay shell lands.

### Decisions
- Tracking Station is an in-app modal overlay, not a separate Tauri window.
- The right rail remains the fast-control entry surface; the overlay mirrors the critical launch/live/archive controls instead of replacing the rail entirely.
- New Star Focus state should default to a collapsed right rail so the center sticky-task column remains usable in narrow windows.
- Focus selection can open Tracking Station directly when the rail is collapsed so the compact default does not hide the launch path.

### Notes
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/components/TrackingStationOverlay.tsx`, `src/components/MissionControlSidebar.tsx`, `src/App.tsx`, `src/hooks/useStarFocus.ts`, `src/styles/sticky.css`, and `src-tauri/src/config.rs`.

<a id="1-6-star-focus-compact-layout-and-overlay-polish"></a>

## 1-6: Star Focus Compact Layout And Overlay Polish

**Goal:** Make the compact sticky-note window and the new Tracking Station overlay feel intentional rather than merely workable.

### Tasks
- [x] 1. Reassess the remaining compact-window pressure now that Star Focus defaults to a collapsed rail:
  decide whether the left goals rail, the Tauri default window width, or both need follow-up changes.
- [x] 2. Refine overlay entry/exit behavior for key states such as restored sessions, session completion, and armed-but-not-launched tasks.
- [x] 3. Improve overlay archive and CTA clarity without expanding Star Focus beyond the current local-only v1 scope.
- [x] 4. Re-run frontend and native verification after the compact/layout polish lands.

### Decisions
- Keep the Tauri default window at `380x560` for now; the next compact fix should be rail coordination, not a wider default shell.
- New users now start with both the left goals rail and the right Mission Control rail collapsed.
- In compact window widths, expanding one side rail should auto-collapse the other so the center sticky-task column remains viable.
- Restored active sessions auto-open Tracking Station once when Mission Control is collapsed so the live session is visible after reload.
- Mission completion stays user-invoked:
  finishing a session should not pop Tracking Station over the sticky list unless the overlay is already open.
- Tracking Station should explain why it opened and what it retains through explicit armed/restored/completed banners and local archive-retention copy.

### Notes
- This plan starts from the overlay shell delivered in [1-5-star-focus-tracking-station-overlay-shell](1-1-star-focus-mission-control-shell.md#1-5-star-focus-tracking-station-overlay-shell).
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/App.tsx`, `src/hooks/useGoals.ts`, `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.

<a id="1-7-star-focus-archive-retention-and-browsing"></a>

## 1-7: Star Focus Archive Retention And Browsing

**Goal:** Decide how much Star Focus mission history to retain by default and whether the Tracking Station archive needs deeper browsing controls.

### Tasks
- [x] 1. Lock the default local archive policy:
  confirm whether the current eight-mission cap is the right v1 retention limit or whether it should change.
- [x] 2. If retention changes, update the frontend/native persistence model and archive copy without syncing Star Focus history into markdown task storage.
- [x] 3. Decide whether the archive needs deeper browsing controls such as pagination, filters, or a simple expanded recent-history view.
- [x] 4. Re-run frontend and native verification if the archive or persistence shape changes.

### Decisions
- The default local archive cap should increase from 8 to 12 missions so Tracking Station feels cumulative without becoming a long-term project ledger.
- The archive cap stays fixed in v1; it is not user-configurable yet.
- Native persistence should enforce the same archive cap as the frontend so the on-disk Star Focus file cannot drift past the product limit.
- Tracking Station does not need filters or pagination in v1; a simple `Recent` vs `Full` archive view is enough at a 12-mission cap.
- Mission numbering and orbit indexing must advance from the highest retained mission index, not from the retained-array length, so vehicle codes do not repeat once the archive reaches its cap.

### Notes
- This plan starts from the compact/layout baseline delivered in [1-6-star-focus-compact-layout-and-overlay-polish](1-1-star-focus-mission-control-shell.md#1-6-star-focus-compact-layout-and-overlay-polish).
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, `src/styles/sticky.css`, and `src-tauri/src/config.rs`.

<a id="1-8-star-focus-markdown-sync-reassessment"></a>

## 1-8: Star Focus Markdown Sync Reassessment

**Goal:** Decide whether Star Focus mission history should remain purely local or ever sync into the markdown/project storage model.

### Tasks
- [x] 1. Audit the current markdown-backed task model and identify what a mission-history sync would actually need to write or derive.
- [x] 2. Decide whether syncing completed Star Focus missions into project files adds enough user value to justify added schema and ownership complexity.
- [x] 3. If sync is justified, define the exact storage surface and explicit v1/v2 limits; if not, record that mission history remains native-local only.
- [x] 4. Split the approved direction into follow-up implementation plans only after the product decision is locked.

### Decisions
- The existing markdown storage model is intentionally task-centric: dated sections, checkbox state, and subtask aggregation. It does not have a clean home for Star Focus session timing, orbit numbering, or mission archive metadata.
- Completed Star Focus missions should remain native-local only in v1/v1.5. They should not sync into markdown task files or weekly project notes.
- Automatic markdown writes on mission completion would blur ownership between the sticky task source of truth and the additive Star Focus reward layer.
- If markdown export is ever revisited later, it should be treated as an explicit reporting/export surface rather than hidden mutation of the existing task files.

### Notes
- This plan starts from the archive-retention baseline delivered in [1-7-star-focus-archive-retention-and-browsing](1-1-star-focus-mission-control-shell.md#1-7-star-focus-archive-retention-and-browsing).
- The current markdown parser and file-sync path only read and write dated task sections. Supporting mission sync would require either app-specific metadata inside task files or a second markdown artifact with unclear ownership.
- Follow-up work should stay inside the native-local Star Focus surface. The next slice is [1-9-star-focus-archive-retention-settings](1-1-star-focus-mission-control-shell.md#1-9-star-focus-archive-retention-settings).

<a id="1-9-star-focus-archive-retention-settings"></a>

## 1-9: Star Focus Archive Retention Settings

**Goal:** Let users adjust how many local Star Focus missions are retained without changing the markdown-backed task model.

### Tasks
- [x] 1. Define a small v1 retention-control model that stays local-only and avoids bloating the quick Mission Control rail.
- [x] 2. Add the retention limit to the frontend/native Star Focus state shape with safe defaults and sanitization.
- [x] 3. Expose the control in Tracking Station, explain the retention tradeoff, and ensure archive/history views respect the active limit.
- [x] 4. Re-run frontend and native verification, then sync the repo tracking docs.

### Decisions
- The first configurable retention pass should stay inside Tracking Station rather than the quick Mission Control rail or the general app settings panel.
- The archive-cap control uses a small preset set: `6`, `12`, or `24` retained local missions.
- Changing the cap trims the retained local archive immediately; raising the cap only affects future retention because older trimmed missions are not restored.
- Mission history remains native-local only even after the cap becomes configurable; this plan does not introduce markdown sync.

### Notes
- This plan assumes the decision locked in [1-8-star-focus-markdown-sync-reassessment](1-1-star-focus-mission-control-shell.md#1-8-star-focus-markdown-sync-reassessment): Star Focus mission history remains native-local only.
- Frontend changes landed in `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, `src/App.tsx`, `src/types.ts`, and `src/styles/sticky.css`.
- Native sanitization now persists the archive limit in `src-tauri/src/config.rs` and constrains unsupported values back to the default preset.
- Verification: `npm run build:frontend`; `cargo +stable check --manifest-path src-tauri/Cargo.toml`.

<a id="1-10-star-focus-copy-density-polish"></a>

## 1-10: Star Focus Copy Density Polish

**Goal:** Keep the current Star Focus visual direction while reducing explanatory copy across Mission Control and Tracking Station.

### Tasks
- [x] 1. Audit the noisiest Star Focus empty, active, and archive states.
- [x] 2. Trim redundant explanatory copy in Mission Control without changing the current layout model.
- [x] 3. Trim Tracking Station copy and remove low-value descriptive panels that read like help text instead of controls.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Keep the current cinematic Star Focus look; this slice is copy-density reduction, not layout redesign.
- Prefer short state labels and compact support text over descriptive paragraphs.
- Remove redundant explanatory content before changing the visual system.

### Notes
- This slice intentionally preserves the current Star Focus structure while making the surfaces read more like an instrument panel.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx` and `src/components/TrackingStationOverlay.tsx`.

<a id="1-11-star-focus-guided-copy-minimization"></a>

## 1-11: Star Focus Guided Copy Minimization

**Goal:** Reduce Star Focus UI text to action-oriented guidance instead of explanatory prose.

### Tasks
- [x] 1. Remove low-value support copy from Mission Control state cards.
- [x] 2. Remove low-value support copy from Tracking Station state cards and banners.
- [x] 3. Keep only labels, metrics, and minimal action guidance where it helps the next step.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Star Focus should guide through labels and actions first, not by explaining the system.
- Empty and completed states should stay terse; users can infer structure from layout and controls.
- Descriptive helper text should only remain when it materially changes the next action.

### Notes
- This pass is intentionally narrower than `1-10`; it pushes the same visual direction further toward instrument-panel behavior.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx` and `src/components/TrackingStationOverlay.tsx`.

<a id="1-12-star-focus-hierarchy-trim"></a>

## 1-12: Star Focus Hierarchy Trim

**Goal:** Quiet the Star Focus surfaces further by removing duplicate secondary labels and readouts.

### Tasks
- [x] 1. Identify duplicate secondary labels that restate information already visible elsewhere.
- [x] 2. Remove low-value hierarchy markers from Mission Control without weakening the primary controls.
- [x] 3. Remove low-value hierarchy markers from Tracking Station and rebalance the caption alignment.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Prefer one strong readout over a label-plus-readout pair when the label is obvious from context.
- Trim hierarchy before changing the larger layout.
- Keep the Star Focus mood, but let the controls carry more of the meaning.

### Notes
- This slice removes duplicate phase/caption/archive labels rather than changing the Star Focus information architecture.
- Frontend changes landed in `src/components/MissionControlSidebar.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.

<a id="1-13-star-focus-orbital-map-realism-pass"></a>

## 1-13: Star Focus Orbital Map Realism Pass

**Goal:** Replace the placeholder-feeling orbital map with a more credible mission-telemetry scene that makes completed focus sessions feel earned.

### Tasks
- [x] 1. Audit why the current orbital map reads as decorative instead of operational.
- [x] 2. Build a shared orbital-scene component so Mission Control and Tracking Station use the same higher-fidelity map model.
- [x] 3. Add stronger trajectory, archive-marker, and live-craft visuals without expanding the copy density.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The realism pass stays within the current Star Focus product model: mission telemetry and accumulated orbits, not vehicle construction.
- Mission identity should come primarily from visual markers and vehicle codes instead of adding more explanatory text.
- Mission Control and Tracking Station should share one orbital-scene implementation so the visual language does not drift.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx`, `src/components/MissionControlSidebar.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.

<a id="1-14-star-focus-orbital-map-camera-controls"></a>

## 1-14: Star Focus Orbital Map Camera Controls

**Goal:** Add direct map interaction so the Star Focus orbital scene can be panned, zoomed, and tilted above or below without introducing a full 3D engine.

### Tasks
- [x] 1. Extend the shared orbital-scene component with local camera state for pan, zoom, and tilt.
- [x] 2. Add direct drag and wheel interaction plus compact camera controls that fit both Mission Control and Tracking Station.
- [x] 3. Keep the camera model lightweight and non-persistent so it stays within the v1 SVG/CSS telemetry approach.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Camera controls stay local to each rendered map instance and reset with the component instead of becoming persisted user settings.
- The above/below view is a pseudo-3D camera tilt built with CSS perspective and SVG, not real 3D assets or a WebGL renderer.
- Dragging and zooming should happen directly on the map surface, while the explicit camera buttons stay compact and secondary.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-15-star-focus-compressed-solar-system-pass"></a>

## 1-15: Star Focus Compressed Solar System Pass

**Goal:** Make the Star Focus map feel more like a believable solar system by adding celestial bodies, depth cues, and astronomical texture without abandoning the current lightweight renderer.

### Tasks
- [x] 1. Add distinct solar-system bodies to the shared orbital scene so the view reads as space instead of only telemetry.
- [x] 2. Layer in astronomical texture such as a moon, asteroid belt, and ringed outer planet while preserving mission markers and controls.
- [x] 3. Keep the scene compressed and stylized enough to remain readable inside Mission Control and Tracking Station.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The solar-system pass remains a compressed visual metaphor rather than a literal scientific scale model.
- Mission craft and archive markers stay visible on top of the celestial scene instead of being replaced by decorative planets.
- The implementation stays in the shared SVG/CSS renderer rather than escalating to canvas or WebGL.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-16-star-focus-orbital-map-declutter-pass"></a>

## 1-16: Star Focus Orbital Map Declutter Pass

**Goal:** Keep the new solar-system feel while removing the visual clutter that made the map read as busy instead of deliberate.

### Tasks
- [x] 1. Identify the highest-noise elements in the shared orbital scene.
- [x] 2. Reduce the number of simultaneous celestial bodies, tags, and guide elements without losing the realism pass.
- [x] 3. Differentiate the sidebar and overlay density so Mission Control stays calmer than Tracking Station.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The sidebar should carry a lighter scene than Tracking Station instead of mirroring the full overlay density.
- Celestial bodies and archive markers stay, but only the highest-value ones should compete for attention at once.
- Cleanup should come from subtraction and quieter styling, not by replacing the solar-system direction.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-17-star-focus-sidebar-map-simplification"></a>

## 1-17: Star Focus Sidebar Map Simplification

**Goal:** Make the Mission Control sidebar map quieter by removing overlay-style HUD and camera chrome while preserving the richer Tracking Station experience.

### Tasks
- [x] 1. Identify which sidebar map elements still read as unnecessary chrome after the declutter pass.
- [x] 2. Remove the sidebar HUD and camera dock so the orbital scene can sit as background atmosphere rather than a second control panel.
- [x] 3. Keep Tracking Station as the primary rich interaction surface for camera controls and map readouts.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The sidebar keeps direct map interaction available, but visible camera chrome belongs to Tracking Station only.
- The overlay should own the explicit map readouts and camera buttons; the sidebar should stay faster and quieter.
- This slice is subtraction only and does not alter the shared scene model itself.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx`.

<a id="1-18-star-focus-orbital-map-materials-pass"></a>

## 1-18: Star Focus Orbital Map Materials Pass

**Goal:** Make the shared orbital map feel more premium and astronomical by improving planetary materials, atmospheric depth, and overlay-first scene polish.

### Tasks
- [x] 1. Add richer material detail to the shared celestial bodies so they read as planets instead of flat circles.
- [x] 2. Add deeper-space atmosphere through restrained nebula and vignette layers without reintroducing clutter.
- [x] 3. Bias the richer texture treatment toward Tracking Station while keeping the sidebar restrained.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The next realism gain comes from better materials and atmosphere, not from adding more objects or controls.
- Planet texture details stay lightweight and stylized; they should suggest real surfaces without trying to become a literal simulator.
- Overlay-first polish remains the rule: Tracking Station can carry the richer finish while the sidebar stays secondary.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-19-star-focus-tracking-station-cinematic-polish"></a>

## 1-19: Star Focus Tracking Station Cinematic Polish

**Goal:** Make Tracking Station feel more cinematic and premium by deepening scene atmosphere and planetary rendering without adding more chrome.

### Tasks
- [x] 1. Add richer surface detail to the shared celestial bodies so the scene feels less schematic.
- [x] 2. Deepen the shared space atmosphere with restrained nebula and vignette framing.
- [x] 3. Keep the richer finish biased toward Tracking Station while the sidebar remains quieter.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The next gain should come from materials, lighting, and framing instead of new controls or more scene clutter.
- Planet textures should stay stylized and lightweight inside SVG/CSS rather than expanding into real 3D assets or WebGL.
- Tracking Station remains the richer orbital-view surface while Mission Control stays intentionally restrained.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-20-star-focus-projected-3d-orbital-pass"></a>

## 1-20: Star Focus Projected 3D Orbital Pass

**Goal:** Rebuild the shared Star Focus orbital scene as a projected 3D view so Tracking Station feels more spatial without pulling the app into full WebGL.

### Tasks
- [x] 1. Replace the flat orbit layout with a projected 3D orbital scene in the shared renderer.
- [x] 2. Update drag/zoom/tilt behavior so the user can orbit the camera around the scene instead of only panning a flat map.
- [x] 3. Tune the atmosphere and depth styling so the 3D pass still feels premium and controlled rather than noisy.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The first 3D pass should stay inside SVG/CSS with projected depth instead of jumping immediately to Three.js or WebGL.
- Tracking Station remains the main beneficiary of the richer 3D view while Mission Control still stays quieter and lighter.
- The scene should read as a believable orbital display, not a literal simulator or vehicle-construction game.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-21-star-focus-planet-detail-pass"></a>

## 1-21: Star Focus Planet Detail Pass

**Goal:** Increase fine-grained planetary detail in the shared Star Focus orbital scene so the bodies feel more tactile and premium at close inspection.

### Tasks
- [x] 1. Expand per-planet surface detail so Earth, Venus, Mars, and Saturn each read more distinctly.
- [x] 2. Improve lighting cues with better terminators, rims, and moon detail.
- [x] 3. Refine Saturn's ring treatment so it feels less flat in the projected 3D scene.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Fine-grained fidelity should come from surface/material treatment, not more labels or more scene widgets.
- Planet detail remains stylized and readable rather than pushing into photoreal simulation.
- Shared scene improvements still need to scale down cleanly into the quieter Mission Control sidebar.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-22-star-focus-planet-motion-and-atmosphere-pass"></a>

## 1-22: Star Focus Planet Motion And Atmosphere Pass

**Goal:** Make the projected Star Focus planets feel more alive by adding restrained motion, atmosphere shells, and stronger ring-shadow treatment.

### Tasks
- [x] 1. Add subtle body rotation and drifting weather/band motion where it improves the read.
- [x] 2. Add outer atmosphere/limb shells so Earth, Venus, Mars, and Saturn feel less flat against space.
- [x] 3. Improve Saturn's ring interaction with the planet face through a clearer shadow treatment.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Planet motion should stay slow and almost ambient; it should reward close inspection rather than turn the scene into a toy.
- Atmosphere shells should support realism and separation from the background without creating a heavy glow effect.
- The richer body treatment still needs to scale down acceptably into the quieter sidebar view.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-23-star-focus-lighting-and-ring-occlusion-pass"></a>

## 1-23: Star Focus Lighting And Ring Occlusion Pass

**Goal:** Improve the projected Star Focus planets with more physically believable lighting and clearer Saturn ring occlusion across the planet face.

### Tasks
- [x] 1. Make body highlights, night-side shading, and base surface gradients respond to the actual sun direction in the projected scene.
- [x] 2. Improve atmosphere shells and rim lighting so lit edges feel more believable at different camera angles.
- [x] 3. Replace the loose Saturn ring shadow cue with ring occlusion that follows the actual projected ring path across the disc.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Lighting cues should follow scene geometry and remain understated instead of turning into flashy effects.
- The projected scene still stays inside SVG/CSS; physically better lighting comes before any move to heavier 3D rendering tech.
- Saturn ring interaction should read from actual projected ring geometry instead of a generic shadow band.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-24-star-focus-ring-structure-and-scattering-pass"></a>

## 1-24: Star Focus Ring Structure And Scattering Pass

**Goal:** Improve local depth realism in the projected Star Focus planets through richer Saturn ring structure and better atmospheric scattering falloff.

### Tasks
- [x] 1. Add more granular Saturn ring breakup and thickness variation without making the scene noisy.
- [x] 2. Expand planet-shell rendering with layered atmosphere falloff and light-side scattering.
- [x] 3. Keep the richer local depth cues readable in both Tracking Station and the quieter sidebar view.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Ring realism should come from layered structure and breakup, not from adding more bodies or HUD complexity.
- Atmospheric falloff should be strongest on the lit edge and remain subtle enough to read as realism instead of glow-heavy decoration.
- The shared scene still prioritizes inspection-friendly stylization over literal simulation.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-25-star-focus-disc-microtexture-pass"></a>

## 1-25: Star Focus Disc Microtexture Pass

**Goal:** Add finer disc-level microtextures so the projected Star Focus planets hold up better under close inspection without making the sidebar noisy.

### Tasks
- [x] 1. Add subtle disc-level microvariation for rocky planets through ridges, currents, and dunes.
- [x] 2. Add finer gas-giant and cloud-deck striations so Saturn and Venus feel less flat at close range.
- [x] 3. Keep the extra microdetail biased toward Tracking Station while the sidebar stays quieter.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Microtextures should deepen the read of the existing bodies, not compete with the macro lighting and ring structure.
- The sidebar still needs reduced intensity, so the smallest linework should stay quieter there than in the overlay.
- The effect remains stylized and inspection-friendly rather than moving toward literal photoreal noise.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.

<a id="1-26-star-focus-phase-responsive-material-pass"></a>

## 1-26: Star Focus Phase Responsive Material Pass

**Goal:** Make the shared Star Focus orbital scene react more believably to mission state through phase-responsive materials, atmosphere, and motion pacing instead of adding more chrome.

### Tasks
- [x] 1. Feed the shared orbital viewport a reliable phase theme even when it is reused across sidebar and Tracking Station surfaces.
- [x] 2. Tune atmosphere, rim light, glow, ring intensity, and solar wash by mission phase so the scene feels more alive.
- [x] 3. Adjust background energy and subtle texture/weather motion pacing per phase without making the scene gamey.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Phase response should deepen the feel of a live mission state, not add more labels, banners, or descriptive copy.
- The effect stays physically suggestive and restrained, with calmer idle/orbit states and hotter ignition/heating states.
- Tracking Station keeps the fuller read, while the sidebar still inherits the quieter visual baseline.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`

<a id="1-27-star-focus-weather-layer-lock-pass"></a>

## 1-27: Star Focus Weather Layer Lock Pass

**Goal:** Keep atmospheric and cloud layers visually locked to each planet so close-up inspection reads as a coherent body instead of a drifting overlay.

### Tasks
- [x] 1. Reduce the weather-layer translation amplitudes so cloud and band groups stop reading as detached decals.
- [x] 2. Rework the shared weather-drift animation toward a subtler shimmer instead of obvious lateral sliding.
- [x] 3. Keep the planets alive without reintroducing the sloppy drifting effect in Tracking Station or the sidebar.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- The planetary bodies already have enough life from body rotation, lighting, and phase response; weather motion should stay secondary.
- Believability matters more than movement quantity, so the right fix is smaller, more centered motion rather than more animated layers.
- The correction should apply to the shared map so sidebar and overlay stay visually aligned.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`

<a id="1-28-star-focus-spherical-falloff-pass"></a>

## 1-28: Star Focus Spherical Falloff Pass

**Goal:** Tighten the projected planets so their weather, bands, and surface detail read as volume wrapped around a sphere instead of flat painted layers.

### Tasks
- [x] 1. Remove the remaining lateral weather-layer slip from the shared drift animation.
- [x] 2. Add stronger limb/detail falloff so the planetary edges read less like flat badges.
- [x] 3. Lower cloud and band contrast where needed so the bodies feel less posterized at close range.
- [x] 4. Re-run frontend verification and sync the repo tracking docs.

### Decisions
- Realism gains should come from stronger spherical read and quieter detail, not from adding more UI chrome or more moving parts.
- The weather layers now rely on tiny breathing motion plus parent rotation instead of visible translation.
- Close-up realism still stays stylized, but the planets should now hold together better as single volumes.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap.tsx` and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`

<a id="1-29-star-focus-true-3d-tracking-foundation"></a>

## 1-29: Star Focus True 3D Tracking Foundation

**Goal:** Start the first real WebGL/Three.js orbital scene for Star Focus by moving Tracking Station onto a true 3D renderer while keeping the sidebar on the lighter projected SVG path.

### Tasks
- [x] 1. Add the minimum 3D runtime dependency needed for a true orbital scene.
- [x] 2. Build a new true 3D Tracking Station map with real meshes, camera orbit, lighting, motion, and mission markers.
- [x] 3. Lazy-load the 3D renderer so the main sticky-note shell does not pay the full WebGL cost up front.
- [x] 4. Keep the sidebar map stable on the existing SVG path and re-run frontend verification.

### Decisions
- The first true 3D slice belongs in Tracking Station, not the sidebar, because the overlay has the space and intent for a heavier scene.
- The 3D map should load on demand with a projected-SVG fallback so the baseline app shell stays lighter.
- The first pass uses procedural materials and lightweight meshes instead of external assets, keeping the foundation portable inside the current repo.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`, `src/components/TrackingStationOverlay.tsx`, and `src/styles/sticky.css`.
- Dependency change: `three`
- Verification: `npm run build:frontend`

<a id="1-30-star-focus-3d-material-realism-pass"></a>

## 1-30: Star Focus 3D Material Realism Pass

**Goal:** Deepen the true 3D Tracking Station renderer with layered materials, cloud shells, and textured rings so the WebGL scene reads more like a rendered system than a first-pass procedural mockup.

### Tasks
- [x] 1. Replace the first-pass 3D body materials with layered surface, bump, and roughness maps where the planets need them.
- [x] 2. Add separate cloud and atmosphere shells so Earth and Venus feel more volumetric in the true 3D view.
- [x] 3. Replace Saturn's flat stacked ring bands with a textured ring material and retune the scene loop around the new assets.
- [x] 4. Re-run frontend verification and record the new 3D realism boundary in the tracking docs.

### Decisions
- Keep the realism pass procedural and asset-free so the 3D scene stays portable inside the current repo.
- Spend this slice on material layering and body depth, not on adding more HUD chrome or scene objects.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-31-star-focus-3d-atmosphere-and-shadow-pass"></a>

## 1-31: Star Focus 3D Atmosphere And Shadow Pass

**Goal:** Make the true 3D Tracking Station scene feel deeper and less synthetic by giving the planets fresnel-style atmosphere glow, shadow-enabled lighting, and stronger ring occlusion cues.

### Tasks
- [x] 1. Replace the flat outer atmosphere layer with a fresnel-style glow shell in the true 3D renderer.
- [x] 2. Enable stable shadow cues for the 3D scene and retune the main light around them.
- [x] 3. Improve Saturn ring depth with alpha-tested occlusion and view-angle-based brightness.
- [x] 4. Re-run frontend verification and record the new 3D lighting boundary in the tracking docs.

### Decisions
- Use lightweight shader materials only for the atmosphere shell instead of moving the full planet stack onto custom shaders.
- Keep the new shadows restrained and local to the overlay renderer so the sidebar/fallback path stays unchanged.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-32-star-focus-3d-solar-lighting-and-depth-pass"></a>

## 1-32: Star Focus 3D Solar Lighting And Depth Pass

**Goal:** Push the true 3D Tracking Station scene further away from a clean diagram by making atmosphere and ring glow respond more directly to the sun angle and by adding layered starfield depth behind the system.

### Tasks
- [x] 1. Make the 3D atmosphere glow respond to both camera angle and sun direction instead of only using a view-facing fresnel shell.
- [x] 2. Improve Saturn ring lighting so brightness and glow react to both viewing angle and sun angle.
- [x] 3. Replace the single flat star cloud with layered background depth in the true 3D scene.
- [x] 4. Re-run frontend verification and record the new 3D lighting-and-depth boundary in the tracking docs.

### Decisions
- Keep the planet bodies on Three.js physical materials and only extend the atmosphere shell with a small shader pass.
- Use lightweight procedural point layers for the background depth instead of adding external skybox assets.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-33-star-focus-3d-occultation-and-night-detail-pass"></a>

## 1-33: Star Focus 3D Occultation And Night Detail Pass

**Goal:** Add more local realism to the true 3D Tracking Station renderer by giving Earth a dark-side light pass and Saturn a dedicated ring-shadow cue instead of relying only on broad scene lighting.

### Tasks
- [x] 1. Add a dark-side light pass for Earth in the true 3D renderer.
- [x] 2. Add a dedicated Saturn ring-shadow overlay so the globe reads more like a lit body under ring occlusion.
- [x] 3. Keep the new details tied to the live light direction instead of baking them in as flat decals.
- [x] 4. Re-run frontend verification and record the new 3D local-detail boundary in the tracking docs.

### Decisions
- Keep the new local-detail cues shader-backed and planet-specific instead of moving the entire body stack to custom materials.
- Use restrained night-light intensity so Earth gains realism without turning into a decorative sci-fi object.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-34-star-focus-3d-reflected-light-pass"></a>

## 1-34: Star Focus 3D Reflected Light Pass

**Goal:** Push the true 3D Tracking Station renderer toward a more optical, rendered feel by adding reflected-light cues instead of only more direct glow and shadow.

### Tasks
- [x] 1. Add an Earth ocean-glint pass that responds to the live sun/camera relationship.
- [x] 2. Add a subtle Earthshine fill for the Moon so the Earth-Moon pair feels more physically related.
- [x] 3. Keep the new reflected-light cues restrained and tied to the existing light model.
- [x] 4. Re-run frontend verification and record the new 3D reflected-light boundary in the tracking docs.

### Decisions
- Keep the ocean glint in a separate shader overlay instead of rebuilding the full Earth material stack around a custom BRDF.
- Use a low-intensity Earth-centered fill light for Moon Earthshine because it is cheap, stable, and visually legible in the current overlay scene.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-35-star-focus-3d-eclipse-and-transit-pass"></a>

## 1-35: Star Focus 3D Eclipse And Transit Pass

**Goal:** Add more body-to-body realism to the true 3D Tracking Station renderer by letting the Earth-Moon pair show eclipse and transit cues instead of behaving like separately lit objects.

### Tasks
- [x] 1. Add a moon-transit shadow cue on Earth that follows the live Earth-Moon-sun alignment.
- [x] 2. Add lunar-eclipse shading so the Moon reacts when it moves into Earth's shadow.
- [x] 3. Keep the new interaction driven by the existing orbital geometry instead of hardcoded timelines or static decals.
- [x] 4. Re-run frontend verification and record the new 3D eclipse-and-transit boundary in the tracking docs.

### Decisions
- Keep the Earth transit cue as a shader overlay on the globe instead of attempting a full volumetric shadow projection system.
- Treat lunar eclipse as a restrained material response on the Moon mesh so the effect stays legible in the current compressed orbital scene.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-36-star-focus-3d-phase-rim-pass"></a>

## 1-36: Star Focus 3D Phase Rim Pass

**Goal:** Make the true 3D Tracking Station renderer show clearer planetary phases by adding restrained crescent/rim overlays to the bodies that benefit most from visible phase separation.

### Tasks
- [x] 1. Add phase-rim overlays for key planets so Venus and the inner bodies show clearer crescent behavior.
- [x] 2. Add a matching rim pass for the Moon so close inspection reads more like a phased body than a flat lit sphere.
- [x] 3. Keep the new rim cues subtle and tied to live sun/camera geometry instead of turning into decorative glow.
- [x] 4. Re-run frontend verification and record the new 3D phase-rim boundary in the tracking docs.

### Decisions
- Use additive shader overlays for phase rims instead of replacing the base body materials, keeping the new pass isolated and easy to tune.
- Focus the strongest rim read on Venus and the Moon because they benefit most visibly from the new phase behavior in the current compressed scene.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-37-star-focus-3d-scattering-pass"></a>

## 1-37: Star Focus 3D Scattering Pass

**Goal:** Push the true 3D Tracking Station renderer further toward a rendered-system feel by separating atmospheric terminator color from day/night glow and giving Saturn's rings a more optical scattering response.

### Tasks
- [x] 1. Upgrade the 3D atmosphere glow so day, terminator, and night contributions can carry different color cues.
- [x] 2. Replace the flat Saturn ring glow with a light/view-responsive scattering shader.
- [x] 3. Keep the new scattering behavior tied to the existing light geometry instead of adding more scene objects.
- [x] 4. Re-run frontend verification and record the new 3D scattering boundary in the tracking docs.

### Decisions
- Extend the existing atmosphere shader instead of creating a separate second atmosphere effect layer.
- Move Saturn's glow pass onto a shader so the ring can respond more like a thin scattering surface instead of a constant additive band.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-38-star-focus-3d-cloud-shadow-coupling-pass"></a>

## 1-38: Star Focus 3D Cloud-Shadow Coupling Pass

**Goal:** Make Earth and Venus feel more like lit bodies by coupling the visible cloud shells to subtle surface shadow passes in the true 3D Tracking Station renderer.

### Tasks
- [x] 1. Add a cloud-shadow surface shader that can reuse the existing cloud alpha maps on Earth and Venus.
- [x] 2. Keep the shadow pass synchronized with the visible cloud-shell motion so the layered read stays coherent under inspection.
- [x] 3. Retune cloud brightness slightly so the shells and their surface shadows read as one lighting system instead of separate decals.
- [x] 4. Re-run frontend verification and record the new 3D cloud-shadow boundary in the tracking docs.

### Decisions
- Use a restrained surface-shadow overlay on the planet body instead of adding another volumetric cloud-light system.
- Keep the effect limited to Earth and Venus, where the cloud shells are already prominent enough for the added depth to matter.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-39-star-focus-3d-cloud-shell-scattering-pass"></a>

## 1-39: Star Focus 3D Cloud-Shell Scattering Pass

**Goal:** Make Earth and Venus cloud shells feel more atmospheric by giving them day/night/terminator behavior and a restrained sun-view scattering response in the true 3D Tracking Station renderer.

### Tasks
- [x] 1. Replace the flat Earth/Venus cloud-shell material with a shader-driven shell that can respond to sun angle and camera angle.
- [x] 2. Add darker night-side cloud behavior, warmer/cooler terminator color, and a restrained silver-lining effect so the shells read more volumetric.
- [x] 3. Keep the new cloud-shell lighting tied to the existing cloud motion and mission-phase modulation instead of adding new scene chrome.
- [x] 4. Re-run frontend verification and record the new 3D cloud-shell boundary in the tracking docs.

### Decisions
- Upgrade the cloud shells themselves instead of stacking another glow-only layer on top of them.
- Keep the cloud-shell scattering subtle so the scene stays cinematic rather than turning into a loud VFX pass.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-40-star-focus-3d-atmosphere-shell-depth-pass"></a>

## 1-40: Star Focus 3D Atmosphere-Shell Depth Pass

**Goal:** Make the true 3D planets feel less flat by replacing the front atmosphere shell with a light- and view-responsive haze layer that reacts to day, terminator, and limb angle.

### Tasks
- [x] 1. Replace the flat front atmosphere shell with a shader-driven shell that can respond to sun angle and camera angle.
- [x] 2. Give Earth, Venus, Mars, and the outer haze different day, terminator, and night color behavior so the atmospheres feel less generic.
- [x] 3. Keep the new shell tied to the existing mission-phase atmosphere modulation instead of expanding the UI or scene scope.
- [x] 4. Re-run frontend verification and record the new 3D atmosphere-shell boundary in the tracking docs.

### Decisions
- Upgrade the front atmosphere shell itself instead of stacking another decorative glow layer above it.
- Keep the shell on normal alpha blending so the front haze reads as depth over the body rather than another additive flare pass.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-41-star-focus-3d-background-depth-pass"></a>

## 1-41: Star Focus 3D Background-Depth Pass

**Goal:** Make the true 3D Tracking Station feel less empty by adding richer layered background depth behind the planetary system without introducing more UI chrome.

### Tasks
- [x] 1. Add deeper far and near nebula layers so the scene has more parallax-rich space texture behind the solar system.
- [x] 2. Add broad dust-haze veils through the system plane so the planets feel embedded in an environment rather than floating in empty black.
- [x] 3. Keep the new background motion restrained and ambient so the renderer stays cinematic instead of becoming a noisy VFX scene.
- [x] 4. Re-run frontend verification and record the new 3D background-depth boundary in the tracking docs.

### Decisions
- Use a small number of textured sprite and veil layers instead of pushing the background toward a literal volumetric nebula simulation.
- Keep the background work scene-only; do not add new overlays, captions, or HUD framing to explain it.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-42-star-focus-3d-solar-scatter-pass"></a>

## 1-42: Star Focus 3D Solar-Scatter Pass

**Goal:** Make the true 3D solar system feel more star-lit by giving the sun a richer flare structure and a restrained illuminated scatter band through the system plane.

### Tasks
- [x] 1. Add a more structured solar flare texture instead of relying only on the core, corona, and halo spheres.
- [x] 2. Add a thin sun-lit scatter veil through the inner system so the star feels like it is illuminating surrounding dust instead of just glowing on its own.
- [x] 3. Tie the new solar layers into the existing mission-phase light tuning instead of adding more UI or scene chrome.
- [x] 4. Re-run frontend verification and record the new 3D solar-scatter boundary in the tracking docs.

### Decisions
- Keep the flare work sprite-based and centered on the sun rather than introducing a full post-processing bloom pipeline.
- Keep the solar scatter restrained so it supports realism and framing instead of becoming an obvious lens-effect gimmick.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-43-star-focus-3d-shadow-interaction-pass"></a>

## 1-43: Star Focus 3D Shadow-Interaction Pass

**Goal:** Make the true 3D system feel more physically lit by improving how transparent and thin geometry participates in the shared solar shadow path.

### Tasks
- [x] 1. Add masked shadow materials for cloud shells so Earth and Venus can cast more believable alpha-shaped shadows into the scene.
- [x] 2. Extend the same masked shadow treatment to Saturn's rings and rebalance the older ring-shadow overlay so the result feels less duplicated.
- [x] 3. Tighten the main solar shadow-map settings so the local shadow interaction reads more clearly without turning harsh.
- [x] 4. Re-run frontend verification and record the new 3D shadow-interaction boundary in the tracking docs.

### Decisions
- Use alpha-tested custom depth/distance materials for transparent geometry instead of layering more fake darkening passes on top.
- Keep the older custom ring-shadow cue, but reduce its weight now that the real shadow path is stronger.

### Notes
- Frontend changes landed in `src/components/StarFocusOrbitalMap3D.tsx`.
- Verification: `npm run build:frontend`

<a id="1-44-star-focus-solar-route-layout-pass"></a>

## 1-44: Star Focus Solar Route Layout Pass

**Goal:** Reframe Focus Mode around a clear task, timer, and solar-system destination while making the Tracking Station useful at both compact and wide window sizes.

### Tasks

- [x] 1. Audit the compact and wide Tracking Station layouts in the rendered app.
- [x] 2. Add a deterministic Solar Route model that maps completed focus legs to named destinations without expanding the persisted state schema.
- [x] 3. Rebuild the Tracking Station hierarchy around the current route, primary focus controls, and one dominant orbital scene.
- [x] 4. Tighten the Mission Control sidebar so route progress is visible without adding more map chrome.
- [x] 5. Verify idle, armed, and active states at compact and wide breakpoints, then sync user-facing and tracking docs.

### Decisions

- Rename the expanded surface to Focus Mode while retaining Star Focus and Tracking Station as the product and instrument identities.
- Treat every completed focus session as one route leg from an origin to a named destination.
- Derive the route leg from the highest retained mission orbit index so the feature needs no Rust or persistence migration.
- Keep duration as focus-burn length, not fictional astronomical travel time.
- Put the task, remaining time, and session controls before the orbital scene on compact windows.
- Keep archive retention and destructive maintenance controls visually secondary to the live focus workflow.

### Notes

- Baseline visual QA found that compact header stats pushed the Flight Deck below the fold, while the wide Flight Deck spent most of its height empty in idle state.
- The route loops through Earth → Moon → Venus → Mars → Saturn → Earth and advances from the highest retained mission orbit index.
- Frontend changes landed in `src/starFocusJourney.ts`, `src/components/TrackingStationOverlay.tsx`, `src/components/MissionControlSidebar.tsx`, both orbital-map components, and `src/styles/sticky.css`.
- Verification: `npm run build:frontend`, plus Playwright visual checks at `460x720` and `1100x760` for idle, armed, active, map, and expanded-rail states.
