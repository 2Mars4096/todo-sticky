# Architecture

## Tech Stack

- [ ] Languages: TypeScript/TSX for the frontend, Rust for the Tauri native layer, Markdown for task storage.
- [ ] Frameworks: React 18, Vite 6, Tauri 2, Three.js, date-fns, react-day-picker.
- [ ] Build and test tools: `vite build`, `npx tauri dev`, `npx tauri build`; there is no established automated test suite yet.
- [ ] Runtime or deployment targets: desktop app for macOS, Windows, and Linux.

## Repository Layout

- [ ] `src/`: React application shell, task UI components, hooks, API bridge, and global sticky-note styling.
- [ ] `src-tauri/`: Rust commands, config, markdown/file-sync logic, tray/window behavior, and native app packaging.
- [ ] `docs/`: live project tracking, roadmap, plans, changelog, bugs, and architecture notes.
- [ ] `content/`: markdown-backed task data under `content/to-do/`.
- [ ] Other top-level directories: `demo/` for assets, `scripts/` for build/demo utilities, `dist/` for built frontend assets.
- [ ] `PRODUCT.md` and `DESIGN.md`: strategic product context and the reusable visual-system contract for future frontend work.

## Ready Shell Modules

- [ ] `src/App.tsx`: coordinates the one-time collapsed-rail layout migration, 760px compact breakpoint, overlay-panel dismissal, top task composer, action feedback, day-first view default, compact action-bar AI provider switching, and task-context handoff for album recommendations.
- [ ] `src/components/AlbumRecommendations.tsx`: presents the configured AI provider's four-album work soundtrack in a dismissible paper-toned sheet above the action bar, with loading, regenerate, Escape, and compact-layout states.
- [ ] `src/components/WindowResizeHandles.tsx`: maps generous edge/corner pointer zones to Tauri native resize dragging for the frameless window.
- [ ] `src/components/AddTask.tsx` and `src/components/TaskList.tsx`: keep task capture at the top, expose per-item prompt handoff, provide an instructional empty state for today, route empty past/future dates directly back to today, and scope drag-reordering to top-level tasks or subtasks within one parent.
- [ ] `src/taskTransfer.ts` and `src/clipboard.ts`: generate local execution-agent prompts and write them through the official Tauri clipboard plugin; ordinary text copy/paste stays with the native focused-field behavior.
- [ ] `src/taskCarryForward.ts`: resolves the local-date destination and user-facing action label for past, current, and future task dates.
- [ ] `src/llmProviders.ts`: centralizes provider labels, presets, configured-state checks, and safe switching between API-backed profiles and the keyless local Codex profile.
- [ ] `src/hooks/useTasks.ts` and `src/components/TaskItem.tsx`: keep task mutations and direct row actions reachable, including destination-aware carry-forward and Markdown-persisted pointer/keyboard reordering; compact CSS wraps the action strip below task text.
- [ ] `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `src-tauri/capabilities/default.json`: define the `todo-sticky` default desktop target and bundle name, the `460x640` default, the `340x440` minimum, and native resize-drag permission so the sibling task API CLI cannot become the bundled executable.
- [ ] `src-tauri/src/lib.rs`: positions a fresh window at the top-right of the current monitor work area, shows it from `RunEvent::Ready`, preserves later user placement, and installs native macOS Copy/Paste menu responders for focused editable text.

## Star Focus Modules

- [ ] `src/App.tsx`: app-shell coordination for compact window widths, rail exclusivity, and Tracking Station auto-open behavior for restored sessions.
- [ ] `src/hooks/useStarFocus.ts`: Star Focus state, pause/resume lifecycle, reload-safe active sessions, configurable local archive-retention presets, dev-only mission time-scale simulation, mission numbering, migration from legacy localStorage, and native-backed persistence saves.
- [ ] `src/starFocusJourney.ts`: deterministic Earth/Moon/Venus/Mars/Saturn route projection derived from retained mission orbit indexes without adding persisted state.
- [ ] `src/components/MissionControlSidebar.tsx`: right-sidebar Mission Control shell, next-destination route readout, lightweight orbital telemetry, session controls, mission-history UI, and maintenance controls.
- [ ] `src/components/TrackingStationOverlay.tsx`: expanded responsive Focus Mode with task-first controls, a dominant true 3D Tracking Station map, compact-first ordering, named route progress, travel-log browsing, archive-cap controls, and projected-SVG fallback.
- [ ] `src/components/StarFocusOrbitalMap.tsx`: lighter SVG/CSS orbital-scene renderer retained for Mission Control and as the Tracking Station fallback, with projected celestial bodies, fine-grained surface textures and microtextures, scene-aware lighting, restrained body motion, moon/ring detail, layered atmosphere shells and scattering, phase-responsive material tuning, locked weather-layer motion, stronger spherical limb falloff, live trajectory, archive markers, telemetry HUD readouts, and local orbit-camera zoom/tilt controls.
- [ ] `src/components/StarFocusOrbitalMap3D.tsx`: true WebGL/Three.js orbital scene for Tracking Station with real meshes, camera orbit controls, layered procedural surface/bump/roughness materials, shader-driven front atmosphere haze, Earth/Venus cloud-shadow coupling beneath shader-driven cloud shells, alpha-aware solar shadow interaction for cloud shells and rings, color-separated atmosphere scattering, shadow-enabled lighting, richer sun flare and solar scatter structure, inner-body phase rims, Earth dark-side lights, Earth ocean glint, Earth-Moon eclipse/transit cues, Moon Earthshine, Saturn ring-shadow detail, Saturn ring scattering, textured rings, layered starfield depth, nebula veils and dust-haze background depth, archive markers, and a live mission craft path.
- [ ] `src/components/TaskList.tsx` and `src/components/TaskItem.tsx`: explicit task-to-Mission-Control handoff plus active-session selection locking.
- [ ] `src/components/DevToolsPanel.tsx`: development-only debug tray for seeding tasks, reloading task state, clearing the current day, and changing Star Focus mission speed during local testing.
- [ ] `src/api.ts`: Tauri bridge for Star Focus load/save, task operations, and structured LLM requests including task-aware album recommendations.
- [ ] `src/components/SettingsPanel.tsx` and `src-tauri/src/llm.rs`: AI provider settings and native LLM calls for task breakdown, scheduling, and task-aware album recommendations. API adapters include Moonshot Kimi, OpenRouter, OpenAI, Anthropic, Gemini, and custom OpenAI-compatible endpoints; the Codex adapter instead launches the locally authenticated CLI with provider-specific executable/model controls.
- [ ] `src-tauri/src/config.rs` and `src-tauri/src/commands.rs`: native app-data persistence for Star Focus state plus general settings, including archive-cap sanitization, backward-compatible per-provider AI profiles, and macOS account-home resolution that keeps task/config roots independent of launcher-provided environment overrides.
- [ ] `src-tauri/src/task_api.rs` and `src-tauri/src/bin/sticky-todo-api.rs`: shared Markdown-backed task extraction and CRUD, stable task IDs, optimistic revision checks, Tauri command reuse, and the cross-session JSON CLI.

## Conventions

- Keep tracking docs in `docs/`
- Keep plans in `docs/plans/` with hierarchical numbering
- Keep changelog entries in descending order
- Record failed approaches in `docs/bugs.md`
- Update `README.md` when setup or user-facing behavior changes
- Keep the sticky todo workflow primary; Star Focus should layer onto it rather than replace it.
- Lock product/design decisions in plan docs before implementing major UI concepts like the starmap sidebar or cinematic mission sequences.
- Gate local debug affordances behind `import.meta.env.DEV` so they do not leak into production UX.
- Start Star Focus with a frontend-only integration slice before adding Rust commands or markdown schema changes.
- Keep task content as the existing markdown-backed source of truth even as Star Focus mission/session state moves into native local persistence.
- Keep agent task automation behind the shared native task API; use extract-before-mutate revisions and persistent Markdown ID comments instead of UI automation or a second task store.
- Keep Star Focus mission history native-local only; do not sync mission/session rewards into the markdown task files.
- Keep the sidebar and fallback path lightweight, but Tracking Station can now use an on-demand true 3D/WebGL renderer where the realism gain is worth the heavier runtime.
- Keep Star Focus copy terse; prefer labels, metrics, and direct actions over explanatory paragraphs.
- Prefer one strong Star Focus readout over duplicated secondary labels when the context is already obvious.
- Keep the right Mission Control rail as the quick-control entry surface even now that Tracking Station exists as an expanded overlay.
- Default new left-goals and right-mission rails to collapsed so the sticky-note window keeps a usable center column before the user opts into the larger side surfaces.
- In compact window widths, expanding one side rail should collapse the other and overlay the center instead of crushing the task column.
- Keep task capture immediately below the date header; secondary actions such as AI day planning stay in the lower action bar.
- Keep date navigation on a fixed three-column frame: equal-width arrow columns flank a flexible center slot, and decorative calendar affordances must not offset the date label's visual center.
- Keep frameless resizing discoverable through generous edge/corner hit zones and a visible bottom-right grip.
- Keep the macOS frameless window opaque with an explicit sticky-paper window/WebView background; transparent Tauri windows require private macOS APIs and can fail at the compositor even after WebKit reports a successful paint.
- Position and show the app only once during native launch readiness; do not snap it back after the user moves it and later toggles visibility.
- On macOS, resolve default task and bundle app-data roots from the signed-in account record; do not let an inherited `HOME` create a parallel empty store.
- Run startup archive reads on Tauri's blocking worker pool so File Provider hydration cannot freeze native window painting; keep task creation disabled while the initial archive load is pending.
- On macOS, reject `SF_DATALESS` task archives before every content read or read-before-write operation; surface cloud availability separately from an empty task list and require an explicit retry after Finder/Dropbox materializes the file.
- Keep essential task actions keyboard reachable and visible at low emphasis; wrap them below task text at the minimum width rather than hiding them.
- Treat task-array order as the reorder source of truth: top-level moves carry their subtask group, while subtask moves stay inside the current parent and exclude read-only other-date steps.
- Treat the task arrow as carry-forward: past dates catch up directly to local today, today moves to tomorrow, and future dates move to their following day.
- Keep general copy/paste on the platform-standard focused-field path with no dedicated task-row or composer controls.
- Keep agent-prompt export local and deterministic; copying a prompt must not invoke the configured AI provider.
- Keep the first archive-retention control pass inside Tracking Station with a small preset range instead of adding another global settings surface.
- Keep Star Focus map upgrades grounded in mission telemetry and accumulated-orbit feedback instead of drifting into descriptive filler or a separate vehicle-construction mechanic.
- Keep the first true 3D/WebGL rollout overlay-first: Tracking Station can own the heavier renderer while Mission Control keeps the lighter projected camera model.
- Keep Star Focus solar-system visuals compressed and readable; the scene should suggest astronomy without becoming a literal-to-scale simulator.
- Keep the Mission Control sidebar visually lighter than Tracking Station; the shared scene can scale density by surface instead of rendering everything everywhere.
- Keep explicit map chrome overlay-first: Tracking Station can own the camera HUD and controls while the sidebar map stays mostly atmospheric.
- Prefer realism gains from better materials, lighting, and atmosphere before adding more scene objects or UI chrome.
- Prefer cinematic polish from framing, contrast, and surface detail before expanding the Star Focus control surface or reintroducing helper copy.
- Prefer higher-fidelity planet reads from layered materials, terminators, and ring/moon treatment before considering heavier rendering technology.
- Keep any planetary motion restrained and ambient so it supports realism and inspection instead of making the orbital scene feel gamey.
- Keep planetary lighting cues tied to the projected scene geometry so highlight, rim, and night-side shading move coherently with the sun/camera relationship.
- Prefer local depth gains from atmospheric falloff and ring structure before expanding the scene scope or jumping to heavier rendering systems.
- Let mission phase shift the shared scene through material balance, atmosphere, and motion pacing before adding new UI chrome or narration.
- Keep atmospheric/weather motion visually attached to the planet disc; subtle shimmer is fine, but detached layer sliding breaks the realism immediately.
- Let close-up planet detail fade and compress toward the limb so the bodies read as spheres, not flat decals with full edge contrast.
- Keep the smallest planetary linework and microtextures quieter in Mission Control than in Tracking Station so detail improves inspection without making the sidebar busy.
- Keep Star Focus debug controls dev-only, non-persistent, and compact enough to stay in the bottom debug tray instead of expanding the production settings/UI surface.
- Treat completed focus sessions as Solar Route legs, but derive the route from existing mission orbit indexes so destination UI does not create another persistence source of truth.
- At compact widths, show the task, timer, and primary focus action before the orbital scene; on wider surfaces, pair one dominant map with one focused control column.
- Keep Moonshot Kimi as the default AI provider preset unless product direction changes; existing saved settings remain user-controlled and should not be silently overwritten by defaults.
- Route OpenRouter through the existing OpenAI-compatible adapter at `https://openrouter.ai/api/v1`; keep model slugs user-editable and add provider-specific behavior by provider or canonical base URL so legacy custom settings continue to work.
- Keep each AI provider's API base, key, and model in its own local profile; quick switching may activate configured profiles directly, while unconfigured providers must open Settings before activation.
- Treat Codex as a local execution provider, not an OpenAI-compatible endpoint: reuse `codex login`, never request or copy its credential, and keep the executable path in the existing provider profile's endpoint slot for backward-compatible settings persistence.
- Isolate every Codex generation in a new empty temporary directory with an ephemeral session, ignored user configuration and execution rules, a read-only sandbox, approval policy `never`, closed stdin, no web-search flag, and a hard timeout; delete the temporary directory after completion.
- Keep album recommendations ephemeral and task-adjacent: send only the visible date's task text, status, and current-day steps, then show the result above the action bar without creating another persisted workspace.
- Keep Cargo `default-run` and Tauri `mainBinaryName` pinned to `todo-sticky`; this package also produces `sticky-todo-api`, and the desktop bundler must never infer or rename the CLI as the application executable.

## Star Focus V1 Integration

- Product shell: left goals sidebar, center sticky todo list, right Star Focus Mission Control.
- Mission Control should support empty, task-selected, active-session, and mission-complete states.
- Completed focus sessions can update persistent Star Focus mission history without automatically mutating task completion state.
- The first implementation slice is [1-1-star-focus-mission-control-shell](plans/1-1-star-focus-mission-control-shell.md).
- Active sessions support pause/resume, survive reloads, and now persist through a native app-data file with migration from the earlier browser-local store.
- Tracking Station is now available as an in-window overlay for a larger starmap, deeper mission archive, and mirrored session controls without leaving the sticky-note app shell.
- Restored active sessions auto-open Tracking Station once when the right rail is collapsed, while mission completion remains user-invoked.
- Star Focus mission history remains native-local only; completed missions do not sync into the markdown-backed task/project files.
- Star Focus now uses a configurable local archive cap with `6`, `12`, and `24` mission presets, a simple `Recent` vs `Full` archive view, and native-side sanitization of unsupported values.
- Star Focus copy now stays intentionally terse across Mission Control and Tracking Station so the surfaces read as controls first, explanation second.
- The latest polish pass further reduces Star Focus to labels, metrics, and direct actions instead of descriptive helper text.
- The latest hierarchy pass removes duplicate secondary labels and keeps the Star Focus surfaces visually quieter without changing the overall layout model.
- The latest orbital-map pass replaces the placeholder-looking ring/dot scene with a shared telemetry-style map that shows live trajectory, labeled archive markers, and a more instrument-like mission display.
- The latest camera-control pass lets users drag, zoom, and tilt the shared orbital map above or below while keeping the implementation in SVG/CSS rather than moving to a full 3D renderer.
- The latest solar-system pass adds distinct planets, a moon, an asteroid belt, and a ringed outer body so the map feels closer to a real astronomical scene while still serving the mission UI.
- The latest declutter pass reduces simultaneous labels, bodies, and guide intensity so the map stays atmospheric without feeling visually crowded.
- The latest sidebar-simplification pass removes the sidebar map HUD and control dock so Tracking Station remains the richer orbital surface.
- The latest materials pass improves planet rendering and deep-space atmosphere so the orbital scene feels more premium without expanding the control surface.
- The latest cinematic polish pass adds stronger atmospheric framing and richer body textures so Tracking Station feels more like a premium mission-display surface without adding more chrome.
- The latest projected-3D pass replaces the old flat tilted layout with depth-sorted orbital rendering and orbit-camera interaction while staying inside SVG/CSS instead of switching to WebGL.
- The latest planet-detail pass adds finer-grained surface layers, stronger light/shadow cues, richer moon treatment, and more refined Saturn rings so the projected scene holds up better under close inspection.
- The latest motion-and-atmosphere pass adds subtle body rotation, drifting weather/band motion, outer planet shells, and clearer ring shadowing so the planets feel less static.
- The latest lighting-and-occlusion pass makes surface gradients, highlight placement, night-side shading, and Saturn ring overlap follow the actual projected scene geometry more closely.
- The latest ring-and-scattering pass adds more granular Saturn ring breakup and stronger layered atmosphere falloff so local depth reads better when you zoom in.
- The latest disc-microtexture pass adds finer currents, swirls, dune traces, crater ridges, and gas-giant micro-bands so the planets keep character under close inspection without expanding the scene chrome.
- The latest phase-responsive material pass lets ignition, ascent, heating, staging, orbit, and idle states steer atmosphere strength, rim/gloss balance, ring intensity, and subtle ambient motion pacing in the shared orbital scene.
- The latest weather-layer lock pass reduces cloud/band translation and reshapes the shared drift animation so close-up planetary weather reads as attached atmosphere instead of a drifting decal.
- The latest spherical-falloff pass removes the last weather slip, darkens detail toward the limb, and lowers cloud/band contrast so the projected bodies feel less like painted discs.
- The latest true-3D Tracking Station pass adds a lazy-loaded Three.js orbital scene in the overlay while preserving the lighter SVG map in the sidebar and as fallback.
- The latest 3D material-realism pass deepens the overlay renderer with layered body materials, separate cloud and atmosphere shells, textured Saturn rings, and cleaner phase-tuned scene behavior.
- The latest 3D atmosphere-and-shadow pass replaces the flat outer glow with fresnel-style atmosphere shells, enables local shadow cues, and makes Saturn's ring brightness and occlusion react more like a lit 3D object.
- The latest 3D solar-lighting-and-depth pass biases atmosphere and ring glow more directly to the sun angle and replaces the single flat star cloud with layered background depth.
- The latest 3D occultation-and-night-detail pass adds restrained Earth dark-side lights and a dedicated Saturn ring-shadow layer so the planets gain more local realism without adding more UI chrome.
- The latest 3D reflected-light pass adds Earth ocean glint and a subtle Moon Earthshine fill so the Earth-Moon pair feels more optically connected to the scene lighting.
- The latest 3D eclipse-and-transit pass adds a moon-shadow cue on Earth and lunar-eclipse shading on the Moon so the Earth-Moon pair responds more like interacting bodies.
- The latest 3D phase-rim pass adds restrained crescent/rim overlays to Venus, the inner bodies, and the Moon so phase separation reads more clearly under inspection.
- The latest 3D scattering pass separates atmosphere day/terminator/night color and makes Saturn's glow respond more like a thin scattering ring instead of a constant additive band.
- The latest 3D cloud-shadow pass projects the Earth and Venus cloud masks back onto the lit surface so the visible cloud shells feel more physically tied to the body lighting.
- The latest 3D cloud-shell scattering pass gives the Earth and Venus cloud layers their own darker night-side response, warmer/cooler terminator lift, and restrained silver-lining behavior.
- The latest 3D atmosphere-shell depth pass replaces the flat front atmosphere overlay with a shader-driven haze shell so day, twilight, night, and limb behavior read more like a volumetric atmosphere.
- The latest 3D background-depth pass adds layered nebula sprites and broad dust veils behind and through the system plane so the scene feels more embedded in space instead of floating in empty black.
- The latest 3D solar-scatter pass gives the sun a more structured flare read and adds a restrained illuminated scatter band through the inner system so the star feels more like a live light source.
- The latest 3D shadow-interaction pass gives cloud shells and Saturn's rings masked shadow materials and tightens the main solar shadow-map settings so thin transparent geometry participates more believably in local shadowing.
- The latest Solar Route layout pass reframes Tracking Station as Focus Mode, advances completed sessions through an Earth/Moon/Venus/Mars/Saturn loop, and puts task/timer controls ahead of the map on compact windows.
- Local development now has a dev-only debug tray for seeding tasks, clearing the current day, reloading task state, and slowing/fast-forwarding the Star Focus mission track.
- The latest data-home recovery pass keeps macOS task and app-state paths anchored to the signed-in account even when an installer or launcher overrides `HOME`.
- Task handoff keeps deterministic local execution-prompt export, while ordinary clipboard use follows native Command-C and Command-V behavior without visible controls.
- The latest ready-shell utility adds task-aware album recommendations through the existing configured AI provider while keeping results ephemeral and visually attached to the action bar.

## Quality Checks

- [ ] Default frontend verification command: `npm run build:frontend`
- [ ] Default local app run command: `npm run dev`
- [ ] Native-side sanity check when touching Rust: `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] CI/release flow exists under `.github/workflows/release.yml`; there is no separate lint/test standard documented yet.
