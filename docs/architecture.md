# Architecture

## Tech Stack

- [ ] Languages: TypeScript/TSX for the frontend, Rust for the Tauri native layer, Markdown for task storage.
- [ ] Frameworks: React 18, Vite 6, Tauri 2, date-fns, react-day-picker.
- [ ] Build and test tools: `vite build`, `npx tauri dev`, `npx tauri build`; there is no established automated test suite yet.
- [ ] Runtime or deployment targets: desktop app for macOS, Windows, and Linux.

## Repository Layout

- [ ] `src/`: React application shell, task UI components, hooks, API bridge, and global sticky-note styling.
- [ ] `src-tauri/`: Rust commands, config, markdown/file-sync logic, tray/window behavior, and native app packaging.
- [ ] `docs/`: live project tracking, roadmap, plans, changelog, bugs, and architecture notes.
- [ ] `content/`: markdown-backed task data under `content/to-do/`.
- [ ] Other top-level directories: `demo/` for assets, `scripts/` for build/demo utilities, `dist/` for built frontend assets.

## Star Focus Modules

- [ ] `src/App.tsx`: app-shell coordination for compact window widths, rail exclusivity, and Tracking Station auto-open behavior for restored sessions.
- [ ] `src/hooks/useStarFocus.ts`: Star Focus state, pause/resume lifecycle, reload-safe active sessions, configurable local archive-retention presets, dev-only mission time-scale simulation, mission numbering, migration from legacy localStorage, and native-backed persistence saves.
- [ ] `src/components/MissionControlSidebar.tsx`: right-sidebar Mission Control shell, shared orbital telemetry scene, session controls, mission-history UI, and maintenance controls.
- [ ] `src/components/TrackingStationOverlay.tsx`: expanded in-window Star Focus surface with the larger shared orbital telemetry scene, mirrored launch/live controls, recent/full archive browsing, archive-cap controls, and maintenance actions.
- [ ] `src/components/StarFocusOrbitalMap.tsx`: shared SVG/CSS orbital-scene renderer used by both Mission Control and Tracking Station for celestial bodies, lightweight surface textures, atmospheric framing layers, live trajectory, archive markers, telemetry HUD readouts, and local pan/zoom/tilt camera controls.
- [ ] `src/components/TaskList.tsx` and `src/components/TaskItem.tsx`: explicit task-to-Mission-Control handoff plus active-session selection locking.
- [ ] `src/components/DevToolsPanel.tsx`: development-only debug tray for seeding tasks, reloading task state, clearing the current day, and changing Star Focus mission speed during local testing.
- [ ] `src/api.ts`: Tauri bridge for Star Focus load/save commands alongside the existing task and settings calls.
- [ ] `src-tauri/src/config.rs` and `src-tauri/src/commands.rs`: native app-data persistence for Star Focus state in a dedicated file separate from the general settings payload, including archive-cap sanitization.

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
- Keep Star Focus mission history native-local only; do not sync mission/session rewards into the markdown task files.
- Build Star Focus visuals with lightweight 2D DOM/SVG/CSS motion in v1; defer WebGL, 3D scenes, and heavyweight animation systems.
- Keep Star Focus copy terse; prefer labels, metrics, and direct actions over explanatory paragraphs.
- Prefer one strong Star Focus readout over duplicated secondary labels when the context is already obvious.
- Keep the right Mission Control rail as the quick-control entry surface even now that Tracking Station exists as an expanded overlay.
- Default new left-goals and right-mission rails to collapsed so the sticky-note window keeps a usable center column before the user opts into the larger side surfaces.
- In compact window widths, expanding one side rail should collapse the other instead of allowing both expanded rails to crush the center task column.
- Keep the first archive-retention control pass inside Tracking Station with a small preset range instead of adding another global settings surface.
- Keep Star Focus map upgrades grounded in mission telemetry and accumulated-orbit feedback instead of drifting into descriptive filler or a separate vehicle-construction mechanic.
- Keep Star Focus camera interaction lightweight: local drag/zoom/tilt controls are fine, but real 3D assets and WebGL remain out of scope for the current v1 implementation track.
- Keep Star Focus solar-system visuals compressed and readable; the scene should suggest astronomy without becoming a literal-to-scale simulator.
- Keep the Mission Control sidebar visually lighter than Tracking Station; the shared scene can scale density by surface instead of rendering everything everywhere.
- Keep explicit map chrome overlay-first: Tracking Station can own the camera HUD and controls while the sidebar map stays mostly atmospheric.
- Prefer realism gains from better materials, lighting, and atmosphere before adding more scene objects or UI chrome.
- Prefer cinematic polish from framing, contrast, and surface detail before expanding the Star Focus control surface or reintroducing helper copy.
- Keep Star Focus debug controls dev-only, non-persistent, and compact enough to stay in the bottom debug tray instead of expanding the production settings/UI surface.

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
- Local development now has a dev-only debug tray for seeding tasks, clearing the current day, reloading task state, and slowing/fast-forwarding the Star Focus mission track.
- There is no newer active implementation slice after [1-19-star-focus-tracking-station-cinematic-polish](plans/1-19-star-focus-tracking-station-cinematic-polish.md); remaining questions are parked in backlog.

## Quality Checks

- [ ] Default frontend verification command: `npm run build:frontend`
- [ ] Default local app run command: `npm run dev`
- [ ] Native-side sanity check when touching Rust: `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] CI/release flow exists under `.github/workflows/release.yml`; there is no separate lint/test standard documented yet.
