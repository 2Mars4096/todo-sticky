# Sticky Todo Agent API

Use the local `sticky-todo-api` command to read and mutate the same Markdown archive as the desktop app. The API does not call an LLM and does not require the app window to be open.

## Entry Point

From the repository:

```bash
npm run task-api -- COMMAND OPTIONS
```

For a standalone binary:

```bash
cargo build --release --manifest-path src-tauri/Cargo.toml --bin sticky-todo-api
src-tauri/target/release/sticky-todo-api COMMAND OPTIONS
```

The knowledge-base root resolves in this order:

1. `--kb-path PATH`
2. `STICKY_TODO_KB_PATH`
3. Sticky Todo's saved `kbPath`
4. `~/Documents/Sticky Todo`

All successes are JSON on stdout. Errors are JSON on stderr with a nonzero exit code.

## Safe Agent Workflow

1. Extract the target date.
2. Select the exact task `id` from the response.
3. Pass that date's `revision` to `--expected-revision` on every edit or delete.
4. If the revision is stale, extract again and reassess the requested change. Do not retry blindly.

The revision covers the weekly Markdown file, so a change to any date in that file invalidates the earlier revision. Legacy tasks receive deterministic IDs when read. The first mutation of their date section persists those IDs in trailing `<!-- sticky-todo:id=... -->` comments.

## Extract

With no selector, extraction defaults to the current local date.

```bash
npm run task-api -- extract
npm run task-api -- extract --date 2026-08-16
npm run task-api -- extract --from 2026-08-10 --to 2026-08-16
npm run task-api -- extract --all
```

`list` is an alias for `extract`. A response contains raw tasks for each saved date, including nested `subtasks`:

```json
{
  "dates": [
    {
      "date": "2026-08-16",
      "tasks": [
        {
          "id": "task_1786867200000_0",
          "text": "Review notes",
          "status": "todo",
          "subtasks": []
        }
      ],
      "filePath": "/path/to/content/to-do/2026-08-10/index.md",
      "weekStart": "2026-08-10",
      "revision": "fnv1a64:0123456789abcdef"
    }
  ]
}
```

An unsaved date inside an existing weekly file returns an empty task list with that file's revision. If no task archive exists yet, it returns `{"dates":[]}`.

## Create or Input

Create a root task:

```bash
npm run task-api -- create --date 2026-08-16 --text "Review notes" --status todo
```

Create a task with initial steps by repeating `--subtask`:

```bash
npm run task-api -- create --date 2026-08-16 --text "Review notes" \
  --subtask "Mark key claims" --subtask "Write synthesis"
```

Create a nested task under an existing task:

```bash
npm run task-api -- create --date 2026-08-16 --parent-id TASK_ID --text "New step" \
  --expected-revision REVISION
```

`input` is an alias for `create`. New items default to `todo`. Supported statuses are `todo`, `done`, `partial`, and `question`.

## Edit

Change text, status, or both:

```bash
npm run task-api -- edit --date 2026-08-16 --id TASK_ID --text "Revised text" \
  --status partial --expected-revision REVISION
```

`update` is an alias for `edit`. IDs address root tasks and nested subtasks.

## Delete

```bash
npm run task-api -- delete --date 2026-08-16 --id TASK_ID \
  --expected-revision REVISION
```

Deleting a parent also deletes its nested subtasks. The success response returns the removed task tree, but the API does not provide undo.

## Mutation Response

Create, edit, and delete return the affected task plus the new revision:

```json
{
  "ok": true,
  "date": "2026-08-16",
  "task": {
    "id": "task_1786867200000_0",
    "text": "Review notes",
    "status": "done",
    "subtasks": []
  },
  "filePath": "/path/to/content/to-do/2026-08-10/index.md",
  "weekStart": "2026-08-10",
  "revision": "fnv1a64:fedcba9876543210"
}
```

Use the returned revision for the next mutation in the same weekly file.

## Tauri Bridge

The frontend bridge in `src/api.ts` exposes the same operations:

- `extractTaskApi(request)` → native `task_api_extract`
- `createTaskApi(request)` → native `task_api_create`
- `updateTaskApi(request)` → native `task_api_update`
- `deleteTaskApi(request)` → native `task_api_delete`

Tauri requests use camelCase fields: `fromDate`, `toDate`, `parentId`, and `expectedRevision`.

## Skill Wrapper Guidance

A reusable skill only needs a concise `SKILL.md` plus a deterministic script or command template that points to this repository or the release binary. Instruct the skill to:

- extract before any mutation;
- identify tasks by returned ID, never by fuzzy text alone;
- always pass `expectedRevision` for edit and delete;
- show the intended target before destructive deletion when the user's request is ambiguous;
- re-extract and ask for direction on a stale revision when the correct target is no longer clear.
