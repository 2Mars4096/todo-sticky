# Todo plugin for Diane

This directory owns the embedded Todo interface and its compatibility backend. Diane consumes a versioned package and supplies account, record, project and execution services through `@diane/plugin-sdk/*`. The standalone React 18/Tauri app and phone client keep their existing build and data paths; the plugin has its own React 19 development environment.

0.1.4: Footer controls are direct peers (Import & backup, Scheduling machines, AI settings). Machine saves require changed drafts. Active Todo quietly requests scoped preparation after saved task changes and every60s; the host owns preparation/results and explicit Send execution.

## Module contract

Host import: `import TodoPort from '@diane-app/todo-plugin'`.

The default component takes the existing plugin `active` and optional `context` props. It consumes `PluginInputContext` for explicit discussion drafts and `PluginHostContext.selection` for exact task navigation. `TaskExecution` presents canonical Diane dispatch/results through the existing host APIs. There is no independent agent loop or account database.

Frontend source is copied/adapted from Todo Sticky `909afeb94e0d8fdeccf04792fabb184482a1f60f`. `src/SOURCE.json` records pre-adaptation hashes; `src/LICENSE.todo-sticky` retains the original license. Focus, Star Map and focus-progress totals are deliberately excluded.

`api.ts` adapts original Tauri commands to `POST /api/plugins/todo/compat/{command}`. `createTodoApi(scope)` captures the account; old asynchronous operations reject after account changes. Day saves use a whole-day revision fingerprint and durable request receipt. Original task objects remain the frontend contract; canonical flat task records remain server authority.

Goal drafts and project partial-write journals are separately scoped local recovery records. Actual tasks/goals/routines and planning settings persist through Diane's plugin repository. Full backup includes canonical records, planning settings, and retained unfinished project operations; restoration never executes agent work.

Agent calls use the injected provider boundary, which the host must route through Universal Cell. Provider choices, accounts and app updates belong to Diane. `diane:plugin-settings` with `{section:'ai'}` asks the host to reveal those settings.

Keep imported styles scoped under `.diane-todo-port`. Narrow layouts use `@container todo-port`; do not restore global source reset rules or viewport-sized app shells.

## Task execution

The selected task uses one compact project/action row. **Run** explicitly starts work and keeps Todo open. **Open** returns to the saved Diane session. **Review** presents the versioned result with **Accept & complete**, **Request changes**, and **Discard result**. Discard closes that result and keeps the current task unchanged. **Run again** is directly visible after a failed or stopped run. Session links remain available for completed tasks and previous attempts returned by the host.

When the host reports that the task or its steps changed after dispatch, Review explains the mismatch and keeps Discard result available. Accept and Request changes remain blocked until a result for the current scope is available. Discard uses the exact displayed result version; a newer result requires **Review latest** before it can be discarded or accepted. UI 0.1.8 shows Discard only when the host advertises `can_discard_result: true`; older hosts show an update explanation, so their task-stop operation is never invoked under a misleading label.

Automatic preparation is separate from execution. A manual project correction wins over a late suggestion and remains account/task scoped. The current host stores that correction on this device; a shared cross-device binding and a complete paginated execution history need a host API extension. Ordinary task editing and completion do not depend on these controls.

There is no Merge button in this release. The current host does not isolate the whole Todo run or expose a reviewed Git-merge receipt. **Accept & complete** accepts a result and completes the task; it does not merge code. Runtime permissions and interactive agent approvals remain in Diane.

## Development

Use Node 22 or later. From the repository root:

```bash
npm --prefix plugin ci
npm --prefix plugin run check
```

The combined gate checks strict source types, behavior tests, the production bundle, a render of the generated module without a global React object, declared external imports, and package contents. It uses a test-only SDK adapter; host runtime implementations are never bundled into the plugin.

An existing Diane checkout can verify the actual SDK exports:

```bash
npm --prefix plugin run check:host -- /path/to/dear-diane/editor
```

After checks pass, build the UI archive from `plugin/` with `npm pack --ignore-scripts`. Update Diane's pinned archive, lockfile and release checksum receipt in a separate integration commit. A package build is not an installed-app or live-backend acceptance result.

## Source recovery

The published repository did not contain the `plugin/` directory referenced by Diane's releases. The initial UI source was recovered from the verified `@diane-app/todo-plugin@0.1.6` archive and the backend modules from `diane-todo-plugin@0.1.4`. Their recorded producer commits were unavailable on GitHub. `RECOVERY.json` retains the exact artifact checksums and member hashes; it is a historical baseline, not a claim that edited files still have those hashes. `src/SOURCE.json` retains the earlier port's source attribution, with the original machine-local path removed.

The original MIT notice remains in `src/LICENSE.todo-sticky`. See `backend/README.md` for the unchanged compatibility modules and their independent wheel build. Source recovery does not recreate the unavailable producer Git history or deploy either application.
