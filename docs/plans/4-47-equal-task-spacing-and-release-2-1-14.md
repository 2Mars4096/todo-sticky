# 4-47: Equal Task Spacing And Release 2.1.14

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make visible drag dots, checkbox and text equally spaced and publish the final reviewed interface.

## Tasks
- [x] Measure and correct visible gaps; retain 24px click/drag targets and align composers.
- [x] Verify equal task/step gaps and first-line alignment at compact/default widths; verify completion from the outer hit target.
- [x] Build/install locally and commit/push main/tag.
- [x] Finish signed platform release builds.
- [x] Verify latest public release, all updater targets and signatures.

## Decisions
- The user requested tighter equal spacing while 2.1.13 was building; publish the final follow-up as 2.1.14 without moving existing tags.
- Task gaps are 8px; 13px step squares yield symmetric 8.5px gaps inside the same 24px controls.
- Preserve concurrent documentation/demo changes outside this release scope.

## Progress
- User approved the installed spacing (“now good please release”). Source/tag `a2f3b16` / `v2.1.14`; workflow `39597263611` succeeded.
- Local 2.1.14 installed and launched with verified bundle/signature and 56 unchanged task-file hashes. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-2-1-14-pocyp4sh`.

## Public delivery
- [v2.1.14](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.14) is public and latest. All macOS/Windows/Linux builds and publication pass.
- Four updater targets and public asset links validate; all three unique downloaded packages match their signature files and verify with the configured Ed25519 public key.
- Optional custom release-note editing returned HTTP 401; generated notes remain. Public verification is independent of CLI authentication.
