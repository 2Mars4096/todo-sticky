# 4-29: Publish 2.1.5

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish the root-entry alignment correction.

## Tasks
- [x] 1. Remove the leading plus and align the input to the root checkbox column.
- [x] 2. Verify frontend build, six release suites, and diff hygiene; bump to 2.1.5.
- [x] 3. Push the release tag and monitor signed platform builds.
- [x] 4. Verify public updater manifest and download URLs.

## Decisions
- User explicitly authorized republication on 2026-10-08.
- Preserve hover/focus reveal, visible drafts, touch access, and Enter submission.

## Delivery
- Release source `2d018ab`, tag `v2.1.5`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37737069107) passed macOS, Windows, Linux, and publication.
- [v2.1.5](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.5) is public. Updater manifest covers all four targets; asset matching and all download URL checks pass.
