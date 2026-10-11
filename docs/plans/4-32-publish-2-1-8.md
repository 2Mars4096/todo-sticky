# 4-32: Publish 2.1.8

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish the default-off local Diane connection setting and grey unavailable controls.

## Tasks
- [x] 1. Verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push v2.1.8; monitor signed platform builds.
- [x] 3. Verify public updater manifest, assets, and download URLs.

## Decisions
- User explicitly requested publication.
- Native tests (24) and browser lifecycle/disabled-mode checks passed before release preparation.
- Diane companion deployment remains separate; Todo works independently.

## Delivery
- Release source `902333e`, tag `v2.1.8`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38135848396) passed all three platform builds and publication.
- [v2.1.8](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.8) is public. Latest updater manifest covers all four targets; asset matching and all updater download URLs pass.
