# 4-28: Publish 2.1.4

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish hover-revealed top-level task entry through the signed updater.

## Tasks
- [x] 1. Apply the requested hover behavior and bump the version to 2.1.4.
- [x] 2. Run the frontend build and six release regression suites.
- [x] 3. Commit, tag, and push the release source.
- [x] 4. Monitor platform builds and verify published updater assets.

## Decisions
- User authorized publication, then clarified that the empty field should appear on hover.
- Preserve keyboard focus, visible drafts, and touch-device access, matching step entry.

## Delivery
- Release source `d324ceb`, tag `v2.1.4`.
- [Release workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37335803756) passed all three platform builds and publication.
- [v2.1.4](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.4) published on 2026-10-06 (Hong Kong).
- Public updater feed reports 2.1.4 and covers all four targets. Published asset matching and HTTP download checks pass.
