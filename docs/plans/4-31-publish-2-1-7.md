# 4-31: Publish 2.1.7

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Publish standalone-safe Todo with optional Diane handoff and credential fallback.

## Tasks
- [x] 1. Bump to 2.1.7 and verify frontend build, six release suites, and diff hygiene.
- [ ] 2. Commit and push the release tag; monitor signed builds.
- [ ] 3. Verify published updater manifest and download URLs.

## Decisions
- User explicitly authorized publication.
- Todo works independently of Diane. Handoff requires the separate Diane companion update; its deployment and installed-app acceptance remain pending.
- Merged source passed 24 native tests and disconnected/malformed/stalled browser checks; existing Star Focus TypeScript errors remain.
