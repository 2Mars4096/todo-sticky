# UX Path Review

Reviewed on 2026-08-10 against the frameless default window, the 340px minimum, the 460px default, and a 900px wide layout.

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
| Date navigation | Previous/next or calendar | Previous/next, calendar, or one-click `Go to today` when away from today | Optimized |
| Day scope | `All` and `Today` competed with the date meaning of “Today” | `All` and `Day`, defaulting to the current day | Clearer default |
| Plan the day | Bottom `Schedule` action could run with no tasks and fail silently | `Plan day` is disabled until tasks exist and reports success or provider errors | Optimized |
| Long-term goals | Expand panel, type, click Add or use Command/Ctrl+Enter | Open Goals, type, press Enter | Optimized for a secondary workflow |
| Recurring anchors | Same as long-term goals | Open Goals, type recurring task, press Enter | Optimized for a secondary workflow |
| Start focus | Click task `Focus`, then launch in Tracking Station | Same two-action commitment path | Intentionally optimal; duration remains confirmable before launch |
| Open focus history/map | Cryptic collapsed `View` control | Click named `Map` control on the Focus rail | Clearer one-click entry |
| First-run setup | Provider form implied AI was required | `Start without AI`, or add a key and `Save & Start` | Optimized |

## Remaining Opportunity

- Task deletion is still immediate. A lightweight undo toast would improve recoverability without adding a confirmation step.
- Keep the direct task action strip from gaining more actions. At the minimum width it now moves below the task text; any future action should replace or group an existing action.
