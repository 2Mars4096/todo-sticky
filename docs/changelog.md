# Changelog

## 2026-08-19

- [frontend] Remove the visible task Copy and composer Paste controls so ordinary clipboard work does not add more chrome to the compact task layout.
- [native] Add macOS Edit-menu Copy and Paste responders for standard Command-C and Command-V behavior, and drop general clipboard-read permission while retaining prompt export.
- [release] Rebuild, signature-check, reinstall, and relaunch version 2.0.4; verify enabled native Copy/Paste commands and retain the previous app as a temporary rollback bundle.
- [provider] Add Codex as a first-class background provider that reuses the local ChatGPT-authenticated CLI instead of requiring an OpenAI API key.
- [native] Run Codex requests non-interactively in a fresh temporary directory with ephemeral sessions, read-only sandboxing, no approvals, ignored user/project execution rules, empty stdin, and a three-minute timeout.
- [frontend] Give Codex a provider-specific settings state with executable-path auto-detection, an optional model override, no API-key field, login-status testing, and normal quick-provider switching.
- [tests] Verify the installed Codex login through a live isolated probe, add executable-resolution and prompt-boundary coverage, and pass all 20 native tests plus the frontend production build.
- [release] Rebuild and reinstall version 2.0.4, activate Codex with its default model, preserve the prior Moonshot profile and rollback copies, and confirm the installed GUI is running with the existing ChatGPT login.
- [frontend] Add an `Albums` action beside day planning that turns the visible date's task text, status, and current-day steps into a four-album work soundtrack through the configured AI provider.
- [frontend] Present album picks in a compact paper-toned sheet with task-mode cues, loading skeletons, regenerate, close, Escape dismissal, and responsive wrapping at the 460px baseline.
- [native] Add the structured `llm_recommend_albums` Tauri command while keeping recommendation results ephemeral and out of the Markdown and app-state stores.
- [build] Pin Cargo's default run target and Tauri's main bundle name to `todo-sticky` so the sibling `sticky-todo-api` CLI cannot be packaged or renamed as the macOS application executable.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch the corrected macOS app bundle from `/Applications/Sticky Todo.app`, retaining the previous bundle in a temporary rollback backup.
- [docs] Complete plan `4-12-task-aware-album-recommendations` and document the new UI, bridge contract, privacy boundary, and user-facing feature.

## 2026-08-17

- [frontend] Replace the similar step controls with distinct icon-only actions: a plus adds one manual step, while a branching hierarchy breaks a task into AI-generated steps; hover text and accessible names retain the full action labels.
- [docs] Record the completed task-step action clarity follow-up in plan `4-11` and the user-facing feature summary.

## 2026-08-16

- [native] Add a shared task API for date/range extraction plus nested task creation, editing, and deletion, with persistent Markdown-backed IDs and optional stale-write revision checks.
- [tooling] Add the `sticky-todo-api` JSON CLI and `npm run task-api --` entry point with saved knowledge-base path discovery for reusable Codex skills and other local agents.
- [frontend] Expose the same task API through typed Tauri bridge calls without changing the existing task-list workflow.
- [docs] Document the agent-facing CRUD contract, safe extract-before-mutate workflow, and completed plan `4-10-agent-task-api`.
- [data] Back up the 53-file local knowledge-base task archive, recover the missing `2026-02-23` weekly file with checksum verification, and keep the unresolved `2026-03-09` File Provider placeholder out of the merge until its contents are available.
- [diagnostics] Confirm that normal and isolated Star Focus stores have no retained missions, legacy/current WebKit goal stores have no goal items, and the oldest local Time Machine snapshot contains only the same cloud-only March placeholder.
- [frontend] Stabilize the date header with fixed arrow columns, a centered flexible date slot, and symmetrical chevron spacing so changing date lengths no longer shift navigation controls.
- [release] Rebuild, install, and relaunch the macOS app; verify short, medium, and longest-formatted English date labels against the production styles.
- [native] Detect macOS `SF_DATALESS` task archives before reads or read-before-write mutations, preventing File Provider placeholders from blocking indefinitely or being treated as empty data.
- [frontend] Replace the endless cloud-download spinner with a concise Dropbox availability error, disabled task creation, and an explicit Retry action.
- [native] Move initial markdown archive reads onto Tauri's blocking worker pool so a cloud-only File Provider placeholder cannot freeze native window painting.
- [frontend] Show a dedicated archive-loading state and disable task creation until initial task data is available.
- [native] Replace the unsupported transparent macOS window path with an explicit opaque sticky-paper window/WebView background.
- [frontend] Add a visible boot surface, sanitized local boot-stage diagnostic, and React recovery boundary so startup failures cannot remain an unexplained white window.
- [diagnostics] Confirm the existing task archive is intact but `dataless`, with Dropbox/File Provider reporting a requested yet incomplete download and a prior cancellation error.

## 2026-08-10

- [frontend] Add per-task and per-step `Copy` actions that write portable Markdown checklists plus `Prompt` actions that create execution-ready agent briefs without calling an AI provider.
- [frontend] Add a quiet `Paste` action beside New Task that reads plain text or copied checklists and recreates their hierarchy as unchecked work.
- [native] Add Tauri's official clipboard manager with plain-text read/write permissions only.
- [frontend] Widen the compact task-action wrap breakpoint so the default 460px shell preserves task text width after the new handoff controls are added.
- [native] Fix missing-data launches on macOS by resolving task and app-state roots from the signed-in account instead of a caller-overridden `HOME` environment.
- [native] Add account-home precedence and stable task/app-data path tests, rebuild and install the repaired bundle, and confirm the normal store is used while the isolated store remains untouched.
- [frontend] Fit the collapsed Goals `REPEAT` metric with a slightly wider measure, tighter tracking, and centered non-wrapping label text.
- [frontend] Replace the misleading generic empty state on past/future dates with date-aware guidance and a direct `Go to today` action.
- [native] Confirm the active markdown archive is intact and add regression coverage for loading current tasks and subtasks from a multi-date file.
- [frontend] Add a compact action-bar AI provider selector that switches configured providers in one action and routes unconfigured choices directly into setup.
- [settings] Preserve a separate API base, key, and model profile for each provider while migrating the existing active configuration without data loss.
- [frontend] Centralize provider labels, presets, configured-state checks, and switching behavior so the quick selector and Settings stay synchronized.
- [frontend] Add OpenRouter as a first-class AI provider with the canonical API base, Kimi K3 preset, routed-model suggestions, and OpenRouter-specific API-key guidance.
- [native] Extend the OpenAI-compatible adapter with OpenRouter attribution headers, legacy base-URL inference, trailing-slash normalization, and temperature `1.0` for routed Kimi model slugs.
- [native] Add focused coverage for OpenRouter inference, request URL and headers, provider/base detection, and Kimi versus non-Kimi temperature behavior.
- [frontend] Make the task arrow carry work from any past date directly to local today, while today moves to tomorrow and future dates move one day forward.
- [frontend] Give task and subtask arrows destination-aware tooltips, accessible names, and success feedback driven by the same centralized date rule.
- [docs] Complete plan `4-2-smart-task-carry-forward` and update the core workflow documentation.

## 2026-08-02

- [frontend] Rebuild the expanded Star Focus surface as responsive Focus Mode: one dominant orbital view, one task-first Flight Deck, compact controls before the map, and quieter travel-log/settings bands.
- [frontend] Add a deterministic Solar Route from Earth through the Moon, Venus, Mars, and Saturn, with every completed focus session advancing one named travel leg without changing native persistence.
- [frontend] Surface the next destination in the collapsed rail, expanded Mission Control, orbital HUD, completed-session summary, and travel log.
- [frontend] Replace square Three.js star and dust points with radial alpha-masked sprites so close particles no longer render as white blocks.
- [docs] Complete plan `1-44-star-focus-solar-route-layout-pass` and document the Focus Mode route and responsive hierarchy.
- [native] Position fresh app launches at the top-right of the current display work area with a Retina-aware 16px margin, then show and focus the window from Tauri's ready event.
- [native] Add focused placement tests for primary and left-side monitor coordinates, rebuild the macOS app-only bundle, seal it locally, replace the installed app, and relaunch it.
- [docs] Complete plan `4-1-top-right-launch-placement` and document the new launch behavior and native lifecycle boundary.
- [frontend] Replace the cramped 380px baseline with a ready-to-use 460px shell, one-time collapsed-rail migration, compact overlay panels, and responsive populated-task action wrapping.
- [frontend] Add native resize hit zones on every frameless edge and corner, including a visible bottom-right grip and explicit Tauri resize permission.
- [frontend] Move task capture below the date header, add an actionable empty state, repair the unreachable add-step path, improve date/filter labels, and add accessible names plus reduced-motion handling.
- [frontend] Add visible success/error feedback for AI planning, AI breakdown, and move-to-tomorrow actions; restore optimistic task state when a move fails.
- [frontend] Clarify first-run setup so users can start without AI, while keeping provider setup available for breakdown and planning.
- [docs] Add the product/design baseline, complete plan `4-ready-shell-and-ux-path-pass`, and record the core workflow audit in `docs/ux-review.md`.

## 2026-04-24

- [native] Make Moonshot Kimi the default LLM configuration with `https://api.moonshot.ai/v1`, `kimi-k2.6`, and temperature `1.0` for Kimi/Moonshot OpenAI-compatible calls.
- [frontend] Add a Moonshot (Kimi) provider preset in Settings and update the first-run defaults to `kimi-k2.6`.
- [docs] Add plan `3-kimi-moonshot-default-provider` and update the README/environment examples for the new default provider.

## 2026-04-20

- [frontend] Improve the true 3D shadow path by giving cloud shells and Saturn's rings masked shadow materials, tightening the solar shadow-map settings, and easing back the older ring-shadow overlay so local shadow interaction feels less approximate.
- [docs] Close plan `1-43-star-focus-3d-shadow-interaction-pass` and update the tracking docs for the new 3D shadow-interaction slice.
- [frontend] Deepen the true 3D sun treatment with structured flare sprites and a restrained illuminated scatter veil through the inner system so the star feels more like an active light source than a bright sphere.
- [docs] Close plan `1-42-star-focus-3d-solar-scatter-pass` and update the tracking docs for the new 3D solar-scatter slice.
- [frontend] Deepen the true 3D Tracking Station background with layered far/near nebula sprites and broad dust-haze veils through the system plane so the planets sit in a richer environment instead of clean empty space.
- [docs] Close plan `1-41-star-focus-3d-background-depth-pass` and update the tracking docs for the new 3D background-depth slice.
- [frontend] Replace the flat front atmosphere layer in the true 3D Tracking Station renderer with a shader-driven haze shell that reacts to day, terminator, night, and limb angle so Earth, Venus, Mars, and the outer atmosphere feel less like uniform overlays.
- [docs] Close plan `1-40-star-focus-3d-atmosphere-shell-depth-pass` and update the tracking docs for the new 3D atmosphere-shell slice.
- [frontend] Replace the flat Earth/Venus cloud-shell material in the true 3D Tracking Station renderer with a shader-driven shell that carries darker night-side clouds, brighter terminator color, and restrained silver-lining scatter tied to the sun and camera angle.
- [docs] Close plan `1-39-star-focus-3d-cloud-shell-scattering-pass` and update the tracking docs for the new 3D cloud-shell slice.
- [frontend] Add cloud-shadow coupling to the true 3D Tracking Station renderer by projecting Earth and Venus cloud masks back onto the lit surface, keeping the shadows synchronized with the cloud shells, and slightly retuning cloud emissive lift so the layered planets read more like one lighting system.
- [docs] Close plan `1-38-star-focus-3d-cloud-shadow-coupling-pass` and update the tracking docs for the new 3D cloud-shadow slice.
- [frontend] Add more optical richness to the true 3D Tracking Station renderer by separating atmosphere day/terminator/night color and replacing Saturn's flat glow band with a light/view-responsive ring-scattering pass.
- [docs] Close plan `1-37-star-focus-3d-scattering-pass` and update the tracking docs for the new 3D scattering slice.
- [frontend] Add clearer planetary phase behavior to the true 3D Tracking Station renderer with restrained crescent/rim overlays on the inner bodies and the Moon so the lit shapes read more like phased bodies than evenly shaded spheres.
- [docs] Close plan `1-36-star-focus-3d-phase-rim-pass` and update the tracking docs for the new 3D phase-rim slice.
- [frontend] Add Earth-Moon eclipse/transit interaction to the true 3D Tracking Station renderer with a moon-shadow cue on Earth and lunar-eclipse shading on the Moon so the pair feels more physically linked.
- [docs] Close plan `1-35-star-focus-3d-eclipse-and-transit-pass` and update the tracking docs for the new 3D eclipse-and-transit slice.
- [frontend] Add reflected-light cues to the true 3D Tracking Station renderer with an Earth ocean-glint pass and a subtle Moon Earthshine fill so the Earth-Moon pair feels less like isolated assets under one light.
- [docs] Close plan `1-34-star-focus-3d-reflected-light-pass` and update the tracking docs for the new 3D reflected-light slice.
- [frontend] Add more local 3D realism with an Earth dark-side light pass, a Saturn ring-shadow overlay, and light-aware shader wiring so the planets feel less like uniformly lit spheres.
- [docs] Close plan `1-33-star-focus-3d-occultation-and-night-detail-pass` and update the tracking docs for the new 3D local-detail slice.
- [frontend] Push the true 3D Tracking Station renderer further with sun-biased atmosphere glow, stronger sun/view-responsive Saturn ring lighting, and layered starfield depth so the system feels less like a polished diagram floating in empty space.
- [docs] Close plan `1-32-star-focus-3d-solar-lighting-and-depth-pass` and update the tracking docs for the new 3D solar-lighting-and-depth slice.
- [frontend] Deepen the true 3D Tracking Station renderer again with fresnel-style atmosphere glow, shadow-enabled lighting, alpha-tested ring occlusion, and view-angle-tuned Saturn ring brightness so the scene reads more like a lit system than a clean diagram.
- [docs] Close plan `1-31-star-focus-3d-atmosphere-and-shadow-pass` and update the tracking docs for the new 3D atmosphere-and-shadow slice.
- [frontend] Deepen the true 3D Tracking Station renderer with layered surface, bump, and roughness materials, separate cloud and atmosphere shells, textured Saturn rings, and phase-tuned scene cleanup so the bodies read less like first-pass procedural spheres.
- [docs] Close plan `1-30-star-focus-3d-material-realism-pass` and update the tracking docs for the new 3D realism slice.
- [frontend] Start the first true 3D Star Focus renderer by adding a lazy-loaded Three.js Tracking Station orbital scene with real meshes, orbital camera movement, dynamic lighting, procedural planet materials, archive markers, and a live mission craft path while keeping the sidebar on the lighter projected SVG map.
- [docs] Close plan `1-29-star-focus-true-3d-tracking-foundation` and record the new true-3D Tracking Station boundary in the tracking docs.
- [frontend] Tighten the projected planets with zero-slip weather breathing, stronger limb/detail falloff, and lower cloud-band contrast so the bodies read more like spheres than painted discs.
- [docs] Close plan `1-28-star-focus-spherical-falloff-pass` and record the new spherical-read refinement in the tracking docs.
- [frontend] Tighten Star Focus weather-layer motion so cloud and band groups stay visually locked to the planet discs, replacing the obvious sliding drift with a smaller centered shimmer.
- [docs] Close plan `1-27-star-focus-weather-layer-lock-pass` and record the weather-layer coherence fix in the tracking docs.
- [frontend] Make the shared Star Focus orbital scene respond to mission phase with calmer idle/orbit states, hotter ignition/heating atmosphere, phase-tuned rim and ring intensity, and subtle motion-speed shifts instead of adding more HUD chrome.
- [docs] Close plan `1-26-star-focus-phase-responsive-material-pass` and record the new phase-responsive material refinement in the tracking docs.
- [frontend] Add finer disc-level microtextures with ocean-current lines, cloud-deck swirls, dune traces, crater-ridge accents, and micro-bands so the projected planets keep more character when zoomed in.
- [docs] Close plan `1-25-star-focus-disc-microtexture-pass` and record the new disc-level microtexture refinement in the tracking docs.
- [frontend] Improve local orbital-scene depth with richer Saturn ring breakup, thickness variation, and layered atmospheric scattering falloff on the lit edges of the planets.
- [docs] Close plan `1-24-star-focus-ring-structure-and-scattering-pass` and record the new ring-and-scattering refinement in the tracking docs.
- [frontend] Make projected-planet lighting follow the scene geometry more believably with sun-driven gradients, dynamic night-side shading, camera-aware rim light, and Saturn ring occlusion that follows the projected ring path.
- [docs] Close plan `1-23-star-focus-lighting-and-ring-occlusion-pass` and record the new lighting-and-occlusion refinement in the tracking docs.
- [frontend] Add restrained planetary motion, outer atmosphere shells, aurora/weather drift, and stronger Saturn ring-shadow treatment so the projected Star Focus scene feels more alive.
- [docs] Close plan `1-22-star-focus-planet-motion-and-atmosphere-pass` and record the latest motion-and-atmosphere refinement in the tracking docs.
- [frontend] Deepen the projected Star Focus planet rendering with finer-grained surface layers, stronger lighting cues, richer moon detail, and a more refined Saturn ring treatment.
- [docs] Close plan `1-21-star-focus-planet-detail-pass` and record the latest fine-grained planetary-detail pass in the tracking docs.
- [frontend] Rebuild the shared Star Focus orbital view as a projected 3D scene with orbit-camera drag, depth-sorted celestial bodies, and stronger spatial layering in Tracking Station and Mission Control.
- [docs] Close plan `1-20-star-focus-projected-3d-orbital-pass` and record the new projected-3D scene boundary in the tracking docs.
- [frontend] Push the shared Star Focus scene further toward a cinematic Tracking Station finish with deeper atmosphere, stronger framing, and richer planetary surface detail.
- [docs] Close plan `1-19-star-focus-tracking-station-cinematic-polish` and record the latest cinematic polish pass in the tracking docs.
- [frontend] Improve the shared Star Focus orbital map with richer planetary surface detail, deeper space atmosphere, and a more premium overlay-first finish.
- [docs] Close plan `1-18-star-focus-orbital-map-materials-pass` and record the new materials-and-atmosphere pass in the tracking docs.
- [frontend] Remove the sidebar map HUD and camera dock so Mission Control stays quieter while Tracking Station remains the rich orbital-view surface.
- [docs] Close plan `1-17-star-focus-sidebar-map-simplification` and record the overlay-first map-chrome split in the tracking docs.
- [frontend] Declutter the shared Star Focus solar-system scene by reducing simultaneous bodies, archive labels, guide intensity, and sidebar control density while keeping the new realism direction.
- [docs] Close plan `1-16-star-focus-orbital-map-declutter-pass` and record the calmer visual-density split between Mission Control and Tracking Station.
- [frontend] Upgrade the shared Star Focus map into a compressed solar-system scene with distinct planets, a moon, an asteroid belt, and a ringed outer world while keeping mission markers and camera controls intact.
- [docs] Close plan `1-15-star-focus-compressed-solar-system-pass` and record the new celestial-body pass in the tracking docs.
- [frontend] Add direct Star Focus map camera controls with drag-to-pan, wheel/button zoom, and above/level/below pseudo-3D tilt in both Mission Control and Tracking Station.
- [docs] Close plan `1-14-star-focus-orbital-map-camera-controls` and record the lightweight camera-control boundary in the tracking docs.
- [frontend] Replace the Star Focus orbital map with a shared telemetry-style scene that adds a live trajectory, labeled archive markers, and a stronger sense of mission progress in both Mission Control and Tracking Station.
- [docs] Close plan `1-13-star-focus-orbital-map-realism-pass` and record the new shared orbital-scene component in the tracking docs.
- [frontend] Add dev-only Star Focus mission time-scale controls so local debugging can slow down or fast-forward the live track without changing production behavior.
- [docs] Close plan `2-1-dev-mode-star-focus-time-scale` and record the new dev-only mission-speed controls in the tracking docs.
- [frontend] Add a development-only task debug tray with sample-task seeding, sample-pack seeding, clear-day, and reload actions for faster local testing.
- [docs] Close plan `2-dev-mode-task-debug-panel` and record the dev-only debug surface in the tracking docs.
- [frontend] Remove duplicate secondary Star Focus labels and rebalance captions so the rail and overlay feel quieter without changing the layout model.
- [docs] Close plan `1-12` and record the Star Focus hierarchy-trim pass in the tracking docs.
- [frontend] Remove more explanatory Star Focus copy so Mission Control and Tracking Station rely on labels, metrics, and actions instead of help text.
- [docs] Close plan `1-11` and record the more guided, less descriptive Star Focus presentation in the tracking docs.
- [frontend] Trim Star Focus copy density in Mission Control and Tracking Station, and remove redundant overlay help text while keeping the existing visual direction.
- [docs] Close plan `1-10` and record the new copy-light Star Focus presentation in the tracking docs.
- [docs] Close plans `1-8` and `1-9`, record the no-markdown-sync boundary, and move the remaining Star Focus retention questions back to backlog.
- [frontend] Add configurable local Star Focus archive-retention presets in Tracking Station and trim retained mission history through the shared Star Focus state hook.
- [native] Persist the Star Focus archive-retention limit in native local state, sanitize unsupported values, and re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-7`, create follow-up plan `1-8`, and update the repo tracking/docs around the new archive-retention decision.
- [frontend] Expand the local Star Focus archive to 12 missions, add a simple `Recent` vs `Full` Tracking Station archive view, and clarify archive-retention copy.
- [frontend] Fix Star Focus mission numbering so vehicle codes and orbit indices continue advancing after the retained archive reaches its cap.
- [native] Enforce the same 12-mission Star Focus archive cap in the native persistence layer and re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-6`, create follow-up plan `1-7`, and update the repo tracking/docs around the compact-rail and archive-retention decisions.
- [frontend] Keep the sticky-note window compact by default with both side rails collapsed for new users and compact-mode rail exclusivity when one side expands.
- [frontend] Auto-open Tracking Station once for restored active sessions when the mission rail is collapsed, and add clearer armed/restored/completed state banners plus explicit local archive-retention copy.
- [native] Re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml` after the compact/layout polish slice.
- [docs] Close plans `1-4` and `1-5`, create follow-up plan `1-6`, and update the repo tracking/docs around the new Tracking Station model.
- [frontend] Add the first Star Focus Tracking Station overlay with a larger starmap, mirrored session controls, full local mission archive, and maintenance actions.
- [frontend] Let Focus selection open Tracking Station when the rail is collapsed and default new Star Focus state to a compact right-rail baseline.
- [native] Align the native Star Focus default state with the compact-by-default right Mission Control rail.
- [native] Validate the new Star Focus persistence path with `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-3` after native verification and create follow-up plan `1-4` for the overlay reassessment track.
- [native] Add Tauri-backed Star Focus persistence commands and migrate Mission Control state off browser-only storage into native app data.
- [frontend] Add orbit-history maintenance controls and wire Mission Control state saves through the new native persistence path.
- [docs] Move plan `1-3` to in-progress and note that native verification remains pending because this environment had to provision Rust first.
- [frontend] Add pause/resume, reload-safe active sessions, clearer cancel semantics, and stronger phase-driven Mission Control visuals.
- [docs] Close plan `1-2`, create follow-up plan `1-3`, and defer expanded-overlay work behind persistence hardening.
- [frontend] Add the first Star Focus Mission Control shell with a right sidebar, local mission/session state, task handoff, and a sidebar-only starmap view.
- [docs] Close plan `1-1`, create follow-up plan `1-2`, and move the active Star Focus track to session controls plus animation polish.
- [docs] Lock the Star Focus v1 design decisions and create the first implementation sub-plan for a frontend-only Mission Control shell.
- [docs] Initialize the dev documentation scaffold and tracking files.
- [docs] Tailor the new tracking docs to the Sticky Todo codebase and seed the Star Focus design-planning workstream.
