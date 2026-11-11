# 19: Contextual task refinement and visible execution

**Status:** in-progress
**Goal:** Clarify ideas with saved context, review suggested steps, and see Diane progress without opening each task.

## Tasks

- [x] Add optional revision-bound Todo source references to shared suggestion requests.
- [x] Supply bounded canonical task, step, project and frozen Meeting context to the host's Universal Cell profiles.
- [x] Preserve account, capability, permission revision, request receipt, schema and source-version checks.
- [x] Replace immediate hosted breakdown insertion with editable suggestions, explicit Add steps/Cancel and guarded Undo.
- [x] Show execution states on unselected task rows through one coalesced batch polling lifetime.
- [x] Preserve old shared-provider callers and direct provider choices; extend only shared AI timeouts for bounded multistep work.
- [x] Verify source/context races, proposal application, edited-step undo, batching, disconnection and account-switch behavior.
- [x] Verify the package against the integrated Diane SDK.
- [x] Preserve existing current-main MCP, Sync and reviewed standalone setup changes alongside recovery behavior.
- [x] Match desktop preparation transport bounds to staged inference and retain failed-stage execution/usage coverage.
- [ ] Ship matching host/product artifacts.

## Decisions

- Product source remains in this repository. Diane owns the shared Universal Cell implementation, tools, transport, usage and execution authority.
- The optional `sources` input contains only Todo `record_type`, `record_id`, `revision`. Caller-supplied policy/micro-skill fields do not become trusted execution policy.
- `todo_context.py` reads only the authenticated owner's selected records, ancestors, descendants and linked project. Frozen Meeting passages retain their cited transcript revision; a newer transcript is not silently substituted.
- Context is bounded to 40 records and 40,000 text characters, with per-source provenance and truncation markers. Source edits or newly added task steps during inference reject delivery. Project context conservatively rejects a task-generation change.
- Older standalone shared requests without canonical source references retain their supplied-context contract. The shared host can use its planning profile; these clients do not acquire a separate agent engine.
- Hosted breakdown proposes at most eight steps. No task mutation happens until Add steps; applying twice or applying after a task/day change refuses. Undo retains steps the user has subsequently edited or completed.
- All-row status is observational: bounded GET batches refresh the existing host workflow coordinator. Reads never dispatch work. Network/host errors show unavailable status, not a live Working claim. Status snapshots are bound to the account at render time, so overlapping task IDs cannot briefly show a prior account's status.
- Shared AI requests allow 390 seconds for the host's bounded stages. No implicit retry or background/resume guarantee is introduced. A deliberately new Generate action is a new inference intent.
- Standalone setup retains main's stored preparation receipt, editable project/context and explicit Review → Start session flow. Its native `prepare` call allows 390 seconds; connection, record and receipt reads allow 20 seconds. The web adapter introduces no extra timer or automatic resubmission.
- Main `2531781de69abe5b83a0b599f5c4746cceabf81e` contributes six existing commits since merge base `7f64acd8081884b9f608adf245f0619fd757bb6e`. Twenty-five paths were integrated; five documentation overlaps were merged, retaining both sides of three additive section conflicts. Product plugin source remains based on recovery `1c3cbfdbb3ac43cb281641862312074927ff2fae` plus this work.
- Standalone execution/review parity, durable suggestion jobs, cross-device execution bindings, full run history and Git isolation/merge remain separate work.

## Validation

- Product gate: strict TypeScript, 10 suites/53 tests, production build, generated-module render and package/import checks pass.
- Product context plus existing host adapter and canonical-sync suites: 43 tests pass, including the composed product adapter → configured host provider → three-stage Universal Cell using a deterministic HTTP transport and a paid-stage failure that retains execution/partial-usage evidence without replay.
- Actual-host SDK contract check passes against the integrated Diane checkout. Existing standalone shared-agent and shared-account Node suites pass; helpers issue one request and propagate uncertain transport failures without automatic resubmission.
- Inherited standalone preparation, workspace matching and changed sync-frequency suites pass. The full standalone runner passed its first 18 suites before the missing `firebase/app` environment dependency blocked review-reliability. No Rust toolchain is available for native/MCP execution in this environment.
- No installed-app, real-provider, phone build or live deployment is established by these checks.
