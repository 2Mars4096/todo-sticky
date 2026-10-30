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

`list` is an alias for `extract`. Responses also include `unavailableFiles` (empty for successful CLI extraction). The desktop Tauri range-extraction request can set `skipUnavailable: true` to return readable sections and report unreadable file paths; CLI/default extraction remains strict. Desktop range extraction also accepts `canonicalDates: true` to return the first section for each date from the same weekly file calendar navigation would choose. An unreadable canonical file is reported without substituting stale copies from other weeks. Today displays earlier unfinished tasks as projections, so agents must continue to mutate their original saved dates and IDs. A response contains raw tasks for each saved date, including nested `subtasks`:

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
  ],
  "unavailableFiles": []
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

### In-App LLM Commands

These commands belong to the interactive desktop app and are not part of the deterministic `sticky-todo-api` CLI:

- `llmBreakdown({ taskText, existingSubtasks })` → native `llm_breakdown`
- `llmSchedule({ tasks, machines, dateStr, availableStart, availableEnd })` → native `llm_schedule`
- `llmRecommendAlbums({ tasks })` → native `llm_recommend_albums`

Album requests contain only the visible date's task text, status, and current-day steps. The response uses `summary` plus an `albums` array whose entries contain `title`, `artist`, optional `year`, `fit`, and `bestFor`. `summary` describes the working atmosphere, `fit` explains audible qualities and listening suitability, and `bestFor` is a short listening-mood or energy cue. Selection uses inferred attention needs rather than keyword or topic matching. Results remain in frontend memory and are not written to the Markdown archive or app-state files.

#### Day-plan proposals

The frontend sends the selected date (`YYYY-MM-DD`), explicit same-day available times (`HH:MM`), the current aggregated tasks including stable IDs/finish metadata, and only the machines the user selected. `machines: []` means human-only work. For legacy native callers, omitted date/time values use local today and 09:00–17:00; omitted machines use configured machines, without inventing equipment. Invalid dates or non-positive time windows return an error.

The response is untrusted until `validateDayPlan` accepts it:

```json
{
  "plan": "Draft one example, then share it. Defer the optional appendix.",
  "schedule": [
    {
      "taskId": "task_123",
      "parentTask": "Prepare an example",
      "time": "13:00",
      "endTime": "13:30",
      "action": "Write and send one runnable example",
      "assignedTo": "human"
    }
  ]
}
```

Blocks must identify an open input task, stay inside the requested window, use human or a selected machine, and not overlap for one assignee. The frontend sorts accepted blocks chronologically. Exact task IDs take precedence; legacy title-only results are accepted only when the title identifies exactly one open task. Unknown/ambiguous targets and invalid blocks reject the whole proposal before any write.

Generation does not mutate Markdown. Apply checks that the selected date, tasks and planning details still match the captured context. New generated blocks use `plan_<date>_<batch>_<sequence>_h<original-text-hash>` IDs through existing Markdown ID comments. Replanning replaces only unchanged todo suggestions for that date with a matching hash and no added metadata/nested work. Edited, started, legacy, manual, completed/stopped and other-date steps remain. Discard makes no change; the desktop's one-level Undo reverses application without reverting later independent edits. This does not add CLI Undo or change task API schemas.

### Codex Background Provider

The `codex` provider routes the same in-app LLM commands through `codex exec` instead of an HTTP API. It uses the existing local `codex login` authentication, so `apiKey` remains empty; `apiBase` stores `codex` or an explicit executable path, while `model` is optional.

Each request is non-interactive and ephemeral. The native adapter creates an empty temporary working directory, disables approvals, applies the read-only sandbox, ignores user configuration and execution rules, closes stdin, omits web search, enforces a three-minute timeout, captures only the final stdout response, and removes the temporary directory. `Test Connection` calls `codex login status` without spending a model request.

## Skill Wrapper Guidance

A reusable skill only needs a concise `SKILL.md` plus a deterministic script or command template that points to this repository or the release binary. Instruct the skill to:

- extract before any mutation;
- identify tasks by returned ID, never by fuzzy text alone;
- always pass `expectedRevision` for edit and delete;
- show the intended target before destructive deletion when the user's request is ambiguous;
- re-extract and ask for direction on a stale revision when the correct target is no longer clear.

### App Updates

Settings uses the official Tauri updater `check`, `download`, and `install` operations plus process `relaunch`. These are desktop-only operations, separate from the task CLI. `useTasks.flushPendingSave()` and `waitForPendingWrites()` must complete before install/relaunch. Updater metadata and signatures come from the public release endpoint; no GitHub token is sent by the app.

## Diane credential fallback

- `AppSettings.preferDianeCredentials` is optional for callers and defaults to `true` when absent. Set `false` to use Todo's own configured key exclusively.
- `get_settings` adds `dianeProviders`, a transient array of provider IDs with a discoverable matching Diane key. It never returns Diane key values; this array is not persisted.
- Native `diane_credential_status({ provider, endpoint })` returns a boolean for the exact provider/standard-endpoint pair. It performs no writes and does not need Diane running.
- `test_connection` accepts optional `preferDianeCredentials` (default true), matching normal native LLM calls. When enabled, a matching file-backed Diane key takes precedence over Todo's submitted/saved key; missing/unreadable sources fall back to Todo. API authentication failures do not trigger a second-account retry.
- This preference does not change task API schemas, model choices, environment files or Keychain.

## Diane dispatch contract

Native command: `diane_request({action, requestId?, body?})`. Actions are `projects`, `dispatch`, `status`, `stop`, `open`; all target local Diane's `/api/sticky-todo` on port 45173. Dispatch body: `{request_id: UUID, task_key, text, parent, steps: string[], project_id}`. Persist the UUID and exact body before sending; retries must reuse both. Responses carry `session_id`, `workflow_id`, `run_id`, `project_name`, `status`, `summary`, `artifacts`, `updated_at`, and `stopping`.

Never treat network failure as run failure, Stop submission as stop completion, or a completed agent run as a completed todo. Open uses the linked desktop session. Approvals, clarification, and further work belong in Diane.

## Finish metadata and stopped tasks

Task extraction may include optional `finish`: `{ "doneWhen": "A colleague can create a task", "by": "2026-10-23", "originalBy": "2026-10-23", "deadlineChanges": [], "reviewReady": false }`. Deadline changes contain `from`/`to` dates (nullable) and ISO `at` timestamps. Existing text/status updates preserve metadata; the CLI does not yet edit finish fields. `stopped` is an accepted status and is intentionally not completion.

Desktop `push_task` accepts optional `taskSnapshot` and `parentSnapshot` Task objects in addition to its existing text arguments; snapshots preserve metadata and nested state. Moving a task does not modify `finish.by`. Promise review is a desktop interaction; agents must not infer outcome completion from finished steps alone.

Desktop `llm_breakdown` accepts optional `suggestFinish: true` to return `{ "finishSuggestion": "One short observable outcome", "subtasks": [] }` instead of steps. The UI treats it as unaccepted placeholder text until Tab acceptance; default breakdown behavior is unchanged.

Internal desktop command `frontend_ready` accepts no arguments and acknowledges the committed shell for one-time window reveal; it does not read or mutate task data and is not a task API operation.

## Optional cloud service

The account-sync service and its versioned protocol are documented in [account-sync.md](account-sync.md). `GET /v1/health` is the public deployment health check; user-data endpoints require Firebase authentication. Local task API usage remains independent of the service.

The browser sign-in fragment accepts optional `returnTo=app` from updated Android/macOS clients. This enables the fixed token-free `todo-sticky://account-return` wakeup after confirmation; it is not an authentication API and never accepts tokens or arbitrary return URLs. Proof-bound `/v1/auth/exchange` remains required.

The hosted page now sends `/v1/auth/complete` immediately after the explicitly initiated Google account chooser succeeds; it does not require a second confirmation click. A fresh sign-in fragment in an existing tab resets the page to avoid using an older request. The identity/proof requirements and app-side sync opt-in are unchanged.

Cloud date records retain legacy blank checklist titles as strings; task size/type/status/tree constraints still apply. Conflict resolution is based on the exact reviewed local payload and cloud revision/payload, not only the date key. Both original versions are saved locally before applying a choice.


Desktop planning may attach `planning: { preferenceOrder, maximumMinutes, unavailable: [{ start, end }] }` to each task in the `llmSchedule` request. `maximumMinutes: null` permits an AI estimate; explicit budgets bound the total scheduled time for that task. Unavailable periods are excluded for all assignees. These are proposal inputs, not new persisted Task/CLI fields. Generation and application remain separate, with stale-context and Undo protections.


Android uses the same `_h<original-text-hash>` replacement policy for generated plan steps received through sync. Its AI request carries `planning.estimates` keyed by `sourceDate/taskId` and `planning.unavailable` periods; validation enforces the same budgets and exclusions. Device-local routine schedules are not callable task-API or cloud records; their generated tasks use ordinary stable IDs and existing CRUD/sync contracts.
