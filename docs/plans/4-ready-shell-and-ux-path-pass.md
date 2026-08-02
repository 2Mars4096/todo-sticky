# 4: Ready Shell And UX Path Pass

**Status:** completed
**Goal:** Make the default Sticky Todo window immediately usable, easy to resize, and structurally optimized for the shortest path through core task, goal, planning, and focus workflows.

## Tasks

- [x] 1. Normalize the default and migrated app layout around collapsed progressive side rails and a usable center task column.
- [x] 2. Add clear frameless-window resize affordances and responsive panel behavior for compact and expanded sizes.
- [x] 3. Move task capture into the primary visual path and replace the passive empty state with an actionable first-use state.
- [x] 4. Repair hidden task actions, especially adding a subtask, and improve keyboard and accessible labels.
- [x] 5. Review the shortest path through date navigation, goals, recurring anchors, AI breakdown, scheduling, and Star Focus.
- [x] 6. Verify frontend builds and visually inspect compact and wide layouts.
- [x] 7. Update repository tracking and user-facing documentation.

## Decisions

- Keep the existing warm sticky-note identity and reserve the cinematic dark surface for intentional Star Focus entry.
- Compact window widths use overlay side panels so expanding a tool never crushes the task list.
- The frameless shell needs explicit resize hit zones because native resize edges are too difficult to discover and grab.
- Keep direct task actions available; at the minimum width, move them below the task text instead of hiding them in a new menu.
- Keep Star Focus launch as a deliberate two-action path so users can confirm session duration before the timer starts.

## Notes

- The user-provided baseline screenshot shows the center column compressed to roughly 140px by an expanded goals panel at the 380px native default width.
- The native default is now `460x640`, with a `340x440` minimum and a 760px compact-layout breakpoint.
- Visual checks covered empty and populated states at `340x440`, `460x640`, and `900x700`.
- Verification: `npm run build:frontend`; `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- Detailed path findings live in [ux-review](../ux-review.md).
