# 21: Plugin settings and task spacing

**Status:** completed
**Goal:** Clarify weekly notes, consolidate settings and remove wasted/clipped task space.

## Tasks
- [x] Rename KB document to Weekly notes with a precise accessible tooltip.
- [x] Consolidate Machines/Backups/AI under Settings; preserve drafts across sections and keep machine actions visible while scrolling.
- [x] Remove doubled task gutter; label carried dates explicitly.
- [x] Host: replace clipped8px paragraph input with selected-row32px input.
- [x] Verify product checks and synthetic browser narrow/wide rendering and draft retention.
- [x] Commit/push product and host changes; rebuild/reinstall and verify.

## Decisions
- Keep existing persistence, backup review/warnings and AI settings routing.
- Both settings sections stay mounted to retain drafts and pending backup review.
- Host shared document editor remains authoritative; no data/schema migration.

## Delivery
- Installed Todo UI0.1.17 in Diane0.1.9; exact ASAR/signature and backend health verified. Task/chat records unchanged; one preparation cache record updated at startup. Rollback: `/Applications/.Diane-previous-84cc4c40-39bf-4599-a183-97c570084876.app`. Product66 and host5 tests pass.
