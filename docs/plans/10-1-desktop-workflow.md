# 10-1: Desktop Workflow Implementation

**Parent:** [10-user-workflow-improvements](10-user-workflow-improvements.md)
**Status:** completed
**Goal:** Deliver the approved workflow improvements in the desktop source, preserving the small working note and existing task interactions.

## Tasks
- [x] 1. Awareness/retrieval: Earlier tasks cue, original-date Search, concise date semantics and compact sync indicator.
- [x] 2. Planning: remembered window/machines, inline time budgets and breaks, validation and edited-step protection.
- [x] 3. Recurrence: Manual/Daily/Weekdays/Weekly, next occurrence, Pause/Resume/Skip, stable task identity and durable-save acknowledgement.
- [x] 4. Reflection: optional post-focus task review and day/week Progress with separate task/step/session counts.
- [x] 5. Review frontend hierarchy/accessibility and walk through everyday user workflows; fix identified friction.
- [x] 6. Verify TypeScript, production build, Node/native regressions and isolated browser workflows; document behavior and limits.

## Decisions
- Implement desktop first, as announced; Android UI and installed packages are unchanged. No backend deployment or task-data migration is needed.
- Preserve task/subtask sequencing, direct action icons, completion semantics and independent goals. No separate priority system or plan editor.
- Routines use device-local, folder-scoped schedules linked to existing goal IDs. Generated ordinary tasks can sync through the existing account flow. Schedule definitions do not sync; this avoids older phone clients dropping new goal fields. Cross-client schedule editing is follow-on work, not implied parity.
- The desktop's local calendar determines occurrences. Generate only for a fully loaded Today; resume/midnight follows the existing live calendar. Missing days do not create a backlog flood. Weekly uses the weekday when configured. Pause leaves existing tasks intact; Skip next advances only the next ungenerated occurrence. Changing cadence cancels a future skip while retaining today's handled marker.
- Persist a handled marker only after task writes succeed. Retry reuses the stable occurrence ID; corrupt/unreadable schedule data is never silently replaced. Manual selection retains the handled marker, preventing same-day recreation after moving/completing work.
- New plan IDs include an original-text fingerprint. Replanning replaces only untouched todo suggestions for that date. Edited, started, nested, metadata-bearing and legacy generated steps remain; legacy IDs lack evidence to identify original text safely. Undo remains independent of later edits.
- Progress groups current task states by list date. It does not infer completion timestamps. Parent tasks and steps are separate; stopped work is separate from completed work. Focus totals use retained sessions and planned minutes.
- Search/Progress share only in-flight canonical archive reads, report unavailable coverage, bound native waits and render 40 results at a time. They do not mount or fetch on normal startup.
- Sync indicates current acknowledged editor content, not merely the existence of a previous successful run. Edits during/after upload clear the acknowledgement; detailed status and recovery remain in Account.

## UI/UX Review
- Frontend pass: retain the warm note, flat lists, named existing actions and 30px minimum footer targets. At 340×440, production footer stays on one row under normal text and the task viewport measures 338×299px. At enlarged text it wraps without overlaps.
- User pass: Search focuses immediately and opens the original task/step; new plan results scroll into view; a scheduled routine creates one visible task; focus review does not complete the task; history failures do not prevent capture.
- Fixed during review: proposal hidden below expanded planning inputs, duplicate routine pause affordance, raw internal status labels in results, invalid progress-date fallback, and a narrow footer orphaning Settings.
- Supporting snapshots: `output/playwright/workflow-final/` (ignored, fictional data). No actual user task was edited for testing.

## Verification
- TypeScript and Vite production build pass. Existing large-chunk advisory remains; no new dependency was added.
- All 19 Node suites and 36 Rust tests pass, including new archive/recurrence/constraint cases and sync acknowledgement tests.
- Production Chrome checks pass for new workflows, refined shell, task interactions and Focus. Include 340×440, 460×640, 1000×760, 200% text, keyboard/dialog access, save Retry/Undo, stale plans, routine reload/Skip/retry, and graphics fallback.
- Synthetic provider responses validate the UI contract. Live provider behavior, installed WebView/physical-device acceptance and a real-person usability study are not claimed.
