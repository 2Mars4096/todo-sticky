# 4-11: Task Step Action Clarity

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make manual step entry and AI task breakdown immediately distinguishable in compact task rows.

## Tasks

- [x] 1. Confirm the icon-only AI action is ambiguous beside the manual `+ Step` control.
- [x] 2. Give manual step entry and AI breakdown distinct plus and branching-hierarchy icons.
- [x] 3. Preserve accessible names, tooltips, and compact action-row behavior.
- [x] 4. Build the frontend and update repository tracking.

## Decisions

- Use a plain plus for direct manual step entry and a branching hierarchy for splitting a task into generated steps.
- Keep both actions icon-only at rest; expose their full labels through hover text and accessible names.
- Use a quiet violet tint only as secondary reinforcement for the AI action; icon shape carries the primary distinction.

## Notes

- The user-provided compact screenshot showed that the sparkle did not communicate task decomposition clearly enough beside the manual step action.
