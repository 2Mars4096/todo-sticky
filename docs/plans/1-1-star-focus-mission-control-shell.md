# 1-1: Star Focus Mission Control Shell

**Parent:** [1-star-focus-integration-design](1-star-focus-integration-design.md)
**Status:** completed
**Goal:** Add the first frontend-only Star Focus shell so the app has a real three-column layout and a usable Mission Control sidebar.

## Tasks
- [x] 1. Add Star Focus frontend state and types for:
  sidebar collapse, selected task, active session, mission history, and lightweight starmap progress.
- [x] 2. Add a right-sidebar Mission Control shell to the app layout with:
  empty, task-selected, active-session, and mission-complete states.
- [x] 3. Add a task-to-Mission-Control handoff from the center list without breaking existing edit, status, delete, or push flows.
- [x] 4. Render a static first-pass starmap and phase timeline in the sidebar using lightweight 2D UI primitives only.
- [x] 5. Persist Star Focus v1 state locally and verify the existing markdown-backed task workflow is unchanged.
- [x] 6. Run the default frontend verification command and update tracking docs with follow-up work.

## Decisions
- Mission Control is a frontend-only slice in this plan; no Tauri commands or markdown schema changes belong here.
- The shell should prove layout, state ownership, and basic interaction before animation-heavy work begins.
- The initial selected-task handoff can use an explicit task-level Focus CTA instead of overloading existing click-to-edit behavior.
- Session completion creates persistent local mission history but intentionally leaves task completion status under manual user control.

## Notes
- Keep the right sidebar narrow and information-dense enough to coexist with the current sticky-note window.
- Defer richer animation choreography, overlay experiments, and non-local persistence to later plans if the shell lands cleanly.
- Implementation landed in `src/hooks/useStarFocus.ts`, `src/components/MissionControlSidebar.tsx`, and the task-list handoff flow in `src/components/TaskList.tsx` and `src/components/TaskItem.tsx`.
- Verification: `npm run build:frontend`
