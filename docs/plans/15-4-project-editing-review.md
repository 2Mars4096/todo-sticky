# 15-4: Convenient Project Editing And Review

**Parent:** [15-project-goals-and-multiday-planning](15-project-goals-and-multiday-planning.md)
**Status:** completed
**Goal:** Make description, step and scheduled-work revision consistent and easy without adding a new workflow.

## Tasks
- [x] Review editing, proposal review, scheduled-task navigation and cancellation.
- [x] Use one inline Save/Cancel pattern with keyboard shortcuts and stale-edit protection.
- [x] Allow scheduled task text/work-date revision inside the project, preserving status/deadline/links; provide direct return from full daily-task review.
- [x] Verify edit/cancel/retry and compact layouts, reinstall Mac and record delivery.

## Decisions
- Apply self-explanatory-ui. Keep AI proposals directly editable and explicit Apply/Discard; keep consequential removal warnings.
- Inline scheduled text/work-date revision edits the actual daily task, not a duplicate plan record. Status/deadline edits stay on its full daily view. Root date moves save destination before source removal, reject collisions and use the existing recovery journal.


## Review findings and corrections
- Step editing lacked Cancel and Escape could leave the project. Description and step editors now share Save/Cancel, Cmd/Ctrl+Enter, Escape and focus restoration.
- Scheduled text revision required leaving the project. Its date row now offers an inline editor for actual task text and root work date; status, deadline, nested content and goal linkage remain intact.
- The daily task lacked a direct return path. Review navigation now exposes a compact Project return button in the existing date-header row.
- Edits now retain their original goal/task snapshot; incoming changes are rejected instead of overwritten. Cancel after a stale-edit error refreshes the latest work.
- Switching pages or editors with a changed draft keeps it visible and requests Save/Cancel inline. No additional confirmation modal is introduced. Pending native writes use the existing explicit recovery controls rather than letting newer text diverge from a saved journal.
- AI proposals stay directly editable with existing Apply/Discard. No new planning menu or extra approval step.

## Verification
- 22 Node suites, TypeScript/build and the production project browser suite pass. New cases cover description/step cancel, keyboard save, inline scheduled text/date changes, preserved completion/deadline/children, stale external edits, unsaved navigation and return-to-project.
- Screenshots reviewed at compact/default/wide sizes and enlarged text under ignored `output/project-edit-review/`.

- Rebuilt and installed the exact signed Mac bundle. Launch succeeds; all 56 task files/native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-project-edit-review-install-20261102-151302`. Android and backend unchanged.
