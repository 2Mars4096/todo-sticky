# 20: Notebook editor bridge

**Status:** completed
**Goal:** Embed the host notebook editor in existing Todo rows without replacing task authority.

- [x] Inspect embedded records versus standalone Markdown authority.
- [x] Add optional TodoPort.taskEditor and canonical account/record-scoped bridge.
- [x] Retain task controls, hierarchy, reorder, workflow and revision-checked saves.
- [x] Guard stale callbacks, empty changes and read-only historical/disabled records.
- [x] Verify types,56 tests, build, distribution, package and actual-host SDK.
- [ ] Aggregate a new pinned package in Diane and complete rendered/installed acceptance.

No KB Markdown file wiring exists in the embedded plugin. This text-only bridge preserves existing records; it does not synchronize standalone files or infer a KB destination. Source-composition test in Diane renders the real TaskItem with the real notebook editor and verifies edits reach the existing handler.
