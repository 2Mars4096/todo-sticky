# 4-31: Publish 2.1.7

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish standalone-safe Todo with optional Diane handoff and credential fallback.

## Tasks
- [x] 1. Bump to 2.1.7 and verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push the release tag; monitor signed builds.
- [x] 3. Verify published updater manifest and download URLs.

## Decisions
- User explicitly authorized publication.
- Todo works independently of Diane. Handoff requires the separate Diane companion update; its deployment and installed-app acceptance remain pending.
- Merged source passed 24 native tests and disconnected/malformed/stalled browser checks; existing Star Focus TypeScript errors remain.

## Delivery
- Release source `b62dc29`, tag `v2.1.7`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38128569236) passed macOS universal, Windows, Linux, and publication.
- [v2.1.7](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.7) is public. Latest updater manifest covers all four targets; uploaded asset matching and all updater download URLs pass.
- Local GitHub CLI credentials were invalid for custom release-note editing; workflow publication succeeded using its own credentials, and verification used public endpoints.
