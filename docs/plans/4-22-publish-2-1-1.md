# 4-22: Publish 2.1.1

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish the task-input, reorder, and tray-menu fixes through the signed in-app updater.

## Tasks
- [x] 1. Review the changes and bump the package and lockfile to 2.1.1.
- [x] 2. Run release regression checks and commit the release source.
- [x] 3. Push main and v2.1.1, monitor all platform builds, and publish.
- [x] 4. Verify the public update manifest, downloadable archives, and signatures.

## Decisions
- User explicitly authorized publication on 2026-10-05.
- Use the existing signed multi-platform release workflow and unchanged updater trust key.
- Preserve the desktop verification limitation: real mouse and keyboard browser checks pass, but installed macOS interactions have not been inspected.

## Validation
- Frontend production build, five release regression scripts, all 21 native library tests, and diff hygiene pass.

## Delivery
- Release source: `59619b9`; tag `v2.1.1`.
- All three platform builds passed in [run 37260710431](https://github.com/2Mars4096/todo-sticky/actions/runs/37260710431). The publication job failed because draft asset URLs use `untagged-*` paths; the workflow now validates draft names and checks final URLs after publication, with regression coverage.
- Published the already-built draft after validating uploaded digests and updater signatures for every platform. [v2.1.1](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.1) is the latest stable release.
- macOS bundle version and strict code signature pass; both GUI and task API contain Intel and Apple Silicon slices. Installed user app is left for the in-app updater.

- Public latest.json reports 2.1.1 and all updater download URLs return HTTP 200. Public macOS bytes verify against the installed trust key. Windows/Linux CI artifacts verify cryptographically and match GitHub uploaded SHA-256 digests; a redundant full Linux public download was stopped after slow transfer, and public URL access was checked separately.
