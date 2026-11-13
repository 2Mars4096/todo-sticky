# 21: Plugin settings and task spacing

**Status:** in-progress
**Goal:** Clarify weekly notes, consolidate settings and remove wasted/clipped task space.

## Tasks
- [x] Rename KB document to Weekly notes with a precise accessible tooltip.
- [x] Consolidate Machines/Backups/AI under Settings; preserve drafts across sections and keep machine actions visible while scrolling.
- [x] Remove doubled task gutter; label carried dates explicitly.
- [x] Host: replace clipped8px paragraph input with selected-row32px input.
- [x] Verify product checks and synthetic browser narrow/wide rendering and draft retention.
- [ ] Commit/push product and host changes; rebuild/reinstall and verify.

## Decisions
- Keep existing persistence, backup review/warnings and AI settings routing.
- Both settings sections stay mounted to retain drafts and pending backup review.
- Host shared document editor remains authoritative; no data/schema migration.
