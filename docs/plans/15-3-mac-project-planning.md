# 15-3: Mac Project Planning

**Parent:** [15-project-goals-and-multiday-planning](15-project-goals-and-multiday-planning.md)
**Status:** completed
**Goal:** Add the existing Android project workflows to Mac with minimal UI changes, reinstall, then commit and push.

## Tasks
- [x] Add project step editing/suggestions, linked daily work and progress filtering.
- [x] Add task assignment and editable multi-day proposals using the existing goal/task contract.
- [x] Protect stale proposals, duplicate scheduling and partial cross-file saves with explicit recovery.
- [x] Verify compact/material/keyboard flows and review self-explanatory UI.
- [x] Rebuild and reinstall Mac with data backups, including pending sync-efficiency fixes.
- [x] Commit coherent batches and push, preserving the existing Android work.

## Decisions
- Reuse the current Goals panel, center-page pattern, goalId/goalStepId and provider configuration. No new backend schema or second task store.
- Project completion stays manual. Existing scheduled tasks are opened rather than rescheduled.
- Desktop date files and goal state are separate stores: persist a recoverable operation journal and use native compare-before-write/backups, rather than claiming cross-file atomicity.
- Follow self-explanatory-ui: named actions, inline inputs, accessible icons, no standing instructional paragraphs. Show consequences only for removal/recovery choices.


## Delivery and review
- Long-term titles open the project page directly. Existing phone-created goal text/paragraphs and plan steps render without recreation. Project editing, unscheduled-step selection, dated task links, optional suggestions and editable multi-day proposals share the existing contract.
- Selected daily tasks expose a compact Project selector; explicit different child projects survive assignment. Progress filters project work and labels lifetime plan totals separately from dated task counts. Global focus totals are omitted under a project filter.
- Apply validates the current goal and canonical archive before journaling. Goal state saves first, followed by native compare-before-write/backed-up dates. Interrupted responses/retries skip already-written dates; Discard remaining preserves saved tasks and steps. No cross-file atomicity claim.
- AI reads only project work and relevant date-range context (bounded to 500 rows), not the unrelated full archive. Leaving a request does not save its late response.
- Reviewed liquid-material layouts at 340/460/1000px and enlarged text. Minimal-copy pass removes redundant explanations, preserves accessible labels, makes title opening direct, marks completed steps clearly, and retains removal/recovery consequences.
- Checks pass: 22 Node suites, TypeScript, 40 native tests, production project workflows (including partial failure/retry), paragraph editing and materials/promotion. Existing Android formatting/analyzer and 100 tests also pass.
- Installed exact signed Mac bundle and launched successfully; all 56 task files/native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-mac-projects-install-20261102-090034`. This installation also includes the pending sync-efficiency changes from plan 16. No Android APK rebuild or backend deployment was needed.
- Native AI transport is compiled and proposal validation uses synthetic responses; live model quality and physical user acceptance remain separate.

## Publication

- `6b7e2a79` — feat: refine Android project planning and task controls
- `1d334ed6` — perf: reduce redundant sync work and resume after editing
- `3572b9f3` — feat: bring shared project details and planning to Mac
- `f78ea29d` — docs: record Mac project parity and verified installation

Source batches pushed to origin/main and remote verified at `f78ea29d`; this documentation-only completion receipt follows. No generated/private artifacts included.
