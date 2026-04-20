# 1-7: Star Focus Archive Retention And Browsing

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Decide how much Star Focus mission history to retain by default and whether the Tracking Station archive needs deeper browsing controls.

## Tasks
- [x] 1. Lock the default local archive policy:
  confirm whether the current eight-mission cap is the right v1 retention limit or whether it should change.
- [x] 2. If retention changes, update the frontend/native persistence model and archive copy without syncing Star Focus history into markdown task storage.
- [x] 3. Decide whether the archive needs deeper browsing controls such as pagination, filters, or a simple expanded recent-history view.
- [x] 4. Re-run frontend and native verification if the archive or persistence shape changes.

## Decisions
- The default local archive cap should increase from 8 to 12 missions so Tracking Station feels cumulative without becoming a long-term project ledger.
- The archive cap stays fixed in v1; it is not user-configurable yet.
- Native persistence should enforce the same archive cap as the frontend so the on-disk Star Focus file cannot drift past the product limit.
- Tracking Station does not need filters or pagination in v1; a simple `Recent` vs `Full` archive view is enough at a 12-mission cap.
- Mission numbering and orbit indexing must advance from the highest retained mission index, not from the retained-array length, so vehicle codes do not repeat once the archive reaches its cap.

## Notes
- This plan starts from the compact/layout baseline delivered in [1-6-star-focus-compact-layout-and-overlay-polish](1-6-star-focus-compact-layout-and-overlay-polish.md).
- Verification passed: `npm run build:frontend`
- Native verification passed: `cargo +stable check --manifest-path src-tauri/Cargo.toml`
- Implementation landed in `src/hooks/useStarFocus.ts`, `src/components/TrackingStationOverlay.tsx`, `src/styles/sticky.css`, and `src-tauri/src/config.rs`.
