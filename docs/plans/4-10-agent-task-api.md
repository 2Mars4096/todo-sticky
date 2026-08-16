# 4-10: Agent Task API

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make task reading and safe CRUD available to reusable agent skills without UI automation.

## Tasks

- [x] 1. Add a shared native task API for date extraction and nested task creation, editing, and deletion.
- [x] 2. Give parsed tasks deterministic fallback IDs and persist IDs as Markdown metadata on mutation.
- [x] 3. Expose the API through Tauri commands and a JSON CLI with knowledge-base path discovery.
- [x] 4. Add optional revision preconditions so agent edits fail cleanly when archive content changed.
- [x] 5. Document the callable contract and reusable-skill workflow.
- [x] 6. Verify the native lifecycle, CLI extraction, and frontend build.

## Decisions

- Keep Markdown under `content/to-do/` as the source of truth; the API is an operation layer, not another database.
- Use a local JSON CLI as the cross-session surface because it works without launching or automating the desktop window.
- Default extraction to local today; require `--all` for a complete archive read.
- Return and accept file revisions so skills can use extract-before-mutate optimistic concurrency.
- Persist task IDs in trailing `sticky-todo:id` HTML comments, which remain invisible in rendered Markdown.

## Notes

- CLI aliases support `input` for `create`, `list` for `extract`, and `update` for `edit`.
- The detailed contract and examples live in [llm-api-guide.md](../llm-api-guide.md).
