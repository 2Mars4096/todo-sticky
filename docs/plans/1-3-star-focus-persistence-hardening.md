# 1-3: Star Focus Persistence Hardening

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Harden Star Focus persistence so sessions and mission history survive more reliably than browser-local state and are ready for longer-term product decisions.

## Tasks
- [x] 1. Decide the target persistence layer for Star Focus beyond browser `localStorage`:
  keep local-only but move into Tauri-backed settings/store, with a migration path from the current frontend state shape.
- [x] 2. Migrate Star Focus session and mission-history state without regressing the existing markdown-backed task workflow.
- [x] 3. Add mission-history maintenance controls:
  clear history, reset orbit map, and preserve safe behavior for active sessions.
- [x] 4. Re-run frontend verification and native-side sanity checks if the persistence layer touches Rust or Tauri commands.

## Decisions
- Expanded overlay work stays deferred until persistence and longer-lived mission state prove insufficient inside the sidebar.
- Task markdown remains the source of truth for todos; this plan hardens Star Focus mission state only.
- Star Focus persistence now lives in a dedicated native app-data file managed by Tauri, not in the browser store and not inside the general settings payload.
- Legacy browser `localStorage` state is migrated forward on first native-backed load, then cleared after a successful native save.
- The settings panel continues to own only AI/provider and KB settings so a normal settings save cannot accidentally wipe Star Focus mission state.
- Persistence hardening is sufficient to unlock the next question:
  whether the current sidebar is enough long-term or whether Star Focus now warrants an expanded tracking-station surface.

## Notes
- This plan starts only after [1-2-star-focus-session-controls-and-animation](1-2-star-focus-session-controls-and-animation.md) is accepted as the sidebar baseline.
- Frontend verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/api.ts`, `src/hooks/useStarFocus.ts`, `src/components/MissionControlSidebar.tsx`, `src-tauri/src/config.rs`, `src-tauri/src/commands.rs`, and `src-tauri/src/lib.rs`.
