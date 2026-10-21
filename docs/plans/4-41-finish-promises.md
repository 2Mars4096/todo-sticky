# 4-41: Finish Promises

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Add optional finish criteria, persistent deadlines, bounded AI breakdown, and explicit review in existing rows.

## Tasks
- [x] Persist finish metadata and stopped status through Markdown, aggregation, carry, and agent extraction.
- [x] Add inline sentence/deadline editing, urgency badges, review and overdue controls.
- [x] Guide existing AI breakdown using the promise and deadline.
- [x] Verify persistence, completion, date boundaries, and compact UI.
- [x] Build, back up, reinstall locally, and verify the review bundle.

## Decisions
- Separate worktree/branch; main retains reliability fixes only.
- Existing title editing remains available; selecting a row reveals inline controls.
- Deadline changes/removal record history; moving work never changes its deadline.
- Stopped is distinct from completed and excluded from future carry-over.

## Verification
- Full TypeScript checking; 27 native tests; completion/persistence, loading, rollover, midnight and DST checks pass.
- Isolated Chrome verifies finish editing, deadline/history persistence, review/revise/complete/stop, carry-forward metadata, reload, and 350px layout. Pointer and keyboard reorder/persistence pass at 350px and 460px; native pointer acceptance remains unverified.
- Optimized local bundle builds and passes strict deep signing. Rust 1.99.1 emitted nonfatal debug-stripping warnings about its `rust-objcopy` LLVM library; app linking/bundling/signing succeeded.

## Local installation
- Installed and launched `/Applications/Sticky Todo.app`, local version 2.1.10; no public release.
- Verified exact bundle hashes and strict deep signature; all 56 checked task-file hashes remained unchanged.
- Rollback app: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-finish-s48ginaw/Sticky Todo.app`.
- Feature worktree: `.worktrees/finish-promises`, branch `feature/finish-promises`; feature is not merged into main.
- User review pending; native pointer behavior is still a manual acceptance item.

- Durable checkout was recreated at the same feature commit because a direct cross-volume move is unsupported. The detached `/private/tmp/todo-finish-review` checkout retains build/test artifacts.
