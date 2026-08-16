# 4-9: Data History Recovery And Merge

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Recover prior task archives and app history into the configured local knowledge-base store without losing or duplicating current data.

## Tasks
- [x] 1. Resolve the active knowledge-base path and inventory prior normal, isolated-launcher, repository, and WebKit stores.
- [ ] 2. Materialize any cloud-only source archives before reading or merging them.
- [x] 3. Back up the current local knowledge-base task archive.
- [ ] 4. Merge missing weekly archives while preserving current files as authoritative on conflicts.
  - [x] 4-1. Restore the readable `2026-02-23` week with an exact checksum match.
  - [ ] 4-2. Restore the cloud-only `2026-03-09` week after its 2,648-byte content is available.
- [x] 5. Reconcile recoverable Star Focus and goals history from prior app stores.
- [ ] 6. Verify merged date/task coverage, restart the app, and confirm it uses the local knowledge-base path.

## Decisions
- Treat `/Users/lizhi/Downloads/local_projects/my-knowledge-base/content/to-do` as the destination because the saved app configuration already points at that knowledge base.
- Never read a macOS `SF_DATALESS` placeholder as empty and never replace an existing destination week without an explicit content-aware merge.
- Keep a timestamped backup adjacent to the destination task archive before making external data changes.

## Notes
- The destination currently contains 53 fully local weekly files.
- Readable recovery source: repository week `2026-02-23`.
- Cloud-only recovery source: prior default-store week `2026-03-09` (2,648 logical bytes, zero local blocks).
- Both normal and isolated native Star Focus stores currently report zero retained missions. The legacy and current WebKit goal stores contain no goal items.
- Backup created at `/Users/lizhi/Downloads/local_projects/my-knowledge-base/content/to-do-backup-before-history-merge-2026-08-16-1345` and verified against all 53 pre-merge weekly files.
- The destination now contains 54 weekly files. Restored `2026-02-23/index.md` is byte-identical to the readable repository source and adds the `2026-02-26` task section.
- The oldest available local Time Machine snapshot also contains only the `SF_DATALESS` March placeholder, so it cannot provide the missing content.
- The Dropbox provider request remains stalled after a correct account-profile restart and single-file request reset. A Chrome Dropbox sign-in handoff is open as the remaining recovery route.
