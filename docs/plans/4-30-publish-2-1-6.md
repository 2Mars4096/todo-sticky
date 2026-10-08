# 4-30: Publish 2.1.6

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish automatic update checks every 15 minutes.

## Tasks
- [x] 1. Bump to 2.1.6 and verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push the release tag; monitor signed builds.
- [x] 3. Verify published updater manifest and download URLs.

## Decisions
- User explicitly authorized publication.
- Startup checks, manual installation, and restart behavior remain unchanged.

## Delivery
- Release source `2a10146`, tag `v2.1.6`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37744287877) passed all three platform builds and publication.
- [v2.1.6](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.6) is public. Updater manifest covers all four targets; asset matching and all download URL checks pass.
