# 1-9: Star Focus Archive Retention Settings

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Let users adjust how many local Star Focus missions are retained without changing the markdown-backed task model.

## Tasks
- [x] 1. Define a small v1 retention-control model that stays local-only and avoids bloating the quick Mission Control rail.
- [x] 2. Add the retention limit to the frontend/native Star Focus state shape with safe defaults and sanitization.
- [x] 3. Expose the control in Tracking Station, explain the retention tradeoff, and ensure archive/history views respect the active limit.
- [x] 4. Re-run frontend and native verification, then sync the repo tracking docs.

## Decisions
- The first configurable retention pass should stay inside Tracking Station rather than the quick Mission Control rail or the general app settings panel.
- The archive-cap control uses a small preset set: `6`, `12`, or `24` retained local missions.
- Changing the cap trims the retained local archive immediately; raising the cap only affects future retention because older trimmed missions are not restored.
- Mission history remains native-local only even after the cap becomes configurable; this plan does not introduce markdown sync.

## Notes
- This plan assumes the decision locked in [1-8-star-focus-markdown-sync-reassessment](1-8-star-focus-markdown-sync-reassessment.md): Star Focus mission history remains native-local only.
- Frontend changes landed in `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, `src/App.tsx`, `src/types.ts`, and `src/styles/sticky.css`.
- Native sanitization now persists the archive limit in `src-tauri/src/config.rs` and constrains unsupported values back to the default preset.
- Verification: `npm run build:frontend`; `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
