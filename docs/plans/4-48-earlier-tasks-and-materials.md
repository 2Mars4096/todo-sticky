# 4-48: Earlier Tasks And Note Materials

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Drag earlier work into Today and try optional glass materials in a locally installed branch build.

## Tasks
- [x] 1. Support dropping earlier roots into Today, including empty Today, with hierarchy, metadata and safe persistence.
- [x] 2. Add Paper, Frosted glass and Liquid glass choices with local persistence and compact accessible controls.
- [x] 3. Verify reorder boundaries, save failures, reload, material selection and compact layouts.
- [x] 4. Build, back up the installed app and data, install locally, and verify launch/data integrity.

## Decisions
- Branch `feat/earlier-tasks-materials`, isolated worktree based on `8a35ddc`; existing main/demo edits stay untouched. No public release or main merge.
- A person glances at this small warm note beside daytime work; light glass keeps brown ink and restrained warm highlights readable.
- Glass is an opt-in rendered material inside the opaque native window, respecting the documented macOS compositor limitation. No continuous decorative animation or new dependencies.
- Moving an earlier task changes Markdown date ownership. Write Today before removing its source, retain failed-write recovery, and keep completed archived siblings intact.

## Verification
- TypeScript, all 12 Node regression suites, existing pointer/keyboard reorder and Settings layout checks pass. New browser coverage passes at 340/460/1000px, including full-tree date promotion, empty Today, Escape, keyboard, direct Move and persisted material choice. Visual screenshots checked for readability.
- Exact production assets also pass the full shell suite (capture, Undo, Retry, planning and 200% text) and all five Settings sections keep stable geometry. Optimized macOS app build succeeds with the previously documented nonfatal rust-objcopy warning.
- Installed and launched `/Applications/Sticky Todo.app` as local version 2.1.14. Strict deep signature validation and exact bundle hashes pass. All 56 task-file hashes are unchanged after launch.
- Rollback app, native state and task archive: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-materials-5e70qvc2`. Installation report is stored there.
- Source remains on `feat/earlier-tasks-materials`; no merge, push, tag or public release. Main's existing uncommitted demo/docs work remains untouched. Physical drag and material preference acceptance are for the user's installed-app review.
