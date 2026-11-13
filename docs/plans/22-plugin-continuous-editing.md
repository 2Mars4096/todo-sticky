# 22: Plugin continuous editing and task details

**Status:** in-progress
**Goal:** Keep writing continuous and reveal management only through one task disclosure.

## Tasks
- [x] Keep selected rows flat; text focus does not open metadata/actions or step capture.
- [x] Add one accessible ellipsis disclosure, one open at a time, with Escape/focus return.
- [x] Move Outcome, Due, Todo project and task actions into retained detail content.
- [x] Keep Diane connection/status/Run/Open/Review on the row; portal workspace and secondary controls into the same task panel.
- [x] Preserve guarded persistence, dispatch identity, result-version checks and explicit run authority.
- [x] Verify interaction regressions, actual compact dispatch and narrow/wide synthetic browser states.
- [ ] Publish and install the matching plugin package in Diane.

## Decisions
- Plugin only; no standalone/phone or right-click changes.
- The task panel opens inline deliberately; ordinary text editing never expands it. Hidden detail components stay mounted to retain local state.
- No second Diane ellipsis in the compact row. The existing TaskExecution instance supplies both row and detail controls through a portal, retaining one workflow/polling authority.
- Shared paragraph append appears only during text focus; opening metadata does not reveal it.
- Historical steps remain read-only. Batch status remains visible when a task is not selected; detailed execution remains scoped to selection.

## Validation
- Browser fixture uses actual shared Markdown editor plus explicit offline service mocks.360/800px: no overflow, no second menu, metadata stays closed while typing, workspace selection preserved.
- Product gate and actual-host contract checked before packaging; installed/live-provider results recorded separately below.

- [x] Reproduce/fix shared-editor blur moving the ellipsis target; browser verifies first-click opening from an active paragraph. Final candidate0.1.19 supersedes staged0.1.18.
