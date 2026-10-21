# 4-46: Checkbox Alignment And Release 2.1.13

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Align checkbox visuals to task text and publish the intermediate checkbox update; final spacing/public verification is tracked in 4-47.

## Tasks
- [x] Match visible square size to title font and center on the first line, preserving 24px click targets.
- [x] Verify task/step geometry at 340px and 460px, completion via the outer target, TypeScript and production frontend build.
- [x] Commit/push main and v2.1.13; all signed platform builds and publication succeeded.
- [x] Supersede this intermediate release with approved 2.1.14; final manifest/assets/package signatures and latest pointer verified under 4-47.

## Decisions
- User requested the checkbox refinement during 2.1.12's build, followed by regenerated releases, commit and push.
- Keep in-flight/published tags immutable; release the requested follow-up as 2.1.13.
- Preserve concurrent demo/README work; scope this commit to checkbox, version and its tracking records.

## Progress
- Source/tag `7ba1c9a` / `v2.1.13`; workflow `39596361020` succeeded.
- Local 2.1.13 was installed and launched with matching bundle/signature and 56 unchanged task files; backup `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-2-1-13-_5ml2hr3`.
- The user requested equal horizontal spacing after this install; final latest verification moves to [4-47](4-47-equal-task-spacing-and-release-2-1-14.md).
