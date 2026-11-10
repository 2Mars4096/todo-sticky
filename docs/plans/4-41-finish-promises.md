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

## Completed follow-ups

<a id="4-41-1-finish-ghost-suggestions"></a>

## 4-41-1: Finish Ghost Suggestions

**Goal:** Make defining enough easier with reversible grey suggestions and minimal date controls.

### Tasks
- [x] Replace blank Done when editor with What would be enough and contextual AI ghost text.
- [x] Tab accepts; typing overrides; clearing restores the cached suggestion; Escape cancels. Never persist unaccepted suggestions or overwrite typed text when AI responds.
- [x] Keep one editor open and save dates without a separate Save/Cancel row; scope/stop actions appear only for overdue commitments or review.
- [x] Verify type checking, native tests and isolated interaction checks.
- [x] Set and verify the installed OpenRouter profile to deepseek/deepseek-v4.1-flash.
- [x] Build and reinstall locally with a rollback backup.

### Decisions
- Request one short suggestion when the user opens the finish editor, using the configured provider; ordinary task capture never waits for AI.
- Cache only within the task component; keep suggestions outside persisted task metadata until accepted.
- Provider errors leave manual editing available. No Use this/Edit buttons.

### Verification
- Full TypeScript checking, 27 native tests and both finish-workflow browser suites pass. Verified async suggestions cannot overwrite typing, Tab acceptance, clear/reappear, Escape, explicit deletion and date auto-save at 350px.
- OpenRouter unversioned `deepseek/deepseek-v4.1-flash` verified against its model page and a successful short synthetic API request. Active and saved OpenRouter profiles now match.
- Reinstalled and launched the optimized bundle; exact hashes and strict signature pass, all 56 task-file hashes unchanged.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-ghost-e9ml2_rf`. No public release or merge into main.

<a id="4-41-2-outcome-due-presentation"></a>

## 4-41-2: Outcome / Due Presentation

**Goal:** Present finish metadata consistently in two stable inline rows.

### Tasks
- [x] Use Outcome / Due labels with fixed label/value alignment in display and edit states.
- [x] Single-click selects; double-click or Enter edits the title.
- [x] Show grey suggestions and No date on selection; hide unsaved metadata when unselected.
- [x] Keep Tab acceptance, typing/clearing, explicit review and persistent deadlines.
- [x] Verify browser interactions, dates, build and locally reinstall.

### Decisions
- Selecting a task can request an ephemeral outcome suggestion using the configured provider; manual editing remains independent.
- Saved Outcome / Due rows remain visible when unselected. Date labels use Today, N days overdue, or weekday/month/day without redundant By/Due text.

### Verification
- TypeScript and date-boundary tests pass. Both browser finish suites pass, including single-click selection, double-click title editing, suggestion overwrite/clear/Tab, hiding unaccepted metadata, review and carry-forward persistence.
- Inspected 350px selected-row screenshot; Outcome / Due align consistently.
- Optimized app installed and launched; strict signature and exact bundle hashes verified, all 56 task-file hashes unchanged.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-outcome-due-l1es1k83/Sticky Todo.app`. Remains on feature/finish-promises; no main merge.

### Outcome editor edge refinement
- [x] Match the title editor: transparent surface, no rounded box or resize grip, one accent underline, and no offset double focus ring. Keep value text aligned with its display position.
- [x] Verify visually and reinstall the local review bundle.
