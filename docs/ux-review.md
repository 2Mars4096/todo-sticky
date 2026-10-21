# UX Path Review

## 2026-10-21 — Separate-worktree Refinement

Implementation: `feat/ui-interaction-refinement`, based on `0168c6b`. Production-browser checks use synthetic native-bridge fixtures. This is an implementation review, not an installed-app acceptance result or a real-person usability study.

| Workflow | Implemented behavior | Observable check |
|---|---|---|
| First task | Capture is available immediately; setup stays optional | Fresh fixture opens without Settings and saves a task without an AI call |
| Compact note | Idle rail columns become named Goals / Focus entries | At 340×440, task list is 338px wide and starts at y=125; footer stays inside the window |
| Default and wide layouts | Panels open by intent; wide provider selector is bounded | 460×640 and 1000×760, including expanded side panels, have no footer overlap |
| Enlarged text | Header/date and footer wrap; task list keeps its own scroll area | 200% text fixture at 340×440 retains capture and footer without horizontal overflow |
| Task selection | Title/status lead; saved metadata is subordinate | Single-click selects; double-click / Enter edits; selected actions read Focus / Add step / More |
| Step entry and inspection | Selected tasks expose manual entry; groups show progress and next step | One click opens a step group; Enter adds; progress persists after reload |
| Outcome | Optional local draft; Suggest is explicit and marked unsaved | Selection and ordinary Tab produce no request/write; Use suggestion stages; Enter/blur commits; Escape cancels |
| Date and review | Dates stage Save / Cancel / Clear; unchanged Revise keeps readiness | Cancelled drafts leave saved dates/history and review state intact |
| Deletion | Persistent one-level Undo restores the affected tree | Original IDs, source date, metadata and position survive a committed deletion and unrelated edits |
| Save failure | Persistent error and Retry retain latest memory | Failed writes block date changes; Retry saves the latest captures |
| Day planning | Choose date/time/machines, preview chronological blocks, Apply or Discard | Generate/Discard cause no task writes; repeated Apply replaces old unfinished generated blocks; Undo restores the prior plan |
| Stale work | Captured task/date context must still match | Edited tasks and late responses invalidate proposals; delayed breakdown cannot undo task closure |
| Settings | Tasks & storage / AI assistance / Integrations / Updates | Advanced provider fields disclose on demand; loading failures do not expose editable empty defaults |
| Keyboard dialogs | Shared containment, Escape and opener restoration | Tab / Shift+Tab stay within Settings, Focus and day planning |
| Routines | Manual reminders have honest labels | Goals shows open counts and Routines; underlying storage remains compatible |
| Focus | Start focus / Pause / Resume / Finish session | A completed session is recorded without changing the task outcome; active compact timer remains visible |
| Graphics failure | SVG fallback keeps session controls usable; Try 3D again recovers | Normal shaders, forced construction/shader faults, real context loss, retry and cleanup pass |
| Reordering | Root order stays within its source date; steps stay within their parent | Real pointer and keyboard moves persist after reload; first-click disclosure targets are stable |

The measured minimum-window task list grows from 246×226px (y=164) to 338×271px (y=125). At 460×640 it is 458×471px. These are browser fixture measurements, not claims about every task density or platform font.

Native Rust/build tests, installed WebView/GPU behavior, physical IME and native drag/resize remain pending. A relevant person still needs to attempt capture → outcome → steps → focus → review using their own task; that observation is the remaining product validation, beyond automated correctness.

## Historical Review — 2026-08-10

The following records the earlier design and is superseded by the refinement above. It covered the frameless default window, the 340px minimum, the 460px default, and a 900px wide layout.

| Workflow | Previous path or issue | Current shortest path | Assessment |
|---|---|---|---|
| First useful action | Empty message in the center, task input at the bottom | Open app, type in the focused top composer, press Enter | Optimized |
| Launch placement | Fresh launch could remain hidden in the tray or use an incidental OS position | Open visibly at the top-right of the current display; preserve later user placement | Optimized |
| Window sizing | Thin native edge on a frameless transparent window | Drag any edge or corner; use the visible bottom-right grip | Optimized |
| Compact layout | Expanded side panel compressed the task list to roughly 140px | Rails start collapsed; an expanded rail overlays the list and dismisses by backdrop or Escape | Optimized |
| Complete task | Click status box | Click status box | Already optimal |
| Edit task | Click task text, edit, press Enter | Click task text, edit, press Enter | Already optimal |
| Add a step | Zero-height hover target was effectively unreachable | Click `+ Step`, type, press Enter | Fixed and optimized |
| AI breakdown | Click `✦`; failures were silent | Click `✦`; success updates steps and failure shows a visible settings prompt | Optimized within optional AI setup |
| Change AI provider | Open Settings, replace the active provider configuration, and lose the previous provider's fields | Choose a configured provider from the persistent action-bar selector; unconfigured choices open directly in Settings | Optimized with provider-specific profiles |
| Carry task forward | Click arrow; stale tasks moved only one stale day at a time | Click arrow; past work catches up to today, while current/future work advances one day; labels and feedback state the destination | Optimized |
| Date navigation | Previous/next or calendar; an empty past/future date looked like missing data | Previous/next, calendar, or one-click `Go to today` in both the header and date-aware empty state | Optimized |
| Day scope | `All` and `Today` competed with the date meaning of “Today” | `All` and `Day`, defaulting to the current day | Clearer default |
| Plan the day | Bottom `Schedule` action could run with no tasks and fail silently | `Plan day` is disabled until tasks exist and reports success or provider errors | Optimized |
| Long-term goals | Expand panel, type, click Add or use Command/Ctrl+Enter | Open Goals, type, press Enter | Optimized for a secondary workflow |
| Recurring anchors | Same as long-term goals | Open Goals, type recurring task, press Enter | Optimized for a secondary workflow |
| Start focus | Click task `Focus`, then launch in Tracking Station | Same two-action commitment path | Intentionally optimal; duration remains confirmable before launch |
| Open focus history/map | Cryptic collapsed `View` control | Click named `Map` control on the Focus rail | Clearer one-click entry |
| First-run setup | Provider form implied AI was required | `Start without AI`, or add a key and `Save & Start` | Optimized |

### Opportunities Recorded In August

- Task deletion is still immediate. A lightweight undo toast would improve recoverability without adding a confirmation step.
- Keep the direct task action strip from gaining more actions. At the minimum width it now moves below the task text; any future action should replace or group an existing action.

Both August opportunities are addressed in 4-44 through deletion Undo and the selected Focus / Add step / More action group.
