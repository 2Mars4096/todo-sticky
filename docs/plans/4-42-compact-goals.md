# 4-42: Compact Goals

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make long-term and recurring goals use the same compact inline interaction as daily tasks.

## Tasks
- [x] Replace large composer boxes and Add buttons with one-line entries and a focus-only Enter hint.
- [x] Simplify section labels/empty states and use flat rows, square checkboxes, and consistent delete icons.
- [x] Support keyboard title editing, composition-safe Enter, Escape cancellation, and preserve existing goal storage.
- [x] Verify add/edit/cancel/complete/delete/reload in an isolated 350px browser fixture; inspect empty/filled screenshots.

## Decisions
- Keep Long-term and Recurring separate; no new planning fields or scheduling behavior.
- Empty edits preserve the existing goal; deletion remains an explicit action.
- Included with the Outcome editor edge refinement in v2.1.11.
