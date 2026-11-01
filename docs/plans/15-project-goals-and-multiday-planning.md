# 15: Project Goals And Multi-Day Planning

**Status:** not-started
**Goal:** Treat long-term goals as ongoing projects with attributed work, schedulable steps and reviewable AI planning across days.

## Tasks
- [ ] 1. Expose project/goal planning on Mac, building on Android's existing goal plan and shared goalId/goalStepId contract.
- [ ] 2. Allow existing daily tasks to be assigned to a project/long-term goal while preserving nested work and dates.
- [ ] 3. Maintain project steps independently of daily placement; schedule selected work into Today or chosen dates without duplicating it.
- [ ] 4. Add multi-day planning inputs (date range, daily time budget, unavailable days), editable proposals and explicit apply.
- [ ] 5. Validate deadlines/capacity, stale proposals, existing scheduled work, repeat application and partial-save recovery across clients.
- [ ] 6. Review compact/mobile UX and rebuild after implementation.

## Decisions
- 2026-11-01 clarification: Goals represent project-based long-term work, not merely reminders. Daily tasks and subtasks retain their project attribution; daily completion contributes to project progress without automatically closing the project.
- Android already has goal steps, selected-date scheduling and linked progress. Desktop currently preserves that data but lacks the matching editor. Reuse these contracts rather than creating a second project/task store.
- AI planning belongs at the project level across multiple days, distinct from the current single-day time-block planner. Suggestions must be editable before daily tasks are created; no automatic rescheduling of user commitments.
- Pending preference: whether AI should create the breakdown as well as dates, or schedule only user-added steps. The offered default is breakdown plus proposed dates.
- This is the clarified next scope. The spacing build in plan 14 does not implement these additional project controls.
