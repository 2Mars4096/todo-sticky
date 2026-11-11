# 18: Hosted task execution controls

**Status:** completed
**Goal:** Keep the hosted Todo task concise while making explicit Diane execution and saved sessions easy to find.

## Tasks
- [x] Inspect the recovered pinned plugin source and current Diane SDK contracts.
- [x] Replace the selected-task handoff stack with state-dependent Run, Open and Review controls.
- [x] Retain scoped automatic preparation, manual project corrections and idempotent execution retries.
- [x] Retrieve current and previous session links from existing workflow records; keep Run inside Todo.
- [x] Preserve saved task/step editing and explicit versioned result acceptance/revision.
- [x] Verify component behavior, package typechecking/build and unchanged task interactions.

## Decisions
- This slice changes `plugin/src/`; the standalone Tauri/phone source is unchanged.
- The pinned plugin source is recovered from Diane's exact UI 0.1.6 archive and backend 0.1.4 wheel. Their recorded producer commits were unavailable on GitHub; `plugin/RECOVERY.json` records checksums and member hashes. The backend modules rebuild unchanged; candidate UI is 0.1.7. Recovery provenance is separate from the following product edits.
- Existing host APIs remain the execution boundary. No branch/worktree, code diff, Merge, shared binding or new history service is claimed.
- Run never opens a session automatically. Open uses the workflow's returned session/project identity.
- Automatic preparation requires a matching task revision and account scope. An explicit project choice wins; an unavailable remembered root never silently falls back.
- Manual binding preferences and retry identities are device-local. Session/history retrieval uses the server's existing workflow records. The active workflow contains at most five prior attempts; validate attempt numbers and dispatch/session identity, inherit its authoritative scope/task/project, and offer only Open for historical entries. There is no complete historical-workflow API.
- Accept & complete uses the existing result-version review contract. Ordinary Todo completion and runtime approvals remain unchanged; no code merge is implied.

## Verification

- Focused source behavior: 23 tests pass across TaskExecution, TaskDianeAction, TaskItem and retainedBehavior. They cover no automatic navigation, explicit Open, returned-session remounts, bounded inline history, project/account/revision guards, interrupted retry identity, exact-result review snapshots, draft identity, save failure/retry, stop-only behavior, status-poll coalescing and existing paragraph/step interactions.
- Final clean `npm ci` and `npm --prefix plugin run check` pass: strict TypeScript, **8 suites / 34 tests**, production build, actual generated-module render without a global React or live network, and package/peer/import ownership checks. The production bundle/package gate was regenerated after the final CSS edit. The real current Diane SDK export assignment check also passes; `git diff --check` is clean.
- Rebuilt backend wheel contains the exact same three module bytes as the pinned 0.1.4 wheel and compiles successfully. No backend feature or version change.
- Live Diane execution, production browser visual review and whole-run Git behavior have not been claimed by these source tests. Parent integration will pin and check the generated package against Diane separately.

## Remaining host contracts

- Shared, authoritative task/project/workspace binding across devices.
- Complete historical workflow listing beyond the active pointer and its last five prior attempts.
- Whole-run branch/worktree isolation, reviewable Git diff/check receipts and an explicit merge operation. Result acceptance must not stand in for merge.

## Local integration — November 10
- Merge the GitHub workflow review with the original product-owned release history and canonical app folders. Retain backend adapter tests; consolidate identical backend modules into the reviewed src package layout.
- Product type/test/build/package and actual Diane SDK checks pass; combined adapter suite26 passes. Plugin runtime matches the artifacts integrated in Diane.

## Result recovery — November 10

- [x] Expose versioned Discard result directly in Review only when the host advertises `can_discard_result: true`, using workflow-only `stop` semantics while preserving task text, status and steps. Older hosts show an update explanation.
- [x] Show `review_conflict` from current host reads and disable accept/revise, including already-open revision drafts. Keep the exact displayed result version pinned for every review mutation.
- [x] Place Run again directly in the compact row for failed/stopped workflows; retain session Open and keep completed tasks closed.
- [x] Keep Stop run available for attention workflows, including interrupted revisions without a run ID. Preserve the host acknowledgment: a still-pending stop does not enable Run again or claim completion.
- [x] Cover edited-task discard→rerun, changed-step feedback guards, interrupted discard request identity, stale-result discard, visible retry and closed-task behavior.
- [x] Complete UI 0.1.8 production package and real-host contract validation; record results below.

Verification: `npm --prefix plugin run check` passes strict TypeScript, **8 suites / 43 tests**, the production build, generated-module render without global React/network, and package/import ownership checks. `npm --prefix plugin run check:host -- /workspace/scratch/04cd7aca8bcd/dear-diane/editor` passes against the current host exports. `git diff --check` passes. The saved-subtree regression reloads a same-revision root record and confirms an open feedback draft is blocked when the host reports changed steps.

Rendered-browser acceptance was attempted but not completed: the local Browser extension was unavailable in this session and the cloud browser could not reach the executor's loopback fixture (`ERR_CONNECTION_REFUSED`). The generated-module render gate is a separate automated result, not a visual or installed-app check.

The host integration must ship the corresponding workflow-only discard contract. These product checks do not constitute a real agent run or installation of Dear Diane on macOS.

## November 11 — Embedded visual consistency
- [x] Use shared host gutter/control/radius tokens, tighten task groups, and map the textarea border alias to the selected host palette.
- [x]53 plugin checks pass and source-host layout inspected; production pins remain unchanged until a future coordinated package release.

- [x] Subsequent user-requested delivery: package UI0.1.10 and consume in the verified local Diane reinstall. No standalone/cloud release.
