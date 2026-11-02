# 15: Project Goals And Multi-Day Planning

**Status:** completed
**Goal:** Treat long-term goals as ongoing projects with attributed work, schedulable steps and reviewable AI planning across days.

## Tasks
- [x] 1. Expose project/goal planning on Mac, including phone-created description/steps, task assignment, linked progress and multi-day proposals; installed in [15-3](15-3-mac-project-planning.md).
- [x] 2. Android: assign existing tasks to a project, retaining dates/status and related nested work; preserve explicitly different child projects.
- [x] 3. Android: retain existing manual goal-step scheduling and expose linked daily work alongside project steps.
- [x] 4. Android: add multi-day date range, per-project minutes/day and weekdays-only controls, editable proposal dates/text/estimates and explicit apply.
- [x] 5. Android: validate capacity, stale proposals, existing scheduled/assigned work, repeat application and atomic-save retry. Existing deadlines supplied as AI context; full calendar integration remains out of scope.
- [x] 6. Android: review normal/enlarged mobile UI, rebuild signed APK +12 and verify update preservation. See [15-1](15-1-android-project-planning.md).

## Decisions
- 2026-11-01 clarification: Goals represent project-based long-term work, not merely reminders. Daily tasks and subtasks retain their project attribution; daily completion contributes to project progress without automatically closing the project.
- Android already has goal steps, selected-date scheduling and linked progress. Desktop currently preserves that data but lacks the matching editor. Reuse these contracts rather than creating a second project/task store.
- AI planning belongs at the project level across multiple days, distinct from the current single-day time-block planner. Suggestions must be editable before daily tasks are created; no automatic rescheduling of user commitments.
- Use the offered default: AI can create the breakdown and dates while reusing unscheduled existing steps. Existing scheduled tasks are not rescheduled.
- This is the clarified next scope. The spacing build in plan 14 does not implement these additional project controls.


## Current delivery slice
- User requests minimal changes and specifically asks for the APK. Implement Android project assignment and a multi-day AI proposal inside the existing goal editor; desktop project-editor parity remains a separate follow-up.
- Reuse goal plans, stable goal/task links and atomic notebook saves. No backend/schema changes or second task database.
- Default AI behavior creates a breakdown when useful and reuses unscheduled existing steps. Date range, per-project daily budget and weekdays-only option are local proposal inputs. Users edit/remove proposed tasks, dates and estimates before explicit apply.
- Existing daily work is supplied as planning context; the budget applies to this project's proposed work, not a claim of full calendar availability. Existing scheduled tasks are never moved by a proposal.

## Mac parity — 2026-11-02

The user requests minimal Mac parity, self-explanatory-ui, installation and commit/push. [15-3](15-3-mac-project-planning.md) implements and installs the matching project editor while retaining the shared data model, ordinary task behavior and selected material.
