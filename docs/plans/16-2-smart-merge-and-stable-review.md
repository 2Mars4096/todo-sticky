# 16-2: Smart Merge And Stable Conflict Review

**Parent:** [16-sync-efficiency](16-sync-efficiency.md)
**Status:** completed
**Goal:** Automatically retain independent edits on both devices and review genuine incompatible changes individually without background-refresh flashing.

## Tasks
- [x] Implement matching ID-aware three-way merges for goals, plan steps and nested daily tasks on Mac/Android.
- [x] Preserve exact originals, durable writes, revision guards and safe interrupted-merge retries.
- [x] Replace whole-record choices with per-item/field choices that always retain independent edits.
- [x] Keep background checks quiet and preserve review selections/scroll on unchanged refreshes.
- [x] Verify shared merge fixtures, concurrent changes, retries and compact review behavior.
- [x] Rebuild/reinstall Mac and deliver the matching signed APK before publication.

## Decisions
- Use the last acknowledged version as the ancestor. Without an ancestor, distinct IDs are additions; absence alone cannot establish deletion.
- Different additions, separate fields and edits to separate items merge automatically. Competing edits to the same field, delete-versus-edit and incompatible ordering require individual choices.
- Preserve unrelated changes regardless of a conflict choice. Identical text on different IDs is not deduplicated.
- An accepted, durably prepared upload can resume without repeating review only if its local fingerprint and remote expected revision are unchanged. A newer remote revision always requires reconciliation again.
- Saved original copies remain exportable. Apply a merged local record durably before revision-guarded upload; interrupted uploads retry from retained local content.
- User requests these fixes before committing, pushing and publishing 2.1.16. Publication has not started.

## Notes
- Whole goals/daily records are currently treated as conflicts even for independent additions. Review currently offers a whole-record version choice.
- Automatic progress mounts and busy-disabled radio focus events can disrupt review; background polling must not mount progress or reschedule sync from non-editor focus changes.
- 16 shared fixtures run against both implementations. Ordering combines independent insertions deterministically, honors a one-sided reorder and asks for an incompatible order. Project/step IDs merge as one assignment; unfinished new steps reopen completed parents. Invalid cross-parent combinations retain per-root-task review and schema validation, rather than storing duplicate task IDs. Combined lists exceeding limits require local editing.
- Desktop real-hook checks cover saved originals, durable merge before upload, failed save containment, pending mutation reuse and restoration of an existing service URL in public builds. Android controller checks cover mixed choices, actual notebook persistence before upload, offline retry and concurrent-edit preservation.
- All 25 Node suites, TypeScript, Android analysis and 121 phone tests pass (one optional screenshot test skipped). Browser checks at 340/460/1000px preserve DOM nodes, selections and scroll across repeated background refreshes; changed items alone invalidate their prior choice. Screenshot reviewed at 340px under ignored `output/playwright/merge-review/`.

## Delivery
- Source committed as `47d2271`; desktop version/tag `2.1.16` at `df8c0c2`. Both are pushed to origin/main; public release is tracked separately in [4-52](4-52-publish-2-1-16.md).
- Mac 2.1.16 rebuilt/signed, installed and launched. Exact bundle hashes/signature verify; all 56 task-folder files and native config unchanged after launch. App/task/native/WebKit rollback copy: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-merge-review-install-20261108-102442`.
- Android 2.1.16+16 / 2016 delivered at `release/todo-sticky.apk`, 19,884,735 bytes (19.88 MB), ARM64. Original release certificate, v2 signature, 16 KB alignment, ZIP integrity and service URL verify. SHA-256 `61a3440831c59c673ffdcef44dcf6543535666e695e642ff69142ba20582dad9`. Previous +15 APK and reports remain under ignored `output/merge-review-delivery/`. No phone install or backend change.
