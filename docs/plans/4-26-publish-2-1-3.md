# 4-26: Publish 2.1.3

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Publish automatic update indicators and hover-revealed step entry through the signed updater.

## Tasks
- [x] 1. Review changes and bump the package and lockfile to 2.1.3.
- [ ] 2. Run release checks, commit, and push the version tag.
- [ ] 3. Monitor signed platform builds and automatic publication.
- [ ] 4. Verify the public updater feed, download URLs, and Mac signature.

## Decisions
- User explicitly authorized publication on 2026-10-05.
- Include the new automatic-check regression suite in release CI.
- Preserve manual installation/restart and the existing updater trust key.
