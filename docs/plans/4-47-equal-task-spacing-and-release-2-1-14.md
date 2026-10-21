# 4-47: Equal Task Spacing And Release 2.1.14

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Make visible drag dots, checkbox and text equally spaced and publish the final reviewed interface.

## Tasks
- [x] Measure and correct visible gaps; retain 24px click/drag targets and align composers.
- [x] Verify equal task/step gaps and first-line alignment at compact/default widths; verify completion from the outer hit target.
- [ ] Build/install locally, commit/push and generate signed platform releases.
- [ ] Verify latest public release, all updater targets and signatures.

## Decisions
- The user requested tighter equal spacing while 2.1.13 was building; publish the final follow-up as 2.1.14 without moving existing tags.
- Task gaps are 8px; 13px step squares yield symmetric 8.5px gaps inside the same 24px controls.
- Preserve concurrent documentation/demo changes outside this release scope.
