# Todo module

Host import: `import TodoPort from './portedTodo'`.

The default component takes the existing plugin `active` and optional `context` props. It consumes `PluginInputContext` for explicit discussion drafts and `PluginHostContext.selection` for exact task navigation. `WorkflowReview` owns canonical Diane dispatch/results. There is no independent agent loop or account database.

Frontend source is copied/adapted from Todo Sticky `909afeb94e0d8fdeccf04792fabb184482a1f60f`. `SOURCE.json` records pre-adaptation hashes; `LICENSE.todo-sticky` retains the original license. Focus, Star Map and focus-progress totals are deliberately excluded.

`api.ts` adapts original Tauri commands to `POST /api/plugins/todo/compat/{command}`. `createTodoApi(scope)` captures the account; old asynchronous operations reject after account changes. Day saves use a whole-day revision fingerprint and durable request receipt. Original task objects remain the frontend contract; canonical flat task records remain server authority.

Goal drafts and project partial-write journals are separately scoped local recovery records. Actual tasks/goals/routines and planning settings persist through Diane's plugin repository. Full backup includes canonical records, planning settings, and retained unfinished project operations; restoration never executes agent work.

Agent calls use the injected provider boundary, which the host must route through Universal Cell. Provider choices, accounts and app updates belong to Diane. `diane:plugin-settings` with `{section:'ai'}` asks the host to reveal those settings.

Keep imported styles scoped under `.diane-todo-port`. Narrow layouts use `@container todo-port`; do not restore global source reset rules or viewport-sized app shells.
