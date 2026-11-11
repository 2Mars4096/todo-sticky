# 6: Diane Task Handoff

**Status:** in-progress
**Goal:** Dispatch a todo once into Diane's existing project/session structure and keep follow-up in that session.

## Tasks
- [x] Add an opt-in local Diane connection setting, explicit destination/project details, grey controls when off or unavailable.
- [x] Lock standalone Todo operation and test core task controls with absent, stalled, malformed and corrupt Diane data.
- [x] Inspect both products and isolate work in separate Git worktrees.
- [x] Publish Diane project identities, absolute folders, and the existing composer execution payload without credentials.
- [x] Persist immutable dispatch IDs and task snapshots; reconnect without duplicate execution.
- [x] Implement status glyphs, result disclosure, Open in Diane, and acknowledged Stop.
- [x] Keep todo completion manual and follow-up/approval conversations in Diane.
- [x] Add isolated development storage and verify frontend, native bridge, backend lifecycle, and browser controls.
- [x] Reconcile Todo handoff and standalone hardening with the existing credential-fallback changes in an isolated integration branch.
- [ ] Deploy both apps and validate an authenticated run during an idle maintenance window.

## Decisions
- Diane is optional. Startup, task creation/editing/completion/deletion, storage, dates, goals and focus must work independently. A missing integration affects dispatch/status only; independently configured AI providers must not require Diane.
- Todo suggests only a unique task-context project name or explicit path. Active/first projects are not implicit destinations. A compact selected-task popover allows explicit workspace choice or native folder registration before Run.
- An uncertain destination stays blank and disables Run; Choose folder registers only the selected directory with Diane and never executes work.
- A dispatch snapshots text, parent context, current-date steps, and project ID. Completed steps are identified as context.
- One dispatch per source date/task identity. Reconnect reuses the request ID; follow-up happens in Diane. Deliberate reruns and cross-date link migration are future work.
- Queued: hollow circle; running: blue pulse; attention: amber diamond; ready: green check circle; stopped: gray square; failed: red crossed circle. Connection loss: hollow circle with dash and last-check time.
- Result-ready does not change the todo checkbox. Closing Todo does not stop Diane; closing Diane itself uses Diane's existing interruption behavior.
- First version targets the local Dear Diane desktop server on loopback port 45173. Remote hosts and browser-only Diane are outside this slice.

## Verification
- 2026-10-11: opt-in change passes production frontend build, all 24 native tests, and browser lifecycle/core-task checks including disabled mode with no Diane controls or requests.
- 2026-10-11: capture/edit/complete/delete/reload browser controls pass across absent, stalled, malformed and corrupt Diane cases using fixture task persistence. Native task storage is unchanged. Malformed responses cannot enter rendering; unreadable receipts are retained without polling writes. Frontend build passes; only existing Star Focus type errors remain.
- Todo Vite production build and native `cargo check --offline` pass.
- Full Todo TypeScript checking still reports only existing Star Focus errors, recorded in `docs/bugs.md`.
- Playwright synthetic UI check passes for six states, reduced motion, session-open action, Escape, double-click, reload, stop-pending, and disconnected state, with no page errors.
- Companion Diane: six handoff tests, seven existing session tests, two desktop navigation tests; frontend/Electron type checks, Vite build, and bundle budgets pass.
- Background lifecycle uses the real admission/execution scheduler with a deterministic test backend. No paid model run or installed-app replacement was performed.

## Worktrees
- Todo: `/private/tmp/todo-sticky-diane`, branch `feat/diane-integration`.
- Diane: `/private/tmp/diane-sticky-handoff`, branch `feat/sticky-todo-handoff`, based on committed source to preserve unrelated ongoing work.

## Merge into Todo main (2026-10-11)
- Preserve all 19 pre-existing modified/new files in `/private/tmp/todo-merge-preserve-20261011` and credential checkpoint `99b47e3`.
- Combine native command registration, styles, and documentation; keep file-backed credential lookup separate from process-dependent task dispatch.
- Production frontend build and disconnected-control browser checks pass; full TypeScript checking retains only the known 16 Star Focus errors. Native test results are recorded in the changelog.
- The original uncommitted state is retained in a named Git stash before the fast-forward. Existing task data, credentials and installed applications are not changed by the merge.

## 2026-11-10 workspace refinement
- [x] Restore the standalone task handoff icon accidentally absent from current TaskItem rendering.
- [x] Add conservative exact project-name/path matching, ambiguity handling, native folder choice, canonical selected-project response and explicit Run.
- [x] Keep plugin overview quiet: full outcome, goal and next-step details appear on task selection; due/review signals stay visible.
- [x] Verify 30 Node suites, TypeScript, narrow keyboard/touch-equivalent click paths, folder registration without execution, idempotent dispatch and receipt reopening.
- [x] Reinstall original Mac app after preserving profile/task files; deliver same-key Android APK with current service unchanged.
- Reference: Radix Popover documented button-trigger/portal/focus/Escape interaction, adapted within existing source styles without new dependency.

## Delivery evidence
- Producer `f83237c`; plugin `@diane-app/todo-plugin@0.1.3` packaged.
- Reinstalled `/Applications/Sticky Todo.app`, ARM64/ad-hoc signature verified; native process relaunched. Protected backup under `~/Library/Application Support/Todo Reinstall Backups/20261110-workspace-f83237c` retains original app/profile/WebKit/task files. All 56 task files and profile bytes unchanged through installation.
- Android: `release/todo-sticky-current-service-2.1.16-21.apk`, package `io.github.twomars4096.sticky_todo`, split versionCode2021, original signer verified. SHA256 `b8e0888a5631d344285c9057df6b1bb6ef4a842f022768cf4a92694af350d914`.
- Shared cutover disabled in both builds; original release APK and shared candidate retained. No APK installed, no iOS work. Real paired agent execution remains pending; UI verification used mock requests and did not call a model.

- Shared-account Android release +22 / versionCode2022 was rebuilt from the current shared-service source with explicit `DIANE_SHARED_CUTOVER=true`; the original production signer/package are retained. The existing current-service +21 APK remains standalone. No iOS build.

## 2026-11-10 — Original-app setup and session handoff
- [x] Keep selected-task Push visible and grey when the opt-in/local connection is unavailable; preserve saved-session inspection and reconnect polling.
- [x] Add Universal Cell suggestions through the local scoped Todo intelligence API, matching original task identity/date and synced text before sending context. Preserve preparation request IDs and inspect receipts on retry.
- [x] Allow editable workspace/context, explicit Review, then Start session with an immutable dispatch snapshot; use existing local Diane session/profile and Open action.
- [x] Verify 31 Node suites, TypeScript and browser setup/review/dispatch, disconnected core capture and reconnection. Live local project/account endpoints respond; no live model or execution request made.
- [x] Reinstall the shared-backend Mac build with this handoff and enable the local connection setting.

Decisions: preparation is one bounded model request for the selected synced task, using known local workspace names/paths. User edits win over late suggestions. Unsynced tasks can use manual setup. No hosted plugin UI or Diane installation is changed.

Installation: signed bundle matches the build and is running; all56 task files unchanged after launch, config preserved except requested connectDiane=true. Shared backend/cutover marker verified from runtime storage. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-shared-backend-install-20261110-203058`. Live Universal Cell/session acceptance remains user-driven.

## 2026-11-10 — Visible setup and direct Start
- [x] Replace the guessed300px anchor with measured placement, flipping above the task and clamping to the visible viewport; update on content growth, resize and scroll. Keep controls unshrunk and action row accessible in short windows.
- [x] Remove the separate review screen; edited workspace/context go directly to explicit Start with the existing immutable dispatch receipt.
- [x] Verify340×440 browser bounds, enlarged textarea, reachable Start and single dispatch; TypeScript passes. Reinstall/relaunch the signed shared-backend Mac app with all56 task files/settings preserved. Receipt: `output/diane-panel-install/macos-verification.json`.
This supersedes the earlier extra Review step at the user's request. The cloud-match requirement for AI suggestions remains a separate follow-up.

## 2026-11-11 — Recover carried-task run status
- [x] Diagnose the real saved task: two intact receipts report ready; carried-row date prefixes prevented the current-date link lookup.
- [x] Normalize display IDs during receipt lookup; preserve original dispatch bodies/keys, recover legacy prefixed keys, follow unique moved-task links, and refuse ambiguous cross-date or cross-folder matches.
- [x] Show a visible linked status: Queued, Running, Needs input, Finished · Review, Failed/Stopped or Disconnected. Completion stays manual.
- [x] TypeScript, receipt identity regressions and browser carried-row/reload recovery pass without redispatch. Visually verify Finished · Review at340px width. Signed Mac update installed/reopened; all56 task files and settings preserved, runtime shared backend verified. Receipt: `output/diane-status-install/macos-verification.json`.

## 2026-11-11 — Cohesive compact panel headers
- [x] Put title/status and close on one aligned28px row for both setup and linked-session details; remove the separate close-only band.
- [x] Consolidate duplicate field styling; retain28px select/close geometry,4px field gaps and existing theme. Compare existing Settings/Account/Project/Search header structure; preserve their already-grouped actions.
- [x] TypeScript and browser workflow pass; visually inspect setup/result at340px and600px, verify aligned centers and Escape.
- [x] Reinstall/reopen the signed Mac refinement; all56 task files and settings preserved. Runtime shared backend verified; receipt: `output/diane-header-install/macos-verification.json`.
