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

## 4-10-1: Local application MCP access

- [x] Isolate implementation on `feat/task-mcp`; preserve the dirty main checkout.
- [x] Expose existing native task CRUD via bounded stdio MCP with read-only mode.
- [x] Require revision preconditions for MCP edits/deletes and creation in existing archives.
- [x] Document client configuration, meeting-summary workflow and local/concurrency limits.
- [x] Verify native regressions and real CLI/MCP process interoperability on disposable data: 45 Rust tests and `tests/mcp-smoke.py` pass; native debug CLI builds.

Decisions: reuse the native CLI binary and Markdown task API without new dependencies or a second store. Target initialize-based MCP 2025-11-25. This slice exposes task text/status/steps only; project/focus/UI-only commands and remote hosting remain outside scope. No install, release or personal-data mutation.

- [x] Merge into `main` at user request, retain newer main work and remove the feature branch/worktree after verification.
