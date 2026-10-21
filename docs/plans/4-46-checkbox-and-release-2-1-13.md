# 4-46: Checkbox Alignment And Release 2.1.13

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Align checkbox visuals to task text and publish the complete reviewed UI as the latest update.

## Tasks
- [x] Match visible square size to title font and center on the first line, preserving 24px click targets.
- [x] Verify task/step geometry at 340px and 460px, completion via the outer target, TypeScript and production frontend build.
- [ ] Commit/push main and v2.1.13; monitor signed platform builds.
- [ ] Verify final public manifest, asset URLs and package signatures; confirm latest is 2.1.13.

## Decisions
- User requested the checkbox refinement during 2.1.12's build, followed by regenerated releases, commit and push.
- Keep in-flight/published tags immutable; release the requested follow-up as 2.1.13.
- Preserve concurrent demo/README work; scope this commit to checkbox, version and its tracking records.
