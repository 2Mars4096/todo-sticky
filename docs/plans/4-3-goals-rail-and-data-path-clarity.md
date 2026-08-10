# 4-3: Goals Rail And Data-Path Clarity

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Keep the collapsed Goals metrics aligned and make an empty non-current date clearly distinguishable from missing stored data.

## Tasks

- [x] 1. Verify the active knowledge-base path and existing task/Goals stores without modifying user data.
- [x] 2. Fit the `REPEAT` label cleanly inside the collapsed Goals metric.
- [x] 3. Give empty past/future dates a direct path back to today's tasks.
- [x] 4. Add a native parser regression check for a multi-date file with current-day tasks and subtasks.
- [x] 5. Run frontend/native verification and update tracking documentation.

## Decisions

- Keep `REPEAT` as the visible label; solve the fit with metric width and restrained tracking rather than abbreviating it.
- Preserve the existing working-note empty state for today, but use date-aware copy and a `Go to today` action when viewing another empty date.
- Do not move, rewrite, or restore task data during diagnosis because the markdown archive is intact.

## Notes

- The active default store is `/Users/lizhi/Documents/Sticky Todo/content/to-do`.
- Its existing markdown file contains five top-level tasks and five subtasks for `2026-08-10`.
- Both known WebKit Goals payloads contain zero long-term and zero repeat items.
- The screenshot's `Go to today` action confirms that the empty view was on a non-current date; no task-data repair was required.
- Verification: `npm run build:frontend` and `cargo test --manifest-path src-tauri/Cargo.toml` (10 passing tests).
