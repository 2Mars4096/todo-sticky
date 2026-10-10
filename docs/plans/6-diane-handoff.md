# 6: Diane Task Handoff

**Status:** in-progress
**Goal:** Dispatch a todo once into Diane's existing project/session structure and keep follow-up in that session.

## Tasks
- [x] Inspect both products and isolate work in separate Git worktrees.
- [x] Publish Diane project identities, absolute folders, and the existing composer execution payload without credentials.
- [x] Persist immutable dispatch IDs and task snapshots; reconnect without duplicate execution.
- [x] Implement status glyphs, result disclosure, Open in Diane, and acknowledged Stop.
- [x] Keep todo completion manual and follow-up/approval conversations in Diane.
- [x] Add isolated development storage and verify frontend, native bridge, backend lifecycle, and browser controls.
- [ ] Integrate companion changes and validate an authenticated run in installed apps during an idle maintenance window.

## Decisions
- Todo uses the most recently focused Diane window's selected project; its name appears on the Run tooltip. No project/model/agent picker in Todo.
- Missing project/folder disables dispatch or returns a specific error. Do not guess a filesystem destination.
- A dispatch snapshots text, parent context, current-date steps, and project ID. Completed steps are identified as context.
- One dispatch per source date/task identity. Reconnect reuses the request ID; follow-up happens in Diane. Deliberate reruns and cross-date link migration are future work.
- Queued: hollow circle; running: blue pulse; attention: amber diamond; ready: green check circle; stopped: gray square; failed: red crossed circle. Connection loss: hollow circle with dash and last-check time.
- Result-ready does not change the todo checkbox. Closing Todo does not stop Diane; closing Diane itself uses Diane's existing interruption behavior.
- First version targets the local Dear Diane desktop server on loopback port 45173. Remote hosts and browser-only Diane are outside this slice.

## Verification
- Todo Vite production build and native `cargo check --offline` pass.
- Full Todo TypeScript checking still reports only existing Star Focus errors, recorded in `docs/bugs.md`.
- Playwright synthetic UI check passes for six states, reduced motion, session-open action, Escape, double-click, reload, stop-pending, and disconnected state, with no page errors.
- Companion Diane: six handoff tests, seven existing session tests, two desktop navigation tests; frontend/Electron type checks, Vite build, and bundle budgets pass.
- Background lifecycle uses the real admission/execution scheduler with a deterministic test backend. No paid model run or installed-app replacement was performed.

## Worktrees
- Todo: `/private/tmp/todo-sticky-diane`, branch `feat/diane-integration`.
- Diane: `/private/tmp/diane-sticky-handoff`, branch `feat/sticky-todo-handoff`, based on committed source to preserve unrelated ongoing work.
