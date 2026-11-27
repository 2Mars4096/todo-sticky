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
- The original implementation used `fix/today-first-planning` at base `66eb469`. The 2026-11-27 consolidation ported it to the current web and Mac paths and kept the existing time constraints, localization and Undo behavior.
- Every unfinished selected-day root needs at least one concrete, realistic block. Budget across those tasks before adding extra steps or earlier work. Completed/stopped roots are excluded; tasks moved into Today receive the same priority.
- Earlier work may use spare capacity only after selected-day work on the same person/machine. Never invent short blocks to pretend an impossible workload fits. Incomplete proposals remain reviewable with missing task names visible and Apply disabled.
- Guard coverage again at task mutation time, in addition to the preview. Retain date/fingerprint/loading checks, preview, Discard and Undo.

## Original branch verification
- TypeScript, all 12 Node suites (including new grouping/coverage/priority cases), and all 29 native tests pass. Cargo check and optimized macOS build pass.
- Production browser checks pass at 340/460px: current-only priority, early-backlog rejection, visible omissions, insufficient-time Apply blocking, complete plans, Apply/Undo and empty-Today fallback. Full shell suite still passes (stale plans, planning details, date navigation, recovery and 200% text).
- Installed and launched the branch as local 2.1.15. Strict deep signature and exact built/installed bundle checks pass; all 56 task-file hashes remain unchanged after launch. Prior app, native state and tasks: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-today-first-gmop4w_c`.
- The original branch exercised deterministic model responses without calling a live provider.

## 2026-11-27 merge verification

| Client | Build | Workflow |
| --- | --- | --- |
| Web | Production Vite bundle passed. | All 34 Node suites passed. Chromium at 340 and 460 px verified missing tasks, short-window blocking, priority, Apply and Undo, and planning from earlier tasks when the selected date is empty. |
| Mac | Native Rust test build passed. | All 46 Rust tests passed. The shared notebook planner also passed the Node regression suite. |
| Android | Installable build was outside this branch cleanup. | Android-targeted cases passed in the combined 176-test Flutter run. |
| iPhone | Installable build was outside this branch cleanup. | iPhone-targeted cases passed in the combined Flutter run. One unrelated case was skipped by the suite. |
| Embedded editor | Typecheck, production package and dist checks passed. | 75 client tests and 36 backend tests passed against the local Shiprite runtime. |
