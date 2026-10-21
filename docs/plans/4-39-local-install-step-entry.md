# 4-39: Local Install Of Step Entry Change

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Install the build without the step-entry plus button on the user's Mac.

## Tasks
- [x] 1. Build the local app bundle and verify its executable and signature.
- [x] 2. Back up the installed app, quit it normally, and replace the bundle.
- [x] 3. Verify installed checksums/signature and relaunch.

## Decisions
- User explicitly requested local installation.
- Keep version 2.1.10 for this local build; no publication or updater signing artifacts.
- Preserve task archives and app settings.

## Verification
- Local optimized app build passes, version 2.1.10.
- Installed bundle exactly matches build output and passes strict deep signature validation; GUI remains running after relaunch.
- Task archive hashes unchanged across installation.
- Rollback bundle: `/private/tmp/sticky-todo-before-step-plus-fisoypnv/Sticky Todo.app`.
