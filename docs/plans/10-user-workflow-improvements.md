# 10: User Workflow Improvements

**Status:** completed
**Goal:** Improve awareness, retrieval, recurring work, planning and progress review while preserving the compact working note.

## Tasks
- [x] 1. Reconcile the twelve review proposals with the user's feedback and existing functionality.
- [x] 2. Review PRODUCT.md, DESIGN.md, past UI refinements and recorded failures; capture regression gates.
- [x] 3. Define a concrete proposed scope and delivery order.
- [x] 4. Implement the desktop-first scope in [10-1](10-1-desktop-workflow.md), in sequential workflow slices.
- [x] 5. Verify desktop workflows and perform frontend/user-perspective review; evidence and acceptance limits are in [10-1](10-1-desktop-workflow.md).
- [x] 6. Android UI parity, second review, Mac installation and signed APK delivery in [10-2](10-2-review-install-and-android.md).

Optional synchronized schedule definitions and physical-device/user studies remain backlog work, outside the completed local delivery.

## Decisions

The 2026-10-30 feedback sets the following direction. The user subsequently requested sequential implementation and a frontend/user-perspective review. Desktop implementation is complete in [10-1](10-1-desktop-workflow.md); second review, Mac installation and matching Android APK delivery are complete in [10-2](10-2-review-install-and-android.md). The table records the agreed direction, with implementation decisions below and in the sub-plan.

| Original point | Revised scope |
|---|---|
| 1. Today priorities | Reuse task/subtask ordering and the existing next-step summary. Do not introduce a separate sequencing or priority system in this pass. |
| 2. Backlog review | Make existing unfinished work noticeable through the Earlier tasks disclosure, its count and a quiet attention cue. Opening it reveals actionable existing rows. Start with awareness, not a new inbox or compulsory daily dialog. |
| 3. Search | Search task and step text across dates, including done and stopped work. Show source date, parent context and state; selecting a result opens the original task. |
| 4. Goal linking | On hold. Keep current goals independent. |
| 5. Recurrence | Optional Daily / Weekdays / Weekly choices beside a routine; Manual remains the default. Show the next occurrence and offer Skip / Pause. See recurrence rules below. |
| 6. Smarter planning | Keep available time, estimates and exceptions together in Plan. Reuse prior preferences, offer quick duration choices and editable AI estimates on explicit generation, and expose unavailable periods inline. Avoid mandatory per-task setup or trips to Settings. Existing list order supplies the default preference order. |
| 7. Plan editing | Retain editing of generated subtasks after Apply. No separate timeline editor in this pass. Replanning must not silently discard user edits to previously generated steps. |
| 8. Date clarity | Use concise, consistent meanings for the list/work date and Due date. Move changes list placement; Due changes the deadline. Show the destination in the move affordance and keep the saved deadline visible. Avoid adding a second permanent date row to every task. |
| 9. Completion changes | Deferred. Preserve current checkbox, parent/step cascade and Outcome review behavior. |
| 10. Post-focus review | Offer an optional Review task action in the existing completion surface. Return to the original task and its existing steps/Outcome controls; allow an ordinary step to express the next action or blocker. Back to tasks and Another session remain available. |
| 11. Progress dashboard | Add an on-demand Progress page with day/week selection, completion summaries and the underlying task lists. Keep it separate from the default capture surface. Use the data definitions below rather than invented historical completion dates. |
| 12. Sync status | Prefer one small day/account status indicator with an accessible name and details on activation. Distinguish disabled/local-only, waiting, syncing, acknowledged and attention states. Do not recolor task text or imply per-task acknowledgement when sync tracks an entire date. |

### Recurrence direction and desktop scope

- Preserve existing manually reset routines unless the user opts into a schedule.
- Proposed behavior: scheduled routines create ordinary dated task occurrences; completing one does not complete or delete the routine definition.
- Use a stable routine-plus-occurrence identity so reopening or syncing two devices cannot create duplicate occurrences. Editing an occurrence affects that occurrence; editing the routine affects future occurrences.
- Proposed missed-date policy: surface the current due occurrence on return, without flooding Today with a task for every missed day. Existing unfinished occurrences remain visible through Earlier tasks.
- Desktop implementation uses the device local calendar, weekly anchoring on the configured weekday and device-local folder-scoped schedule definitions. Existing goal records remain unchanged; generated tasks use normal task sync. Detailed Pause/Skip/retry behavior is in 10-1. Cross-client schedule editing remains follow-on work.

### Progress data definitions

- Current task records have status and source/list date, but no completion timestamp. For historical data, label counts as completed tasks **on the selected day's list**, not tasks completed on that date.
- Count parent tasks separately from steps. Stopped work is separate from done; carried tasks are not counted again merely because they appear on Today.
- A true completion timeline requires future completion-event recording, including reopen/Undo behavior, without changing completion interactions. Do not backfill invented timestamps. Decide this explicitly in the dashboard implementation sub-plan.
- Focus records have completion timestamps but store planned duration. Label planned minutes honestly, and disclose retained-history limits; do not claim lifetime totals or actual focused time.
- Partial/unavailable archives must appear as incomplete coverage, not zero activity. Use the same canonical source dates as normal navigation.

## Proposed Delivery Order

1. Awareness and retrieval: Earlier tasks cue, Search, date wording and compact sync status.
2. Planning: remember useful defaults, inline duration/availability controls, preserve edited generated work.
3. Recurrence: implement occurrence semantics and safe persistence on desktop; keep generated tasks compatible with existing clients.
4. Reflection: post-focus task return and the Progress page with honest metrics.

## Design And Regression Gates

- The user is glancing at a small warm-paper note beside active work. Keep capture immediately writable, titles prominent and supporting controls quiet.
- Preserve 340×440 desktop, default and wide layouts; check phone at 360px and enlarged text. No idle rail squeeze, overlapping footer or growing permanent header.
- Keep direct desktop action icons and phone drag grips/icon actions. Preserve platform-specific action grouping; no restored global history checkbox, duplicate Edit command or Enter-to-add helper copy.
- Inline options and existing disclosures first. Progress/Search may use an intentional in-app page with Back; do not stack dialogs or make the dashboard the launch screen.
- Preserve stable Settings geometry, editor alignment and equal control spacing. Layout changes must not move pointer targets between press and release.
- Indicators need names/tooltips and keyboard/touch access. Color alone cannot carry meaning; sync success requires acknowledged current content, not merely a past successful run.
- Search/dashboard history loads must not block Today, capture or native reveal. Retain canonical archive ownership, unavailable-file notices, bounded rendering and stale-result cancellation.
- Keep explicit AI requests, editable suggestions, Apply/Discard/Undo, saved-setting clarity and error detail. Ordinary selection never calls AI.
- Preserve save retries, move destination-before-source ordering, concurrent edits, recovery copies and conflict review. Recurrence and summaries cannot bypass these protections.
- Native and physical-device acceptance remain distinct from synthetic browser/widget checks. Use fictional data for review; do not mutate the user's archive to demonstrate features.

## Evidence And Prior Fixes

- [4-44 UI refinement](4-44-ui-interaction-refinement.md): direct icons supersede the initial More-menu proposal; compact controls, removed helper copy, startup reveal and stable Settings.
- [4-41-2 Outcome/Due presentation](4-41-2-outcome-due-presentation.md): aligned metadata and deliberate selection/editing.
- [4-35 fast task loading](4-35-fast-task-loading.md) and [bugs](../bugs.md): do not reintroduce blocking archive scans, repeated sections or moving click targets.
- [7-3 concise phone copy](7-3-concise-mobile-copy.md) and [7-4 phone controls](7-4-phone-task-controls.md): retain minimal text, touch targets and visible-row reorder mapping.
- [8-7 conflict workspace](8-7-account-conflict-workspace.md): keep detailed recovery in Account, with both versions preserved.
- `src/taskHistory.ts` and `mobile/lib/state/sticky_store.dart`: applied plan blocks already become editable steps. Desktop replanning currently identifies replaceable unfinished blocks by generated ID, so manual edits require special care in the planning slice.
- `src/types.ts`, `mobile/lib/models/models.dart` and `src/cloudSync.ts`: task completion dates are absent and sync acknowledgement is per record/date, constraining truthful progress/status displays.
