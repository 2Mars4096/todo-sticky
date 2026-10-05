# 4-20: Visible Step Input And Tray Shortcuts

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make manual step capture immediately available and expose tray keyboard shortcuts.

## Tasks
- [x] 1. Keep a bordered, labeled step field visible under every editable parent task.
- [x] 2. Support Enter and plus-button submission, continued entry, and Escape cancellation.
- [x] 3. Show the platform global toggle shortcut and add a native Quit accelerator.
- [x] 4. Verify frontend build, native check, and diff hygiene; update tracking and usage docs.

- [x] 5. Remove the lighter step-field fill so the existing paper background shows through its thin border.

## Decisions
- Preserve the compact plus-button alignment; use the existing paper colors and a visible focus ring.
- Do not autofocus every task field. Clicking plus focuses the field and submits any nonblank draft.
- Escape clears the step draft and blurs the field; blur alone preserves drafts.
- Display the existing global Toggle / Hide shortcut as menu text, avoiding a duplicate accelerator handler. Quit uses CmdOrCtrl+Q.

## Notes
- `npm run build:frontend`, offline `cargo check`, and `git diff --check` pass.
- Isolated browser checks at 340px and 460px verify visible step entry, Enter submission, and Escape cancellation. Native menu appearance and live desktop interactions have not been visually verified. Published in v2.1.1; the installed app can update through Settings.

- Follow-up after 2.1.1: step inputs now have transparent backgrounds, preserving the underlying paper shading. Frontend build and diff checks pass; this styling follow-up is not yet released.
