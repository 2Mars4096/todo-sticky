# 4-22: Publish 2.1.1

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Publish the task-input, reorder, and tray-menu fixes through the signed in-app updater.

## Tasks
- [x] 1. Review the changes and bump the package and lockfile to 2.1.1.
- [x] 2. Run release regression checks and commit the release source.
- [ ] 3. Push main and v2.1.1, monitor all platform builds, and publish.
- [ ] 4. Verify the public update manifest, downloadable archives, and signatures.

## Decisions
- User explicitly authorized publication on 2026-10-05.
- Use the existing signed multi-platform release workflow and unchanged updater trust key.
- Preserve the desktop verification limitation: real mouse and keyboard browser checks pass, but installed macOS interactions have not been inspected.

## Validation
- Frontend production build, five release regression scripts, all 21 native library tests, and diff hygiene pass.
