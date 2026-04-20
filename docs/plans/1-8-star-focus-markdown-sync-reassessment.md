# 1-8: Star Focus Markdown Sync Reassessment

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Decide whether Star Focus mission history should remain purely local or ever sync into the markdown/project storage model.

## Tasks
- [x] 1. Audit the current markdown-backed task model and identify what a mission-history sync would actually need to write or derive.
- [x] 2. Decide whether syncing completed Star Focus missions into project files adds enough user value to justify added schema and ownership complexity.
- [x] 3. If sync is justified, define the exact storage surface and explicit v1/v2 limits; if not, record that mission history remains native-local only.
- [x] 4. Split the approved direction into follow-up implementation plans only after the product decision is locked.

## Decisions
- The existing markdown storage model is intentionally task-centric: dated sections, checkbox state, and subtask aggregation. It does not have a clean home for Star Focus session timing, orbit numbering, or mission archive metadata.
- Completed Star Focus missions should remain native-local only in v1/v1.5. They should not sync into markdown task files or weekly project notes.
- Automatic markdown writes on mission completion would blur ownership between the sticky task source of truth and the additive Star Focus reward layer.
- If markdown export is ever revisited later, it should be treated as an explicit reporting/export surface rather than hidden mutation of the existing task files.

## Notes
- This plan starts from the archive-retention baseline delivered in [1-7-star-focus-archive-retention-and-browsing](1-7-star-focus-archive-retention-and-browsing.md).
- The current markdown parser and file-sync path only read and write dated task sections. Supporting mission sync would require either app-specific metadata inside task files or a second markdown artifact with unclear ownership.
- Follow-up work should stay inside the native-local Star Focus surface. The next slice is [1-9-star-focus-archive-retention-settings](1-9-star-focus-archive-retention-settings.md).
