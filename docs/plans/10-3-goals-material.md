# 10-3: Goals Material Consistency

**Parent:** [10-user-workflow-improvements](10-user-workflow-improvements.md)
**Status:** completed
**Goal:** Apply the selected note material to Goals and Routines in compact and wide desktop layouts.

## Tasks
- [x] Trace the fixed yellow backgrounds overriding the material.
- [x] Reuse the material surface through a shared CSS property, preserving Paper fallback.
- [x] Verify all three materials at compact/default/wide sizes and inspect screenshots.
- [x] Rebuild/reinstall Mac with backup and data/signature verification.

## Decisions
- Desktop fix in the context of the installed Mac app. Keep the saved material selection and all task/routine behavior.
- Both base and compact Goals background declarations must use the material token; fixing only one selector would leave the other layout incorrect.


## Verification
- Production browser checks pass for Paper/Frosted/Liquid at 340×440, 460×640 and 1000×760; Goals uses the selected background in both compact and wide modes. Existing promotion, keyboard, metadata and persistence checks also pass.
- Visually inspected Liquid compact and Frosted wide screenshots under `output/playwright/goals-material/`. Text, controls and layout remain readable; no extra animation/dependency.
- Rebuilt and installed `/Applications/Sticky Todo.app`; strict signature and exact bundle hashes verify, launch succeeds, all 56 task files and native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-goals-material-install-20261030-234012`. Saved material preferences were retained.
