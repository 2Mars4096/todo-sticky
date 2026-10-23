# 4-50: Today-First Planning

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Plan every unfinished task on the selected day before allocating spare capacity to Earlier tasks.

## Tasks
- [x] 1. Separate selected-day commitments from earlier backlog in scheduling requests and native prompts.
- [x] 2. Show coverage prominently and block applying proposals that omit selected-day work or displace it with earlier work.
- [x] 3. Test priority, incomplete/short-window proposals, empty Today, dates, persistence and stale results.
- [x] 4. Build and install the branch locally with backup and task-integrity verification.

## Decisions
- Continue the user's branch-first/local-test workflow on `fix/today-first-planning`, based on `66eb469`. Preserve main's unrelated demo work. No new release or merge yet.
- Every unfinished selected-day root needs at least one concrete, realistic block. Budget across those tasks before adding extra steps or earlier work. Completed/stopped roots are excluded; tasks moved into Today receive the same priority.
- Earlier work may use spare capacity only after selected-day work on the same person/machine. Never invent short blocks to pretend an impossible workload fits. Incomplete proposals remain reviewable with missing task names visible and Apply disabled.
- Guard coverage again at task mutation time, in addition to the preview. Retain date/fingerprint/loading checks, preview, Discard and Undo.

## Verification
- TypeScript, all 12 Node suites (including new grouping/coverage/priority cases), and all 29 native tests pass. Cargo check and optimized macOS build pass.
- Production browser checks pass at 340/460px: current-only priority, early-backlog rejection, visible omissions, insufficient-time Apply blocking, complete plans, Apply/Undo and empty-Today fallback. Full shell suite still passes (stale plans, planning details, date navigation, recovery and 200% text).
- Installed and launched the branch as local 2.1.15. Strict deep signature and exact built/installed bundle checks pass; all 56 task-file hashes remain unchanged after launch. Prior app, native state and tasks: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-today-first-gmop4w_c`.
- No main merge or public release for this correction. Model responses were exercised with deterministic synthetic fixtures; no live provider generation was charged. Real planning review is available in the installed app.
