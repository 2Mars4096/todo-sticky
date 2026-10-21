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
- Use ordinary labeled task actions and a More disclosure for infrequent actions. Essential manual step entry stays visible for the selected task.
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
