# 4-44: UI And Interaction Refinement

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Make the working note readable at its minimum size, deliberate to edit, recoverable to save, and clear about planning and completion.

## Tasks

- [x] 1. Make Outcome suggestions intentional, cancel non-destructive, title entry IME-safe, and date editing reversible.
- [x] 2. Give Settings, Focus and plan dialogs contained keyboard focus and restoration.
- [x] 3. Add deletion/plan Undo and persistent failed-save recovery without losing task identity, hierarchy, date or order.
- [x] 4. Repair Focus shaders and provide a working lightweight fallback after rendering failures.
- [x] 5. Replace compact idle rails with named entries, reduce header space, fix footer overlap, and preserve capture.
- [x] 6. Organize selected task actions as Focus / Add step / More; disclose step groups and subordinate metadata.
- [x] 7. Preview chronological AI plans using the selected date, explicit time window and actual machines; Apply / Discard / Undo without accumulating old open plan blocks.
- [x] 8. Start with capture, group Settings by purpose, and use honest history/routine/focus labels.
- [x] 9. Verify full production shell at 340×440, 460×640 and wide, keyboard/text enlargement, save failure, Undo, and capture, focus and review workflows.
- [x] 10. Update design decisions, architecture, user instructions and tracking; record native acceptance boundaries.
- [ ] 11. Run native Cargo checks/tests and isolated installed-app acceptance on the target platforms (compiler/desktop unavailable in this environment).
- [ ] 12. Observe one relevant person completing the capture-to-review loop; record comprehension and friction before deciding release scope.

## Decisions

- The user requested implementation on a separate worktree. Base: `0168c6b`; branch: `feat/ui-interaction-refinement`. Main and installed applications remain separate.
- Preserve warm note styling, persistent capture, optional Outcome/Due, explicit outcome review, flat goals and the space theme.
- At compact widths, named Goals and Focus controls replace idle rail columns; active focus status remains visible. Wide layouts retain side tools.
- Use direct icon buttons for Focus, Add step, Suggest steps with AI and Move, with hover titles and accessible names; reserve More for infrequent actions (user refinement after local review). Essential manual step entry stays visible for the selected task.
- Selecting a task is not an AI request. Suggestions are explicitly requested inside an empty outcome editor and remain drafts until saved.
- Plan generation is a preview. Replanning replaces only unfinished generated blocks for that planning date; manual and completed work is retained.
- Undo is a targeted one-level operation, not a full snapshot rollback. It preserves later independent work and expires when the loaded storage context changes. Failed saves preserve the newest in-memory snapshot and block replacement reads.
- Keep a single reusable Node regression command (`npm test`) and run it from the release gate. Browser checks use the portable fixture helper and production assets, with screenshots optional.
- No new recurrence engine, task-data recovery, release, native installation or external integration scope.

## Verification Record

- Full TypeScript check and production Vite build pass. The pre-existing on-demand 3D chunk still produces Vite's size warning; it remains lazy-loaded.
- All twelve Node regression suites pass, including save recovery, deletion/plan history and captured-context planning validation. The new Rust planning-window unit test awaits the native toolchain.
- The three production browser suites cover complete shell sizes, 200% text, keyboard containment/restoration, task editing, explicit suggestion drafts, synthetic IME Enter, staged dates, deletion/plan Undo, failed writes/Retry, late/stale plan results and independent focus completion. Separate Vite fixture suites cover goal/routine CRUD and pointer/keyboard reorder with parent/date boundaries and reload persistence.
- Normal shaders, forced construction/shader failures, real WebGL context loss, retry and renderer cleanup pass in Chromium/SwiftShader. Reduced motion does not keep drawing while idle.
- Minimum-window task area: 338×271px at y=125 versus the review baseline's 246×226px at y=164. Default-window task area: 458×471px.

## Acceptance boundaries

- Browser tests use isolated task/settings fixtures and real production frontend assets.
- Physical IME, native window dragging/resizing, and native GPU rendering require an installed-app pass on the target platforms. Browser checks must not be reported as native acceptance or a real-person usability study.

## Local macOS installation — 2026-10-21

- User subsequently authorized fetching and installing the pushed branch. Built exact commit `3fcad22166ee576cbe3e0f8ae3bb85e65da77c81` in an isolated checkout; main remains unchanged.
- All 12 Node suites, TypeScript and all 28 native tests pass. Optimized macOS application build succeeds with the previously documented nonfatal debug-stripping warning.
- Installed and launched `/Applications/Sticky Todo.app`, retaining version 2.1.11. Exact bundle hashes and strict deep code-signature checks pass; all 56 task-file hashes remain unchanged after launch.
- Prior app, native state and task archive backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-ui-refinement-2q714xk3`.
- Native launch verified; physical IME, dragging/resizing, GPU interaction, other platforms and real-person usability acceptance remain pending. Task 11 remains open for those acceptance checks.

## Direct task actions follow-up

- [x] Promote AI suggestions and date-aware Move out of More; make all primary controls icons with native hover titles and accessible names.
- [x] Preserve existing action handlers, busy/disabled states and keyboard focus.
- [x] Verify compact browser interactions and reinstall with backup/data checks.
- TypeScript, production build and isolated 340/460px browser checks pass: direct AI and Move work, Add step focuses input, all icons have hover/accessibility names.
- Reinstalled and launched; strict signature and bundle hashes match, all 56 task files unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-action-icons-7e8yyh2f`.

## Step entry copy trim

- [x] Remove the “Enter to add” helper below the step input; Enter submission remains unchanged.
- [x] Remove duplicate Edit title from More; retain double-click and keyboard title editing.
- [x] Build and reinstall both copy trims locally with the final compact-controls changes.

## Final compact controls follow-up

- [x] Remove More and expose Delete directly beside Focus, Add step, AI suggestions and Move. Retain title double-click/keyboard editing and deletion Undo.
- [x] Remove every Enter-to-add hint from task steps, goals and routines; keep keyboard submission.
- [x] Remove the global history checkbox; offer collapsed Earlier steps per task only when historical steps exist.
- [x] Use single-word bottom-bar labels: Goals, Focus, Plan, Albums, Settings.
- [x] Verify final build and reinstall locally with backup and unchanged task hashes.

Copy/Stop/Diane task-row menu entries are omitted at the user's request to retain only Delete from that menu. Outcome review still supports Stop, and integration settings/stored links remain intact.

Final validation: TypeScript, optimized app build, task-interaction and complete-shell browser suites pass. Task-local historical-step disclosure and routine Enter submission verified in isolated fixtures. Installed app launches, strict deep signature and bundle hashes match, and all 56 task-file hashes remain unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-compact-cleanup-q6r5pg18`.

## Startup layout flash

- [x] Replace immediate native Ready reveal with one-shot frontend shell readiness and bounded native fallback.
- [x] Verify delayed/failed frontend startup and install the correction.
- TypeScript, 28 native tests and isolated startup checks pass: the signal sees the committed compact shell; optional service stalls do not block it; failed module load leaves the native timeout in control. Native fallback is bounded in code; no frame-by-frame native visual capture was performed.
- Installed and launched with strict signature/exact bundle validation and 56 unchanged task-file hashes. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-launch-fix-6iahm5de`.

## Stable Settings layout

- [x] Replace 2×2 navigation with a single row: Storage, AI, Integrations, Updates.
- [x] Give the dialog a viewport-bounded fixed height and keep longer content scrolling between a fixed header and footer.
- [x] Verify all four sections keep identical panel/footer geometry at 340×440, 460×640 and 1000×800; expanding AI details does not resize the dialog. TypeScript passes.
- [x] Reinstall locally with backup and data checks.
- Installed and launched; strict signature/exact bundle verified and all 56 task-file hashes unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-settings-layout-cr2xscf8`.

## Main integration

- [x] User reviewed the installed refinements and authorized main integration and feature-worktree cleanup.
- [x] Confirm the durable feature worktree exactly matches the verified build checkout.
- [ ] Commit the refinements, fast-forward local main and remove the two UI-refinement worktrees after preservation checks.
- Broader cross-platform, physical IME/GPU and real-person capture-to-review acceptance remain separate follow-ups above. No release/version bump is part of this integration.
