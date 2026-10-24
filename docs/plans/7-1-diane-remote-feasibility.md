# 7-1: Dear Diane Remote Companion Feasibility

**Parent:** [7-flutter-android](7-flutter-android.md)
**Status:** completed
**Goal:** Determine whether the existing Todo companion workflow can safely operate from a phone against Dear Diane's authenticated remote API.

## Tasks

- [x] Inspect Todo's native companion transport, receipt semantics and current task UI.
- [x] Inspect Dear Diane's companion access guard, remote authentication and generic agent-run/mobile APIs.
- [x] Record the exact protocol blocker and retain the existing prompt-copy path.
- [x] Correct the feature matrix without implying that a relay deployment alone would solve the restriction.

## Findings

The inspected Dear Diane revision is [`2581669e8c8e07670db8fede7eb770a245fc6eef`](https://github.com/2Mars4096/dear-diane/tree/2581669e8c8e07670db8fede7eb770a245fc6eef). Its [`src/diane/server/routers/sticky_todo.py`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/src/diane/server/routers/sticky_todo.py) declares `APIRouter(prefix="/api/sticky-todo", dependencies=[Depends(local_only)])`. The guard checks the request client host, URL hostname and optional Origin. A real remote HTTPS hostname receives HTTP 403, including when the remote middleware has already accepted a bearer key. [`src/diane/remote/access.py`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/src/diane/remote/access.py) authenticates remote requests but does not remove router dependencies.

Todo's [`src-tauri/src/diane.rs`](../../src-tauri/src/diane.rs) sends its projects/dispatch/status/stop/open operations to the fixed local address `http://127.0.0.1:45173/api/sticky-todo`. [`src/diane.ts`](../../src/diane.ts) and [`src/components/DianeAction.tsx`](../../src/components/DianeAction.tsx) preserve the source task identity, immutable dispatch UUID and snapshot. The companion backend uses Diane's selected project and published execution defaults and owns its durable request receipt. Reconnecting does not start a second execution.

The current simplified desktop task row in [`src/components/TaskItem.tsx`](../../src/components/TaskItem.tsx) does not render `DianeAction`; the [desktop README](../../README.md#run-in-diane-companion-update-required) explicitly records this UI omission while retaining integration settings and saved links.

Dear Diane's [`src/diane/server/routers/chat_v2.py`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/src/diane/server/routers/chat_v2.py) and its [`mobile/lib/main.dart`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/mobile/lib/main.dart) demonstrate remotely usable generic agent-run endpoints. Those endpoints require their own project/session/execution inputs and do not expose the companion's published defaults or dispatch receipts. Replacing the companion path with a generic run would change its behavior and requires a separately specified durable client workflow.

## Decision and remaining work

Preserve Android's Copy agent prompt. Do not add nonfunctional server/token fields, bypass `local_only`, substitute an agent profile or change Dear Diane in this task. Existing offline and independently configured AI operations remain unaffected. The limitation is a real companion protocol gap, rather than a lack of general remote HTTP connectivity.

To enable matching live phone handoff, Dear Diane needs an explicitly authenticated remote companion surface with safe project/default discovery, idempotent dispatch/recovery, status and acknowledged stop, plus browser session navigation for decisions and follow-up. The corresponding Android client can then store its bearer token securely and keep transport receipts local. That backend/client work remains unimplemented; no deployment, credential configuration or live agent dispatch was performed.

## Verification

The protocol review changes documentation only; no Diane client/server behavior is added. The same publication applies the standard Dart formatter to the existing phone source and tests without changing behavior. `git diff --check`, the exact formatting gate, Flutter analysis and all 22 normal tests pass; the standalone review APK is rebuilt from that final formatted source. No runtime remote connectivity or authenticated model execution is claimed.
