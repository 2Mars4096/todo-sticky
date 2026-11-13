# Changelog

## 2026-11-13 — Document control cohesion
- [fix] Use shared geometry and wrapping for document controls; shorten actions to Review changes and Save changes. UI0.1.15;62 tests/types pass.

## 2026-11-13 — Conditional draft cleanup
- [fix] Clear only the saved matching draft before reopening normalized file bytes; preserve another window’s newer recovery draft. Add save/normalization regression; UI0.1.14.

## 2026-11-13 — Document draft recovery
- [fix] Persist emitted Todo document drafts by owner and binding; restore changed-file drafts for review and guard unload.61 UI tests pass; UI0.1.13.

## 2026-11-13 — Selective document review
- [fix] Accept selectively reviewed Markdown as a new draft and require a fresh reconciliation preview before saving; candidate UI0.1.12.

## 2026-11-13 — Full KB Todo document candidate
- [feat] Add product-owned lossless Markdown parsing, ID preview, canonical record reconciliation and a full-document notebook portal with task actions. Cross-date moves retain canonical IDs; deletion retains running sessions/history.
- [safety] Require document/record revisions and explicit owner/root binding; retain file-first reconciliation journals and prior bytes. Conflicts need review, never title-based merging or implicit execution.
- [test] 59 UI tests and 36 backend tests pass, including real host filesystem + canonical SQLite round trips. Two actual shared-engine composition checks, 24 host editor checks, product/host types/build and SDK/package gates pass. Local UI0.1.11/backend0.1.6 candidates only; aggregation/visual/install acceptance pending.

## 2026-11-13 — KB Markdown document follow-up
- [docs] Record approved product-owned whole-document scope and original-ID/canonical-ID mapping requirement; retain standalone format and execution identities.

## 2026-11-13 — Host notebook editor portal
- [feat] Add optional taskEditor injection to existing Todo rows with account/record identity and guarded text callbacks. Preserve task controls, session links and canonical save authority.
- [test]56 product tests, strict types, build, distribution/package and actual-host SDK checks pass. Diane source-composition test passes; no installed/live claim.
## 2026-11-11 — Cohesive plugin packaged for Diane
- [release] Build local UI0.1.10 from reviewed source and pin its exact archive/hash in Diane. The signed Diane app is reinstalled and verified; standalone apps and hosted services are unchanged.

## 2026-11-11 — Embedded UI cohesion, source only
- [ux] Use shared host gutter/control/radius tokens, tighten task groups, and map the textarea border alias to the selected host palette.
- [test]53 plugin tests pass; rendered inside the actual synthetic Diane host through a source-only preview alias. No release package, deployment or app reinstall.

## 2026-11-11 — Idea execution branch published and pruned
- [infra] Push verified combined main and delete fully merged feat/idea-execution-cells with an exact-head lease. Remote main equality and branch absence confirmed; preserve safety stashes/backups and unrelated branches.

## 2026-11-11 — Combined main integration verified
- [integration] Merge feat/idea-execution-cells with existing local product changes; preserve source receipts and safety stashes.
- [test] Plugin53 tests and type/build/package/distribution/host-SDK gates, standalone31 Node suites and contextual backend9 cases pass. Final tests ran after the requested Diane reinstall.

## 2026-11-11 — Combined idea execution integration
- [integration] Combine feat/idea-execution-cells with current main and preserve the existing local product changes. Build/install precedes the final test pass at the user’s request.

## 2026-11-10 — Preserve current main and complete staged failure receipts

- [integration] Incorporate existing main `2531781de69abe5b83a0b599f5c4746cceabf81e` from merge base `7f64acd8081884b9f608adf245f0619fd757bb6e`, retaining the recovery branch's UI 0.1.8 behavior and the new 0.1.9 work. Inherited changes include local stdio MCP, guarded one-button Sync, and editable/reviewed standalone Diane setup. Preserve both branches' documentation history.
- [fix] Allow 390 seconds only for the desktop native `prepare` operation; connection, record and receipt reads use 20 seconds. The web setup adapter already awaits the native transport and stores request identity before sending, so receipt checks cannot silently submit a duplicate preparation.
- [receipts] Preserve staged execution and partial usage coverage when the provider raises before returning a result. Failed acceptance records `domain_validated: false` while retaining the Cell's original schema result and source evidence.
- [validation] Standalone workspace/preparation/shared-account/shared-agent and updated sync-frequency checks pass. The full standalone runner passed its first 18 suites before the environment's missing `firebase/app` dependency blocked an unrelated suite. Rust/browser/native-install verification is not claimed for this integration. Plugin package sources are unaffected by the inherited main changes; the receipt fix requires a new backend wheel.

## 2026-11-10 — Contextual suggestions and task-list execution status

- [ai] Supply revision-bound canonical task trees, project details and frozen Meeting passages to Diane's shared Universal Cell profiles. Keep source content untrusted, permission/schema checks intact, and usage receipts after source-race rejection. Older supplied-context clients remain compatible.
- [ui] Present editable suggested steps before Add steps. Cap breakdowns at eight, reject stale task/day proposals, and provide Undo that preserves subsequent user edits.
- [workflow] Show saved workflow progress on unselected task rows using bounded parent-level batch reads. Coalesce focus/change refreshes; mark lost contact unavailable and fence late results after account changes.
- [runtime] Raise only shared AI timeouts to 390 seconds for bounded multistep processing; standalone direct providers and ordinary sync limits retain their behavior. Candidate UI 0.1.9 and backend 0.1.5 require matching Diane integration.
- [validation] Strict TypeScript, 53 UI tests, build/dist/package gates, the actual-host SDK contract and 43 contextual/compatibility/sync backend tests pass, including the composed three-stage Cell using deterministic transport and failed-stage receipt preservation. The status regression checks every render while switching accounts with the same task ID. Existing standalone shared-agent/shared-account suites pass. Installed-app, phone build and real-provider validation are not claimed.

## 2026-11-10 — Recover edited results and expose retries

- [fix] Add versioned **Discard result** to hosted Review so edited tasks/steps can release their old result and run again. Consume the host's `review_conflict` explanation and block accept/revise while keeping dismissal available; the coordinated host preserves task content and status.
- [ui] Put **Run again** directly in the compact action row after failed/stopped work. Preserve saved session Open, explicit project corrections, closed-task state, and retry identities. Keep **Stop run** available for attention states, including an interrupted revision without a run ID; show Run again only after the host acknowledges stopped.
- [test] Add edited-task discard→rerun, changed-step draft blocking, interrupted discard identity, stale-result dismissal guard, visible failed/stopped retry, and completed-task regressions. Candidate plugin UI: 0.1.8; standalone app sources unchanged.
- [validation] Strict types, 8 suites/43 tests, production build/dist render, package/import checks and actual Diane SDK check pass. Browser visual verification remains uncompleted because the connected browser was unavailable and the cloud browser could not reach the local fixture; no installation or real-agent evidence is claimed by these product tests.

## 2026-11-11 — Compact setup and session headers
- [ux] Align heading and close control on a single shared row, removing the empty upper band in setup and linked-session details. Consolidate duplicate field styles.
- [delivery] Signed Mac app reinstalled/reopened; all56 task files and settings unchanged, shared backend verified and rollback copy retained.
- [test] TypeScript and browser workflow pass; setup/result headers visually verified at340px and600px with keyboard dismissal. Other page header structures reviewed; no unrelated redesign.

## 2026-11-11 — Recover Diane task status
- [fix] Resolve carried-row display IDs to saved session receipts, including older date-prefixed keys; preserve immutable dispatches and avoid ambiguous cross-date/folder matches.
- [ux] Linked tasks show their run status beside the icon, including Finished · Review and Disconnected. No automatic task completion or rerun.
- [delivery] Identity/browser/type checks pass; narrow finished-status visual verified. Signed Mac reinstalled with all56 task files/settings preserved and existing shared backend verified.

## 2026-11-10 — Visible Diane setup and direct Start
- [fix] Measure and constrain the setup panel to the visible window; adapt to content changes, scrolling and resizing, with accessible actions in short windows.
- [ux] Remove the extra Review screen. Start dispatches the workspace/context edited in the setup panel.
- [delivery] TypeScript and short-window browser workflow pass; signed Mac app reinstalled/reopened with matching bundle and shared backend. All56 task files and native settings unchanged; backup retained.

## 2026-11-10 — Deliver CLI/MCP Mac build
- [delivery] Push merged main to the user-confirmed GitHub origin; rebuild/reinstall and reopen Sticky Todo 2.1.16 with the bundled CLI/MCP executable. Preserve shared-backend settings.
- [test] Signed bundle/hash checks and installed CLI/MCP subprocess smoke pass. All 56 task-store files and native config unchanged; app running and runtime backend verified.
- [recovery] Keep prior app/profile/tasks backup; delivery receipt is `output/mcp-install/macos-verification.json`. Document the installed executable path for MCP clients.


## 2026-11-10 — Merge task MCP access
- [integration] Merge the tested CLI/MCP feature into main, preserving newer desktop changes and both sets of tracking entries. Retire its feature branch/worktree; keep unrelated worktrees.
- [test] Merged main passes all 45 native tests, CLI build and CLI/MCP subprocess smoke on disposable data.


## 2026-11-10 — Local task MCP interface
- [feat] Add stdio MCP list/create/edit/delete tools to the native task CLI, with read-only mode, strict inputs, bounded frames and required existing-archive revisions. Reuses local Markdown storage without Diane.
- [fix] Return a JSON error rather than panic when CLI receives only `--kb-path`; document `stopped` status.
- [test] All 45 native tests and a real CLI/MCP subprocess round-trip pass on disposable data; native debug CLI builds.
- [docs] Add local client configuration and meeting-summary integration examples; explicitly document concurrent-writer and UI-operation limits.

## 2026-11-10 — Reinstall and login exchange repair
- [release] Rebuilt/reinstalled the original Mac app; runtime shared backend, signature and all56 unchanged task files verified. Rollback backup retained.
- [fix] Mac return URI worked; the shared backend could fail token minting on a fresh instance. Diane fix a9508536 passes27 sign-in tests and is live at diane-api-00021-gup. Failed consumed attempts require a new sign-in.
- [delivery] Group source into guarded Sync, reviewed local setup/session handoff, and documentation commits. Real post-fix Google sign-in awaits user verification.

## 2026-11-10 — Shared Mac installed
- [release] Original Sticky Todo 2.1.16 rebuilt, signed, installed and relaunched with the Diane shared backend and two-step local setup/session handoff. Runtime backend selection verified; local Diane connection enabled.
- [preservation] All56 task files unchanged after launch. Previous app/profile/WebKit/tasks backed up; native settings preserved except connectDiane=true. Receipt: output/shared-mac-delivery/macos-verification.json. Real Google sync/model execution remains user acceptance.

## 2026-11-10 — Requested desktop reinstall
- [infra] Install the current verified Sticky Todo app alongside Diane at user request; retain original app rollback bundles and preserve profiles/data. Strict signature check and reopened app process verified.

## 2026-11-10 — Original-app Diane setup
- [feat] Grey disconnected Push; Universal Cell workspace/context suggestions remain editable, followed by Review and explicit Start session. Existing local Diane sessions retain Open/Stop and immutable retry receipts.
- [test] 31 Node suites, TypeScript and browser checks pass; live local project/account endpoints and shared cloud health/config respond. No live model/session execution performed.

## 2026-11-10 — One sync action
- [fix] Remove the folder-sync checkbox and label the action Sync. Explicit manual sync enables the existing owner-checked binding; background sync remains gated.


## 2026-11-10 — Empty-file cleanup
- [maintenance] Remove obsolete backend namespace directories, stale Python build/egg-info artifacts and 17 empty phone build logs. No empty tracked source files found; retain tooling locks/markers. Backend source hashes unchanged.

## 2026-11-10 — Remove remaining local intermediates
- [maintenance] Remove 404 generated/stale local files (63.2 MiB) and 20 empty directories, including one hash-identical APK duplicate. Keep the latest APK, unique backups, notebook snapshots and verification records.
- [cleanup] Remove retired demo-seeding script/npm command; retain the isolated browser recorder. Protected app/source hashes and package script paths verified; no application behavior changed.

## 2026-11-10 — Shared Android rebuild
- [release] Original-key 2.1.16+24 (Android versionCode 2024) delivered at repository root; previous root APK replaced. Shared Diane Google popup fix is deployed. Physical login remains acceptance work.


## 2026-11-10 — Repository consolidation

- [maintenance] Audit 558 tracked paths; consolidate 79 completed plans into existing records with anchored links, retaining decisions and evidence. Merge plugin module documentation; remove unused Tauri mobile icons, four obsolete symlinks, build forwarding script and empty shared scaffold. 438 tracked paths remain, with no new tracked files.
- [fix] Android CI now watches/builds phone/; canonical web paths replace stale TypeScript/Vite aliases. Simplify ignore rules and remove temporary browser/Finder files. Preserve pre-existing work, data, artifacts, private configuration and linked checkout.
- [test] 30 Node suites, 42 Rust tests, TypeScript, frontend/plugin builds, Flutter analysis and 138 Flutter tests pass (one existing skip). Plan content/anchor preservation, local links, native assets and diff hygiene verified.

## 2026-11-10 — Preserve shipped Android login fix
- [fix] Carry forward the existing native Google sign-in browser bridge and shipped APK version into main. This is the already-delivered fix; no APK rebuilt.

## 2026-11-10 — GitHub integration
- [refactor] Merge reviewed plugin workflows with existing independent-app history; preserve canonical app folders and adapter regressions. Product gates, actual host SDK checks and26 backend checks pass.

## 2026-11-10
- [fix] Plugin0.1.6 preserves machine capability text while typing and parses comma-separated values only for saving. Failed saves retain the draft; persisted records contain only the clean capabilities array.
- [test] Actual browser typing of gpu, batch preserves the comma, survives a failed save and saves [gpu,batch]; strict host React19/SDK typing and footer alignment/keyboard checks pass.

## 2026-11-10
- [fix] Plugin0.1.5 aligns all three footer labels with a shared14px marker/icon slot and6px gap. Native summary keyboard behavior remains; full-host-style360px browser check measured identical text x positions and verified Enter/Space toggling.

## 2026-11-10
- [refactor] Plugin0.1.4 exposes Scheduling machines directly beside Import & backup and AI settings; remove nested Planning settings and disable Save machines until edits.
- [feat] Quiet scoped preparation refresh after saved Todo changes, with debounce, periodic refresh and lifecycle/account fencing. Explicit Send remains required to execute work.
- [test] Strict host React19/SDK typing, 360px full-host-style footer capture/save retry, and preparation lifecycle checks pass without model calls.

## 2026-11-10
- [infra] Reinstall original Todo Mac app with protected rollback/profile/task backup; verify all 56 task files and profile unchanged. Deliver same-key Android build21 (split2021), preserving current service and disabling shared cutover.
- [test] Native 42 tests and selected-task browser folder-registration checks pass; no model execution or phone installation.

## 2026-11-10
- [fix] Restore the missing standalone Diane handoff icon in selected-task actions.
- [feat] Suggest only a unique task-context workspace; allow explicit workspace/folder choice before Run, preserve immutable dispatch receipts and leave uncertain choices blank.
- [refactor] Plugin 0.1.3 keeps overview outcomes/project/next-step details behind task selection while preserving due/review signals.
- [test] 30 Node suites, TypeScript and narrow browser handoff/keyboard/folder-registration/idempotency checks pass. Shared-service cutover remains disabled in installation builds.

## 2026-11-10
- [feat] Standalone Todo keeps its original UI while supporting central account sign-in, verified pending-edit migration, shared Universal Cell AI and exact dated task links. Explicit direct providers remain available.
- [fix] Set the canonical web build root after folder moves so native bundles contain index.html; quiet sync reuses complete snapshots without dropping offline edits.
- [test] 29 Node suites, 42 Rust tests and 137 Flutter tests pass (one existing skip); TypeScript and Flutter analysis clean. Shared signed Android build20 staged, not installed/published.

## 2026-11-10
- [perf] Release canonical sync adapter 0.1.4: owner/schema-scoped generation checks avoid full canonical scans on quiet polling; empty-container changes advance the clock. 17 backend tests pass.


## 2026-11-10
- [fix] Route Android Google sign-in browser launch through the registered native links channel. Deliver original-signer shared-backend APK2.1.16+23/code2023 at the repository root; six account/link checks pass.

## 2026-11-10
- [android] Build shared-backend ARM64 APK 2.1.16+22 / code2022 with `DIANE_SHARED_CUTOVER=true`; original release signer retained. Existing production builds remain standalone unless this explicit define is set. APK verification recorded in `docs/plans/6-diane-handoff.md`.

## 2026-11-10 — Product-owned hosted task execution

- [source] Recover the exact pinned Todo UI 0.1.6 and compatibility backend 0.1.4 into additive `plugin/`, with checksums/provenance and an independent React 19 build. The missing producer commits remain documented; standalone React 18/Tauri/Flutter sources and backend behavior are unchanged. UI candidate: 0.1.7 on `feat/plugin-workflow-review`.
- [workflow] Replace the selected-task handoff stack with a compact project/action row: Run stays in Todo, Open uses the saved session/project, and Review exposes exact-version Accept & complete / Request changes. Keep automatic preparation, explicit local project correction and idempotent retries; retrieve bounded previous-attempt sessions from existing host history.
- [reliability] Preserve review drafts across task-record refreshes, wait for canonical task saves, keep save failures retryable, fence account/task changes, and coalesce active-run status requests. Stale displayed results require Review latest. Stop run stops execution without implicitly stopping or accepting the Todo task.
- [validation] Clean independent install, strict types, 8 suites/34 tests, production build, actual-dist render without global React/network, package/import/peer gates and real Diane SDK export checking pass. The backend wheel rebuild retains exact original module bytes. No live execution, installed-app or production-browser acceptance is claimed.
- [scope] Shared project binding, complete historical workflow retrieval and whole-run Git isolation/diff/checks/merge remain host work. No simulated Merge control or new approval flow is added. See [plan 18](plans/18-hosted-task-execution.md) for verification and acceptance limits.

## 2026-11-10
- [fix] Backend0.1.3 preserves canonical goal relationships on standalone reassignment and refuses invalid/cross-date task graphs instead of returning a destructive empty snapshot.
- [feat] Add dry-run/expected-revision derived-goal-link repair for already-seeded records; preserve legacy sync revisions and task text/status. Fifteen tests pass; immutable wheel retained for parent migration.

## 2026-11-09
- [feat] Add product-owned canonical `/v1/sync` projection, original v1/v2 validation, CAS/idempotent writes and original-revision migration seeds. Task bodies remain in shared canonical records; metadata/receipts contain hashes rather than a second live payload store.
- [test] 12 backend contract/SQLite/FastAPI checks pass; build `diane-todo-plugin` 0.1.2. No production migration or default cutover yet.
- [docs] Consolidate product folder ownership into the existing folder guide; retain compatibility symlinks and legacy rollback backend.
- [docs] Start original `/v1/sync` compatibility over Diane canonical records, shared sign-in and standalone web/phone integration; preserve UI and defer live cutover until parent migration.

## 2026-11-09 — Product-owned release structure
- Move app sources into desktop/web/phone/plugin; retain legacy build paths and standalone UI. Plugin UI/backend source now belongs to this product; shared-service cutover remains pending.

## 2026-11-08 — Commit and push sync/UI follow-ups

- [repository] Commit the reviewed sync-read/retry fixes, shared typography, read-only recovery UI and direct phone cloud action as `f60e7ed`; push to origin/main and verify the remote commit. Generated APKs, local reports, rollback copies and credentials remain excluded.
- [validation] Existing verification covers 26 Node suites, TypeScript, 41 native tests, 127 phone tests/analysis, UI previews and the signed +19 APK.

## 2026-11-08 — Phone cloud button syncs directly

- [mobile] Replace cloud-to-Account navigation with the existing manual sync command, a compact busy indicator and brief controller-result feedback. Keep configuration/conflict details in Settings and preserve draft/save/offline guards; no implicit account enablement.
- [verification] All 127 phone tests and analysis pass, including route preservation, direct requests, busy/off states and deferred feedback. Original-key APK delivery tracked in [16-4](plans/16-sync-efficiency.md#16-4-phone-sync-shortcut).
- [delivery] Signed production 2.1.16+19 / 2019 delivered at `release/todo-sticky.apk` (19.88 MB), with matching original certificate, v2 signature, ZIP integrity, 16 KB alignment and service origin verified. Prior +18 APK retained.

## 2026-11-08 — Install final sync, typography and recovery clarification

- [desktop] Install the final combined Mac build with sync-read/retry fixes, one footer shape, shared typography and read-only recovery labels. Signature/bundle hashes and launch verify; all 56 task-folder files/native config unchanged, with a verified rollback copy.
- [android] Deliver original-key 2.1.16+18 / 2018 at `release/todo-sticky.apk` (19.88 MB). V2 signature, package/version, ZIP integrity, 16 KB alignment and service URL verify. Final checks: 26 Node suites, TypeScript, 41 native tests, 124 phone tests/analysis and visual previews. [Receipt](plans/4-54-text-emphasis-consistency.md).

## 2026-11-08 — Simplify typography and distinguish recovery backups

- [design] Apply shared regular-content and semibold-heading/emphasis roles on Mac and Android. Remove first-line/length-based bolding and inferred project titles; show full project text as plain content. Shared Flutter styles retain resolved fonts across body and list tiles.
- [recovery] Clearly label saved originals as read-only recovery backups, with Mac/Cloud before-sync titles and no apply controls. Only pending conflicts present individual choices.
- [verification] Existing project workflows and compact/wide/enlarged browser checks pass; WebKit/Chrome task/project typography and real-font phone previews reviewed. Final combined delivery is tracked in [4-54](plans/4-54-text-emphasis-consistency.md).

## 2026-11-08 — Correct false sync edit detection and footer shape

- [sync] Reproduce the reported missing-date mismatch without edits. Align canonical targeted reads with history for absent, empty and duplicate sections while preserving default task-API behavior. Both clients preserve genuine concurrent local work and retry neutrally, with one prompt retry before normal polling.
- [ui] Remove native button appearance from the footer so Goals and neighboring controls share one 4px rounded rectangle. Keep visible keyboard focus; WebKit/Chrome compact checks pass.
- [verification] 41 native tests, 26 Node suites, TypeScript and 124 Flutter tests/analysis pass. Mac reinstall and original-key Android +17 delivery are tracked in [16-3](plans/16-sync-efficiency.md#16-3-false-local-change-detection) and [4-53](plans/4-53-footer-control-shape.md).

## 2026-11-08 — Publish and verify 2.1.16

- [release] Publish [v2.1.16](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.16) as latest with 14 assets. macOS universal, Windows, Linux and publication workflow `42438376556` succeed; both Android CI runs succeed.
- [verification] Validate public manifest coverage for all four desktop targets, download all three unique update packages and verify their trusted-key signatures and trusted comments. Published Mac GUI/task-helper binaries both contain ARM64/Intel slices and pass strict bundle-signature checks. Source, tag and delivery records are pushed; [receipt](plans/4-19-github-in-app-updates.md#4-52-publish-2-1-16).

## 2026-11-08 — Deliver 2.1.16 locally and start public release

- [desktop] Rebuild/sign/install Mac 2.1.16 and verify launch, exact bundle hashes, signature and unchanged task/config files; retain app/task/native/WebKit rollback copies.
- [android] Deliver original-key 2.1.16+16 / 2016 at `release/todo-sticky.apk` (19.88 MB), with verified v2 signature, package/version, ZIP integrity, 16 KB alignment and service origin.
- [publication] Commit source as `47d2271`, bump/tag `df8c0c2` and push both to origin/main. Hosted release `42438376556` and Android CI are running; public verification follows in [4-52](plans/4-19-github-in-app-updates.md#4-52-publish-2-1-16).

## 2026-11-08 — Merge independent sync edits and review individual conflicts

- [sync] Merge goals, steps and nested daily tasks by stable ID and acknowledged ancestor. Combine separate additions/fields and safe deletions; retain genuine field, edit-versus-delete and order choices. Each choice preserves unrelated changes. Save exact originals and the combined local record before revision-guarded upload; interrupted retries reuse their mutation identity.
- [ui] Replace whole-record replacement controls with individual item/field choices on Mac and Android. Background checks stay quiet, text-editor blur alone can schedule an editing retry, and unchanged choices/scroll remain stable. Changed fields invalidate only their own selection; saved-copy identity remains stable as history grows.
- [release readiness] Preserve an existing owner/folder service URL when upgrading to a public build, and add an official pinned-Git fallback for unavailable Flutter archives in CI. All 25 Node suites, TypeScript, Android analysis/121 tests and compact/wide browser review pass. [Implementation](plans/16-sync-efficiency.md#16-2-smart-merge-and-stable-review); publication tracked in [2.1.16](plans/4-19-github-in-app-updates.md#4-52-publish-2-1-16).

## 2026-11-07 — Install automatic-sync Mac build and deliver Android +15

- [desktop] Restore the Rust toolchain, rebuild/sign and reinstall Mac with exact bundle verification and successful launch. All 56 task-folder files and native config remain unchanged; app/task/native/WebKit rollback copies retained. All 23 Node suites and TypeScript pass.
- [android] Restore official Flutter 3.47.8 / Dart 3.13.7, fix a guarded assertion in the new fake-clock test and pass all 102 tests, analyzer and changed-file formatting. Deliver production +15 / 2015 at `release/todo-sticky.apk` (19.75 MB); original-key v2 signature, package/version, ZIP integrity, 16 KB alignment and service origin verify. Previous APK retained; no phone installation, public release or backend change. Delivery evidence: [16-1](plans/16-sync-efficiency.md#16-1-automatic-sync-frequency).

## 2026-11-07 — More automatic Mac and phone sync

- [sync] Reduce both clients' foreground remote checks from 60 to 15 seconds; retain 900ms saved-change debounce and automatic periodic retries. Mac checks on visibility return as well as focus/online; Android resumes immediately.
- [fix] Empty focused Mac capture no longer suppresses polling. Active Mac Focus defers only incoming focus history, allowing task/goal sync; ending Focus schedules the deferred history. Preserve draft protection, conflict review, compare-before-write and offline core operation.
- [validation] All 23 Node suites, TypeScript and frontend production build pass, including synthetic automatic arrivals, draft resume, offline retry, overlap, hidden/paused polling and Focus deferral. Android lifecycle/retry regressions added but cannot run: default Dart 3.11.5 is below required 3.13 and the former temporary Flutter 3.47.8 SDK is missing. No installed-app/backend/public-release changes. [Plan](plans/16-sync-efficiency.md#16-1-automatic-sync-frequency).

## 2026-11-02 — Simplify project editing and review

- [ui] Use consistent inline Save/Cancel and Cmd/Ctrl+Enter/Escape for project text and steps. Edit actual scheduled task text/work date in place; provide a compact Project return from full daily-task review. Preserve changed drafts on attempted navigation and restore editor focus.
- [safety] Capture original edit snapshots; reject newer external changes. Date moves preserve status/deadline/children/goal links, save destination before source cleanup and use existing journal recovery. Pending writes retain one immutable edit until retry/discard.
- [delivery] 22 Node suites, TypeScript/build and production browser edit/cancel/stale/retry/date/navigation/layout checks pass. Mac rebuilt/reinstalled and launched with all 56 task files/settings unchanged; no backend or Android changes. [15-4](plans/15-project-goals-and-multiday-planning.md#15-4-project-editing-review).

## 2026-11-02 — Mac project editor and phone-created goal details

- [desktop] Open long-term goal titles to view/edit their existing descriptions and steps. Add manual or reviewed AI steps, schedule selected work, open linked tasks, assign existing tasks to projects and filter Progress. Add editable multi-day project proposals with date/budget/weekday validation.
- [recovery] Preserve the shared goal/task schema; journal cross-file writes, compare before replacing dates and retain backups. Retry skips acknowledged dates; removing a step or discarding remaining writes keeps daily work. Stale/duplicate proposals are rejected before mutation.
- [ui] Apply self-explanatory-ui with flat lists, direct title entry, concise actions, accessible labels and contextual deletion/recovery consequences. Preserve selected texture and existing paragraph/drag behavior.
- [delivery] Mac rebuilt, signed, installed and reopened, including pending sync efficiency. Android, sync, Mac and documentation source batches pushed to main and remote verified. All 56 task files/settings unchanged. 22 Node suites, TypeScript, 40 native tests, production browser workflows and existing 100 Android tests pass. [15-3](plans/15-project-goals-and-multiday-planning.md#15-3-mac-project-planning).

## 2026-11-01 — Faster, quieter client sync

- [performance] Batch unchanged acknowledgements; skip no-op metadata writes. Desktop checks affected dates instead of rescanning the archive per download and refreshes once per batch. Android compares scoped live records rather than cloning the entire notebook per apply.
- [interaction] Use 900ms edit debounce, resume after editing, allow empty capture focus and count actual changed records. Ordinary editing waits are status messages; conflict/recovery safeguards remain.
- [validation] 21 Node suites/TypeScript and 100 Flutter tests/analyzer pass, including idle-save counts, targeted-read/reload counts, concurrent edits and existing conflict/schema migration checks. Original-key APK +14 delivered; Mac bundle built, installation awaiting normal app quit. [Delivery](plans/16-sync-efficiency.md).

## 2026-11-01 — Minimal project UI clarity pass

- [ui] Rename goal Generate plan to Suggest steps, clarify the daily project budget with minute-valued choices, and remove the repeated proposal instruction in favor of an accessible Edit proposed task icon. Preserve removal, apply/discard, labels, warnings and save recovery.
- [scope] One self-explanatory-ui pass; no task/planning logic or navigation changes. All 97 tests and normal/enlarged visual review pass; original-key APK +13 rebuilt and verified. [Delivery](plans/15-project-goals-and-multiday-planning.md#15-2-minimal-copy-pass).

## 2026-11-01 — Android project attribution and multi-day AI planning

- [features] Add Assign to project in the task menu, linked-work access in Project tasks, and Plan across days with range, daily project budget and weekdays-only controls. Reuse existing goal steps or review/edit/remove AI suggestions before adding them to daily lists.
- [reliability] Keep generation/discard read-only; reject changed notebooks, invalid dates/budgets, duplicate tasks and already scheduled steps before applying. Save project steps and all dates together; Retry persists the same mutation without duplicating tasks. Keep explicit child-project links when assigning a parent.
- [delivery] Original-key Android +12 / 2012 delivered at `release/todo-sticky.apk` (19.75 MB). Analyzer/formatting and all 97 tests pass; normal/enlarged screenshots reviewed and emulator update preserves notebook bytes. [Evidence](plans/15-project-goals-and-multiday-planning.md#15-1-android-project-planning). No new database/schema/backend deployment; Mac project editor remains follow-up.

## 2026-11-01 — Tighten phone drag controls

- [ui] Reduce space before the visible grip from 44px to 14px and the root text inset from 104px to 66px. Use equal 12px optical gaps, first-line vertical alignment and shared Today/Earlier geometry; preserve nested indentation and drag actions.
- [validation] Flutter formatting/analyzer and all 86 tests pass; normal/enlarged screenshots and expanded nested rows reviewed. Original-key Android +11 delivery tracked in [14-1](plans/14-task-control-spacing.md#14-1-compact-phone-grip).

## 2026-11-01 — Publish local spacing and deployment records

- [repository] Fetch origin/main and confirm it matches ba07999; no incoming changes need merging. Publish the local spacing fix, production deployment evidence and clarified project-goal planning scope in separate source/documentation commits.
- [delivery] Rebuild the original-key Android +10 APK from the committed source; delivery evidence is tracked in [14](plans/14-task-control-spacing.md). Local outputs, notebooks and signing credentials remain excluded from Git.

## 2026-11-01 — Consistent task controls and project-goal clarification

- [ui] Preserve equal desktop grip/checkbox/title gaps across paragraph and short titles. Share phone daily/Earlier grip geometry, explicit checkbox size and first-line scaled alignment; expanded actions and nested rows follow the parent title column.
- [validation] Desktop geometry and screenshots at 340/460/1000px pass; Flutter analyzer/all 86 tests pass, with normal/enlarged screenshots. Mac rebuilt/installed with data preserved; Android +10 packaging tracked in [14](plans/14-task-control-spacing.md).
- [direction] Record the user's clarified project-based long-term goals, attribution of existing work, schedulable project steps and multi-day AI planning in [15](plans/15-project-goals-and-multiday-planning.md). This is the next scope, not part of the spacing build.

## 2026-11-01 — Deploy goal-plan sync and rebuild production apps

- [backend] Deploy source ba07999 to Cloud Run revision `sticky-todo-sync-00012-z9w` at 100% traffic. Verify payload schemas 1/2 and goal planning, health, rejected anonymous/invalid tokens and unchanged environment/runtime/scaling settings; no user records accessed.
- [desktop] Rebuild and install the signed Mac app with goal-metadata compatibility. Launch and exact bundle verification pass; all 56 task files/native settings unchanged, with a verified rollback backup.
- [android] Build original-key production 2.1.15+9 / 2009 at `release/todo-sticky.apk` (19.62 MB). Signature, package and 16 KB alignment verified; dedicated emulator update preserves notebook bytes. This updates production, unlike the separate preview.
- [validation] 19 backend tests, 20 Node suites, TypeScript, 40 native tests, Flutter formatting/analyzer and 86 Flutter tests pass; desktop paragraph workflows checked in production assets. Evidence and hashes: [13-1](plans/13-goal-planning-and-mobile-drag.md#13-1-production-deployment).

## 2026-10-31 — Goal plans and Earlier dragging on Android

- [mobile] Add handle-only Earlier-to-Today dragging with row/header/empty targets, insertion feedback, edge scrolling and cancellation. Full task trees retain identity, metadata and persistence; daily reordering still handles hidden completed rows.
- [goals] Add a flat goal plan editor with manual steps, editable AI proposals and selected scheduling to Today or a chosen date. Scheduled steps open their actual daily task; goal badges and Progress filters retain the connection across moves and completion. Repeat scheduling is idempotent, and all dated fragments must finish before a plan step counts as complete.
- [storage] Preserve bounded plan/link metadata in JSON, Markdown, desktop transforms and backend validation. Negotiate payload schema 2 with legacy projections, metadata-preserving legacy edits and safe baseline upgrades. Goal-bearing notebooks pause sync against the existing old service; the compatible backend source is prepared but not deployed.
- [review] Keep rows flat and actions concise, with tooltips/accessibility names and consequential warnings. Responsive wrapping fixes wide/enlarged text; phone workflow, AI review and simulated keyboard layouts were reviewed at 360 px and 100%/150% text.
- [validation] Flutter formatting/analyzer clean; 86 Flutter tests pass, plus opt-in real-font goal screenshots. Also pass 20 Node suites, TypeScript, frontend build, 19 backend tests and 16 native module tests. No physical-phone or live-provider acceptance is claimed.
- [delivery] Publish verified source to main and upload version 2.1.15+9 to Dropbox as a separately installable optimized ARM64 **Sticky Todo Preview** APK (19,622,467 bytes); signature, ZIP and alignment checks pass. The original release key is unavailable here, so the production APK is preserved. Details and remaining backend/production-signing steps: [13](plans/13-goal-planning-and-mobile-drag.md).

## 2026-10-31 — Paragraph-friendly tasks on Mac and Android

- [tasks] Replace single-line desktop capture/title/step editors with growing textareas, preserve paragraph whitespace in rows and soften long text weight. Enter inserts newlines; Add/Save or Cmd/Ctrl+Enter commits. Android capture and steps use newline keyboards and bounded scrolling with keyboard-aware height.
- [review] Apply self-explanatory-ui to task capture/editing/actions: remove redundant prompts, shorten phone Edit task wording, preserve accessible names, explicit commit controls and consequential warnings. Verify compact/wide desktop and phone paragraph/editor layouts.
- [storage] Preserve multiline/comment-containing text in escaped Markdown metadata on both clients; keep nested task identities and finish metadata intact. Native API and all sync validators accept paragraph strings. Deploy sync revision `sticky-todo-sync-00011-jbv` after backend regression checks.
- [delivery] Final Mac bundle reinstalled and launched with all 56 task files/settings unchanged; installed CLI paragraph round trip passes. Same-key Android +8 APK delivered at `release/todo-sticky.apk`; no physical phone attached.
- [validation] 19 Node suites, 37 native tests, 16 backend tests, TypeScript, desktop paragraph/action browser checks, and 64 Flutter tests with screenshots pass; Flutter analyzer is clean. Final delivery evidence and acceptance limits: [12](plans/12-paragraph-friendly-tasks.md).


## 2026-10-31 — Publish reviewed source in batches

- [repository] Commit account/native transport, desktop workflows, Android parity, Goals material and shared documentation in five separate batches, then push origin/main and verify remote HEAD. Ignore local browser sessions and all review/delivery output, preserving artifacts on disk.
- [validation] 19 Node suites, TypeScript, 15 backend tests, Flutter formatting/analyzer and 60 Flutter tests pass; candidate-source scan finds no credential patterns or large artifacts. Publication receipt: [11](plans/11-batched-publication.md).

## 2026-10-30 — Goals follows the selected note material

- [fix] Share the Frosted/Liquid surface with Goals and Routines, replacing both base and compact fixed-yellow overrides while preserving Paper defaults and the saved preference.
- [verification] Existing material/promotion browser suite now checks open Goals for all three materials at 340/460/1000px; screenshots reviewed. Production/native builds pass; Mac reinstalled and launched with exact bundle/signature checks and all 56 task files/native settings unchanged. [Details](plans/10-user-workflow-improvements.md#10-3-goals-material).

## 2026-10-30 — Workflow review, Mac installation and Android +7

- [mobile] Add matching Search/Progress, optional local recurrence, remembered planning setup with time budgets/breaks, original-step fingerprint protection, focus-task review and compact account state. Generated task identities match desktop; routine definitions remain local.
- [review] Harden desktop routine lookup; fix phone enlarged-text header/confirmation overflow, move Focus controls ahead of graphics and reveal Review task after completion. Stopped tasks no longer inflate completion counts.
- [delivery] Install and launch the verified Mac bundle with all 56 task files/native settings unchanged. Deliver same-key ARM64 APK `release/todo-sticky.apk`, 2.1.15+7 / 2007, 19.49 MB. Isolated emulator update preserves notebook bytes and exposes new controls.
- [validation] 19 Node suites/TypeScript/desktop browser workflows and 60 Flutter tests/analyzer pass; production builds/signatures and phone screenshots reviewed. Backup, hashes and acceptance boundaries: [10-2](plans/10-user-workflow-improvements.md#10-2-review-install-and-android). No public release/backend changes.

## 2026-10-30 — Desktop workflow improvements and UI/UX review

- [features] Add original-date task/step Search, a day/week Progress page, quiet Earlier tasks awareness, device-local optional recurrence, inline plan budgets/breaks, remembered planning window/machines, post-focus task review and a compact truthful sync indicator.
- [recovery] Retain edited/started/legacy plan steps when replanning; validate unavailable time and budgets; acknowledge routine occurrences only after task save, deduplicate retries, and preserve unreadable schedules. History reads remain lazy, bounded and shared while pending.
- [review] Inspect compact/default/wide screenshots and user flows. Fix hidden plan proposals, duplicate pause controls, internal status labels, invalid date display and footer wrapping. Keep capture, manual completion, independent goals and task ordering intact.
- [validation] TypeScript/build, 19 Node suites, 36 native tests and four production browser suites pass. See [10-1](plans/10-user-workflow-improvements.md#10-1-desktop-workflow). Desktop source only; Android UI, installed apps, releases and live user data unchanged.

## 2026-10-30 — Functional improvement scope and design safeguards

- [planning] Reconcile all twelve review points with user feedback in [plan 10](plans/10-user-workflow-improvements.md). Reuse task/subtask ordering and applied-plan editing; hold goal linking and completion redesign. Specify quiet backlog awareness, search, optional recurrence, inline planning inputs, clearer dates, post-focus review, Progress and minimal sync status.
- [review] Check previous compact-layout, direct-action, copy, startup, date-editor, archive-loading and conflict-recovery fixes. Record truthful dashboard/date metrics and date-level sync indicators as design gates.
- [scope] Documentation only; no app implementation, deployment, installation or user-data changes. Platform/delivery scope remains open.

## 2026-10-30 — Phone drag grips and icon actions

- [mobile] Add a visible six-dot grip for immediate daily task reordering; preserve hidden completed tasks through visible-to-stored index mapping. Focus, Add step, Suggest and Move use icon buttons; horizontal dots reveal editing, copy, status and delete.
- [validation] Flutter analysis and all 52 tests pass, including drag/reload, filtered reorder, 360px layouts and enlarged text. Optional phone screenshots render successfully and the expanded task layout was visually reviewed. Physical-phone interaction remains unverified.
- [delivery] Build Android 2.1.15+6 / versionCode 2006 with the existing release key and configured sync service; delivery at `release/todo-sticky.apk`. See [7-4](plans/7-4-phone-task-controls.md).

## 2026-10-30 — Account workspace, conflict recovery and sync progress

- [ui] Replace Account descriptions and prominent export controls with compact identity/sync rows, aligned buttons and visible stage/count/elapsed progress. Add in-place Conflicts & recovery with readable task trees, differences-only filtering, version selection, saved-copy browsing and scoped export.
- [safety] Preserve both versions on conflict detection, deduplicate copies, and reject choices if the reviewed contents or cloud revision changed. Android uses the same protection; no user conflicts were resolved automatically.
- [sync] Accept legacy blank checklist titles across the backend and both clients, preserving older notes. Replace Mac frame-only waits with a bounded fallback; error context identifies the stage/date. Deployed backend revision `sticky-todo-sync-00010-62k`; live uploads now succeed.
- [delivery] Reinstall Mac with all 56 task files/settings unchanged; deliver signed Android +5 at `release/todo-sticky.apk` (19.43 MB, same key). TypeScript, 18 Node suites, 15 backend tests, Flutter analysis/50 tests, browser layout/interaction checks and emulator update pass. [Progress](plans/8-6-sync-progress.md), [workspace](plans/8-7-account-conflict-workspace.md).

## 2026-10-29 — Finish sign-in directly after Google

- [fix] Match user-review’s immediate post-Google completion: the user’s original sign-in click now submits the protected handoff after account selection, without a second Connect this account gate. Keep explicit account choice and separate sync opt-in; clarify retry/cancellation and prevent duplicate submissions.
- [fix] Reload fresh app fragments in a reused sign-in tab so an earlier session/challenge cannot remain active. Browser cleanup no longer blocks return.
- [validation] Reproduce the old zero-handoff/second-button behavior in isolated Chrome, then verify single-click completion and fresh-request reuse locally and on the hosted page using synthetic identity responses. All 16 Node suites pass. Deploy revision `sticky-todo-sync-00009-zz6` and verify exact served source/no-store/auth rejection. No app reinstall or user-data changes. [Record](plans/8-5-single-step-google-signin.md).

## 2026-10-29 — Return to app after Google confirmation

- [fix] Register a fixed token-free `todo-sticky://account-return` callback on macOS/Android. Successful browser confirmation attempts return and exposes a fallback link; older clients retain manual-switch instructions. Android consumes the protected handoff only after returning to the foreground.
- [delivery] Deploy web revision `sticky-todo-sync-00008-mr2`, install the verified Mac build with 56 task files/settings unchanged, and replace `release/todo-sticky.apk` with signed 19.36 MB Android +4.
- [validation] 16 Node suites, 36 native tests, 45 Flutter tests, analysis and 14 backend tests pass. Actual native callbacks retain the same Mac process and Android Account screen; deployed files match source and unauthenticated sync remains denied. [Details](plans/8-4-browser-return-handoff.md).

## 2026-10-29 — Concise Android screen copy

- [ui] Remove repetitive intros, slogans and permanent instruction blocks across Notes, Account, Settings, AI, Machines, Goals/Routines, Focus, Music and Plan. Keep current data, accessible control names, upload consent, conflicts/recovery, replacement warnings and errors.
- [delivery] Rebuild `release/todo-sticky.apk` as 2.1.15+3 / 2003, still 19.36 MB, with the same release key and prefilled sync URL. Preserve the previous release in ignored local artifacts.
- [validation] Flutter analysis and all 44 tests pass, including narrow/enlarged-text cases. Review ten Android surfaces and verify in-place update preserves the synthetic notebook. Final package signature passes; [record](plans/7-3-concise-mobile-copy.md).

## 2026-10-29 — Backend-connected macOS reinstall

- [delivery] Rebuild and install `/Applications/Sticky Todo.app` with the deployed sync origin prefilled through `VITE_SYNC_SERVER_URL`. Preserve saved overrides, account consent and local data; Google login and folder-sync opt-in remain explicit.
- [validation] Live public Firebase config, TypeScript and 15 Node suites pass; optimized native build, strict signature, installed bundle hashes and launch verify. Back up app/settings/WebKit/tasks; all 56 task files and native settings unchanged after launch. Details: [8-3](plans/8-3-backend-connected-macos-install.md).

## 2026-10-29 — 19.36 MB Android release APK

- [delivery] Replace `release/todo-sticky.apk` with optimized ARM64 2.1.15+2 (versionCode 2002), reducing the APK from 86.82 MB to 19.36 MB (77.7%). Retain all features and prefill the deployed sync URL. Persistent release signing stays outside Git; prior debug installs require export/reinstall/import because their certificate differs.
- [validation] Flutter analysis, all 44 tests, APK signature/ABI/debug-content checks, and isolated Android emulator launch/task persistence/account configuration checks pass. Runtime error log is empty; original debug download retained. Details: [7-2](plans/7-2-small-release-apk.md).

## 2026-10-29 — Safe repository folder cleanup

- [maintenance] Remove reproducible Rust compiler caches, backend bytecode, selected Finder metadata and the empty `.cursor/`; retain native binaries, bundles, rollback copies, task data, private configuration, dependencies and delivery evidence.
- [documentation] Add the folder/script guide and ignore local linked checkouts. Preserve the unmerged `today-first-planning` worktree and existing deployment/APK changes. Native rebuilds will take longer after cache removal.

## 2026-10-29 — Correct APK filename

- [delivery] Rename the local APK to `release/todo-sticky.apk` and update its documentation to match the repository name.

## 2026-10-29 — Short local APK path

- [delivery] Copy the verified Android APK to `release/sticky-todo.apk`, confirm matching SHA-256 and ignore local release downloads in Git.

## 2026-10-29 — Live account-sync backend

- [deployment] Link `sticky-todo-20261028` to the user’s new dedicated billing account and deploy the Singapore Cloud Run backend with its dedicated runtime, owner-only access and active login-handoff TTL. Authorize the service hostname in Firebase Google sign-in; document the desktop/Android service URL.
- [fix] Add `/v1/health` after observing Google frontend 404 responses specifically for `/healthz`; actual configuration/sign-in/sync routes work. Remove the temporary Taiwan diagnostic service.
- [validation] All 14 backend tests and 27 live synthetic checks pass, including runtime-signed handoff, Firebase exchange, conflict/idempotency/pagination, isolation and direct Firestore denial. Restore owner-only access and delete all disposable accounts/records. No real notes uploaded; real Google browser login and physical two-device acceptance remain.

## 2026-10-28 — Account integration and demo source checkpoint

- [repository] Prepare the user-requested commit/push of integrated Android/account-sync source, local-install and deferred-cloud records, and preserved README/demo work. Clarify that current main includes accounts while the public v2.1.15 desktop release predates them.
- [validation] Diff whitespace and demo recorder syntax checks pass; prior application/native/CI verification is recorded below. Downloaded APKs and local deployment artifacts remain ignored.

## 2026-10-28 — Local delivery complete; cloud deferred

- [decision] User chooses to use the installed desktop app and delivered Android APK locally while awaiting a billing-project quota increase. Preserve existing Google Drive Sync billing and all other projects. Backend deployment and live synchronization remain pending; no quota request has been submitted by this agent.
- [verification] Recheck installed macOS signature and APK presence; record the resumption steps in [8-2](plans/8-2-cloud-deployment.md).

## 2026-10-28 — Account-sync local integration and installation

- [integration] Fast-forward local main to `57fad2d`, including Google account sync and Flutter Android, while preserving all unrelated demo work. Remote main is unchanged.
- [android] Retrieve the account-enabled ARM64 review APK from successful CI run `40055668420`; verify GitHub’s artifact digest and the Android signature. Live syncing requires a configured Firebase/Cloud Run service.
- [install] TypeScript, 15 Node suites, 35 native tests and optimized build pass. Reinstall and launch macOS account-sync build; strict signature/full bundle hashes verify, all 55 task files unchanged. App, WebKit, settings and tasks backed up; [delivery record](plans/8-1-local-install-and-apk.md).
- [cloud] User authorizes a separate project and Google sign-in. Create `sticky-todo-20261028` and enable Firebase Google sign-in, register its Web app, create Singapore Firestore and deploy deny-all client rules; billing link rejected by Google’s billing-project quota. Await user’s resolution choice in [8-2](plans/8-2-cloud-deployment.md).

## 2026-10-24 — Android account integration verified

- [account] Connect Flutter to the shared Google browser handoff and Firebase REST session lifecycle, with secure credentials, foreground sync, explicit account binding and recoverable conflict choices. Validate all downloaded records before local changes; upload completed sessions before applying retained cloud history.
- [validation] Integrated phone analysis, all 44 tests, narrow/enlarged Account layouts and ARM64 debug APK signature checks pass. Test real documented custom-token/refresh response shapes, cancellation, old/new credential-write races, offline retries and malformed downloads. No live Firebase deployment or physical-device sign-in is claimed.

## 2026-10-24 — Google account and sync branch

- [account] Add system-browser Google sign-in through Firebase, one-time proof-bound handoff, optional per-folder syncing and account isolation.
- [sync] Add authenticated Cloud Run/Firestore records, strict payload allowlists, revisions/tombstones, offline three-way reconciliation and explicit per-day conflict review with recovery export. Preserve Markdown via native content checks and preimage backups. Sync completed focus history only after explicit opt-in.
- [validation] Merge main `4d78345`; TypeScript, frontend build, all 15 Node suites, 14 backend tests and 34 native tests pass in the account branch. Live Google/Firebase deployment and two-device acceptance remain pending. Compact 340px Account setup and failed-service containment checks pass. No cloud resources were created.

## 2026-10-24 — Android CI SDK bootstrap

- [ci] Explicitly request platform-tools, Android platforms 35/36 and build-tools 36.0.0 so `setup-android@v3` no longer requests the removed `tools` package. Keep license acceptance while suppressing its full text. Verify the action's official v3 input schema/parser and workflow YAML; app code and the verified APK are unchanged.

## 2026-10-24 — Diane phone protocol review

- [docs] Inspect Dear Diane's authenticated remote APIs and verify that its separate Todo companion router still rejects remote hosts through `local_only`. Replace the vague relay limitation with the exact protocol restriction, current desktop control omission and required backend work. Preserve Copy agent prompt; no runtime or Dear Diane changes.
- [validation] Apply the standard Dart formatter to existing phone source/tests so the exact CI formatting gate passes. Analyzer clean and all 22 tests pass; rebuild the standalone ARM64 debug APK from the final formatted source. The Diane review adds no runtime behavior or dependencies.

## 2026-10-24 — Flutter Android review branch

- [mobile] Add a native Flutter app with offline tasks, hierarchy, date/backlog/moves, finish promises, goals/routines, provider suggestions and validated planning, scoped Undo, album recommendations and reload-safe Focus.
- [mobile] Adapt the warm note to phone navigation, large touch targets, explicit drafts, note materials and a native orbital route. Add Android file import/export, secure API keys and a documented cross-platform sync seam.
- [validation] Flutter analysis is clean; all 22 domain/provider/phone tests plus optional visual capture pass. Inspect four phone screens, verify enlarged text, build ARM64 debug APK and verify its manifest/signature/native binary headers. Add Android review-build CI. Full feature matrix and desktop-specific boundaries are in `phone/README.md`; physical-device/provider acceptance remains pending.

## 2026-10-24 — Integrated review verification

- [validation] Combine planning and reliability fixes on main. All 14 Node suites, TypeScript, production build and 33 native Rust tests pass; planning/settings and task-interaction browser checks use production assets and synthetic data. Existing installed binaries remain at their published release until an update is built.

## 2026-10-24 — AI planning diagnostics

- [fix] Show native provider errors in Plan instead of replacing every string rejection with an AI-settings warning. Failed generation still leaves tasks unchanged.
- [ux] A successful connection test on an edited settings form explicitly asks the user to Save; fields remain stable while testing.
- [reliability] Extract answer text after Anthropic/Gemini reasoning blocks, reject empty/truncated responses, explain invalid JSON, bound HTTP requests, and truncate connection previews by Unicode characters.
- [security] Send Gemini API keys in the supported header and omit request URLs from network-error messages.
- [validation] TypeScript, production build, 13 Node suites, focused planning/settings browser checks, and 30 native Rust tests pass with synthetic data. No live AI credentials or installed app were used; no release tag was created.

## 2026-10-24 — Review reliability fixes

- [fix] Keep new captures and unrelated edits made during a task move. Save the destination before source removal, preserve both versions on a moved-task edit conflict, drain moves before navigation, and retry failed source cleanup without redispatching.
- [fix] Preserve unreadable goal data in a separate exact recovery copy before writing normalized state. Surface recovery and save failures; never overwrite a store that could not be read.
- [fix] Clean up native file-change listeners that register after disposal, contain registration errors, reopen closed parents when unfinished moved steps arrive, and retain focus in the outcome editor during suggestion requests.
- [validation] All 13 Node suites, full TypeScript, production build and production task-interaction browser regression pass. The added native tests await integration, tracked in [4-51](plans/4-51-review-reliability.md).

## 2026-10-23 — Verified release 2.1.15

- [release] Publish [v2.1.15](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.15) as latest with earlier-task promotion and optional glass materials. All platform builds and publication succeed; manifest/download URLs validate for four targets and all three update packages pass Ed25519 verification.
- [cleanup] Remove two merged worktrees, four stale registrations, five local merged branches and one remote merged branch. Restore the 19 unrelated demo/docs files with asset hashes and added documentation lines verified against backup.


## 2026-10-23 — Release 2.1.15

- [integration] Merge the approved earlier-to-Today drag and Paper/Frosted glass/Liquid glass materials into main. Prepare 2.1.15 for signed macOS, Windows and Linux publication; preserve unrelated demo work. Prune two clean merged worktrees, four stale registrations and five merged local branches. TypeScript, all 12 Node suites and production build pass.


## 2026-10-23 — Earlier tasks and materials preview

- [feature, review branch] Let earlier root tasks move into Today at the pointer drop position, with an empty-Today target, Escape cancellation, keyboard and direct Move support. Preserve trees, statuses, finish/deadline metadata and safe destination-first save/retry.
- [ui] Add Settings → Style with persistent Paper, Frosted glass and Liquid glass choices. Keep the opaque native window and flat readable rows, with no continuous motion or new dependencies.
- [validation] TypeScript, all 12 Node suites, pointer/keyboard reorder, compact Settings geometry and new material/promotion browser checks pass. Exact production shell checks and all five Settings sections pass. Optimized macOS build installed and launched locally as 2.1.14; strict signature and bundle hashes match, all 56 task-file hashes unchanged. App/state/tasks backed up at `sticky-todo-before-materials-5e70qvc2`. Feature branch only, no merge or publication.

## 2026-10-21 — Verified final release 2.1.14

- [release] Publish [v2.1.14](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.14) as latest with the approved checkbox size/equal spacing and all prior UI refinements. All platform builds and publication succeed. Public manifest/asset links validate for four updater targets; all three downloaded update packages pass Ed25519 signature checks.
- [install] Local 2.1.14 is installed and running; strict signature/bundle hashes verified and all 56 task-file hashes unchanged. Intermediate 2.1.12 and 2.1.13 remain available.

## 2026-10-21 — Equal task spacing and 2.1.14

- [ui] Equalize visible drag-dots/checkbox/title spacing to 8px for tasks (8.5px for steps), keep 24px nonoverlapping control targets, and align step entry with task text. Geometry checks cover compact/default roots and steps.
- [release] Prepare 2.1.14 for the follow-up requested during the 2.1.13 build.

## 2026-10-21 — Checkbox alignment and 2.1.13

- [ui] Match visible checkbox dimensions to the task/step title font (14px/13px), align to the first text line and preserve 24px click targets. Compact/default browser geometry and completion-click checks, TypeScript and frontend build pass.
- [release] Prepare 2.1.13 to include this requested follow-up after the already-running 2.1.12 build; preserve existing tags and make the final patch latest.

## 2026-10-21 — README demo refresh

- [docs] Refresh the README for the 2.1.12 interface, preserving capture/AI breakdown/tomorrow moves and day planning. Add outcomes/due dates, Star Focus and goals/settings walkthroughs with five GIFs and MP4 alternatives. All tasks are fictional; AI outputs are disclosed fixed samples.
- [tooling] Add `scripts/record-demos.cjs` and `demo/README.md` for isolated production-browser capture, using no installed-app data or live AI. Build, recording interactions/page-error checks, GIF dimensions/link checks and visual frame review pass. Keep temporary media ignored; no app behavior or release changes.

## 2026-10-21 — Release 2.1.12

- [release] Prepare 2.1.12 with reviewed task interactions, undo/save recovery, day planning, focus fixes, direct action icons, compact copy, startup reveal and stable Settings. Supersede 2.1.11 as latest so existing clients detect the update; publication verification pending.

## 2026-10-21 — UI refinement integration

- [integration] Fast-forward local main through `f8befcb` with the reviewed UI refinements, compact controls, startup reveal and stable Settings layout. All 12 Node suites and TypeScript checks pass; installed-build/source parity verified. Remove both UI-refinement worktrees and the merged local feature branch. Remote branches/releases unchanged.

## 2026-10-21 — Stable Settings layout

- [ui] Use one Settings navigation row with Storage, AI, Integrations and Updates. Keep the dialog height fixed within the viewport, with scrolling content and stationary header/footer. TypeScript and all-section geometry checks at compact/default/wide sizes pass. Reinstalled and launched locally; bundle/signature verified and all 56 task files unchanged.

## 2026-10-21 — Startup layout flash

- [fix] Keep the native window hidden until the React shell commits and has a paint opportunity, avoiding the separate startup-screen flash. Reveal once on the UI thread; retain a 1.5-second native fallback so frontend errors stay visible. No archive or integration dependency. TypeScript, all 28 native tests and isolated startup checks pass. Locally installed and launched; bundle/signature verified and 56 task-file hashes unchanged.

## 2026-10-21 — Compact controls follow-up

- [ui] Remove More and place Delete beside the other icons. Remove all Enter-to-add hints and duplicate title editing. Replace the global history checkbox with task-local Earlier steps; shorten the bottom-bar Plan label. Keep title keyboard/double-click editing, Enter submission and deletion Undo. Copy/Stop/Diane entries are no longer in the task row; outcome review and integration state remain intact. TypeScript/build, task/shell browser suites and history/routine checks pass. Locally installed and launched with verified bundle/signature; all 56 task files unchanged.

## 2026-10-21 — Step entry copy trim

- [ui] Remove “Enter to add” under the step input and its unused style. Enter still submits steps. Remove duplicate Edit title from More; double-click and Enter on the title still edit it.

## 2026-10-21 — Direct task actions

- [ux] Expose Focus, Add step, Suggest steps with AI and date-aware Move directly as icons with hover names and accessible labels. Use an ellipsis for remaining actions; preserve existing handlers and disabled states. TypeScript/build and compact browser interactions pass. Reinstalled and launched with verified bundle/signature and all 56 task files unchanged.

## 2026-10-21 — Feature branch local installation

- [install] Build and install `feat/ui-interaction-refinement` at `3fcad22` as local 2.1.11. All 12 Node suites, TypeScript and 28 native tests pass. Installed bundle matches build output and passes strict deep signing; app launches and all 56 task files remain unchanged. Back up prior app/native state/tasks; no merge or publication. See [4-44](plans/4-44-ui-interaction-refinement.md) for backup and remaining native acceptance boundaries.

## 2026-10-21 — UI Refinement Worktree

- [plan] Begin the authorized UI/interaction refinement on `feat/ui-interaction-refinement` from latest main. Scope and native acceptance boundaries are recorded in [4-44](plans/4-44-ui-interaction-refinement.md).

- [ux] Keep capture available from first launch; replace compact idle rails with named Goals/Focus entries and a visible active timer. Reduce header space, wrap footer controls, improve secondary text/focus/targets, and retain wide panels with a bounded provider selector.
- [ux] Group selected task actions as Focus / Add step / More, disclose step progress/next work, and keep manual step capture visible. Make AI outcomes explicit drafts, preserve unchanged/cancelled review state, stage date changes, and guard IME submission. Defer pointer-driven layout changes until the click lands.
- [reliability] Add targeted deletion/plan Undo with original tree/date/order/metadata, preservation of later edits and closure-aware restoration. Keep failed saves visible with Retry and retain the latest memory; block navigation/reload from discarding failed writes.
- [planning] Add chronological preview with explicit date/time/machines, Apply / Discard / Undo, strict response validation, stale-context guards and replacement of only unfinished generated blocks. Remove invented occupation/machine/time assumptions from native prompts.
- [focus] Repair shader declarations and growing route buffers; add construction/shader/context-loss SVG fallback and Try 3D again. Clean up renderer resources and avoid idle animation under reduced motion. Use functional session labels and keep session completion separate from task outcomes.
- [accessibility] Share modal keyboard containment, Escape and focus restoration across Settings, planning and Focus. Group Settings by purpose with optional advanced details; label manually reset reminders Routines and clarify other-date steps.
- [tests] Add portable production-browser fixtures and twelve-suite `npm test` release gate. Verify minimum/default/wide shell, text enlargement, task/goal edits, recovery/planning, pointer/keyboard reorder, Focus faults/retry and cleanup. Native compilation/installed acceptance and real-person usability review remain pending; no version bump, merge, publication or install.

## 2026-10-21

- [release] Publish [v2.1.11](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.11) as latest after successful macOS/Windows/Linux builds. Public updater manifest and URLs verify for all four targets; all three downloaded updater packages pass Ed25519 signature checks. Local 2.1.11 installed and launched with a rollback backup; all 56 task-file hashes unchanged.

- [release] Prepare v2.1.11 on main with finish promises, persistent deadlines, reversible AI suggestions, explicit completion review, compact goals and Star Focus reliability fixes. Signed publication and local install in progress.

- [ui] Simplify long-term and recurring goals to flat rows and one-line entry with Enter submission; remove large composer boxes, repeated empty text and Add buttons. Add keyboard editing, IME-safe submission and explicit-delete-only empty edits. Browser add/edit/cancel/complete/delete/reload checks pass.

- [ui] Match Outcome editing to inline title editing: replace the rounded double-outline box and resize grip with a single underline; keep text aligned.

- [install] Reinstall and launch Outcome/Due review build. TypeScript, urgency and both finish UI suites pass; strict signature and bundle hashes verified, all 56 task-file hashes unchanged.

- [ux] Use stable Outcome / Due rows for display and editing. Single-click selects; double-click or Enter edits titles. Selected empty outcomes show grey suggestions; unselected tasks retain saved details only.

- [install] Reinstall and launch the ghost-suggestion review build; set active/saved OpenRouter model to `deepseek/deepseek-v4.1-flash` after a successful live API check. Bundle/signature verified, all 56 task-file hashes unchanged. TypeScript, 27 native tests, and both finish UI suites pass.

- [ux] Replace blank finish editing with contextual grey suggestions: Tab accepts, typing overrides, clearing restores, Escape cancels. Use “What would be enough?” and “Enough:”. Simplify date selection to immediate save; keep scope/stop controls for overdue/review only.

- [maintenance] Retain the review feature branch in `.worktrees/finish-promises`; preserve the detached temporary build checkout after cross-volume worktree move proved unsupported.

- [feature, review branch] Add optional inline finish promises and deadlines, urgency badges, deadline history, bounded AI breakdown, explicit completion review, and stopped tasks. Preserve metadata through Markdown, date aggregation, carry-forward and prompt export. Full TypeScript checks, 27 native tests, and isolated 350px interaction/persistence checks pass; optimized review bundle locally installed and launched; strict signature and bundle hashes verified, all 56 task-file hashes unchanged. Feature remains on its separate branch.

- [fix] Restore full TypeScript checking, pass the missing atmosphere lighting angle, normalize archive retention, and type/guard Three.js textures. Completion, loading, rollover, calendar, and persistence checks pass.

- [docs] Cart optional local Codex/Claude Code execution and skill-based task editing by Codex/Claude Code/Diane for later discussion. No app changes or implementation plan; focus remains on task presentation and finishing.

## 2026-10-12

- [install] Build and locally install version 2.1.10 without the step-entry plus button. Back up the previous app, verify exact bundle checksums and strict deep signing, and relaunch the installed GUI. Task archive hashes remain unchanged. No public release change.

- [ui] Remove the plus button beside Add step. Keep the input in its existing aligned position, with Enter to submit and unchanged hover/focus/draft behavior. Source change; not yet published.

- [maintenance] At the user’s request, complete the backlog before 2026-10-12: 224 unfinished parents and 303 task-node status changes across 87 dates. Back up 27 weekly files first; revision-checked updates and re-extraction confirm zero older unfinished nodes, unchanged text/IDs, and unchanged current/future task statuses. No code or release change.

- [release] Publish [v2.1.10](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.10) as latest with fast Today loading, canonical history selection, and bounded carried-row rendering. All platform builds and publication pass; public latest updater manifest, asset URLs, downloads, and matching signature files verify.

- [release] Prepare 2.1.10 to replace 2.1.9 as latest, allowing installed clients to receive the loading fix.
- [fix] Show Today before history finishes, preserve edits during scans, bound stalled reads to eight seconds, and reuse pending scans on retry. Select canonical date sections using calendar source-file ownership instead of rendering repeated history from every weekly archive. Render carried work in batches of 40.
- [test] Frontend build, task-loading/persistence/calendar suites, 26 native tests, and browser delayed/stalled/10,000-task fixtures pass. Existing Star Focus type-check diagnostics remain. Read-only archive measurements confirmed repeated history was expanding the list from 297 canonical unfinished roots to 10,264 rows.

- [release] Publish [v2.1.9](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.9) with parent completion cascade and cumulative daily rollover. All three platform builds and publication pass; latest updater manifest, asset matching, download URLs, and matching signature files verify for all four targets.

- [release] Prepare 2.1.9 with completion cascade, cumulative daily rollover, and the aligned collapsible carried-task section. Add rollover regression coverage to release CI.

- [fix] Completing a parent recursively completes its editable subtasks. Reopening a step or adding unfinished steps reopens a completed parent.
- [feat] Today accumulates unfinished work from earlier saved dates under one horizontal, keyboard-accessible “Carried over” bar. Rows stay aligned with today's tasks and display “From yesterday” or the original ISO date. Edits preserve the original Markdown date, IDs, completed archive entries, and Diane receipt identity.
- [fix] An open Today view follows local midnight/resume; explicitly browsed dates remain selected. Flush pending edits before reload/date changes and ignore superseded loads. Partial archive reads report unavailable files while retaining readable work.
- [test] Completion, cumulative rollover, calendar boundaries/resume, save flushing, narrow-window browser interactions/persistence, and 25 native tests pass. Frontend production build passes; full TypeScript checking retains the 16 documented Star Focus errors. Source only, not released or installed.

## 2026-10-11

- [release] Publish [v2.1.8](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.8) with the default-off local Diane connection setting and grey unavailable controls. All platform builds and publication pass; public updater manifest, assets, and download URLs verify.

- [release] Prepare 2.1.8 with the default-off local Diane connection setting and grey unavailable controls.

- [ui] Add default-off “Connect to Dear Diane on this computer” in Settings with project/folder confirmation. Off hides task controls and stops handoff polling while preserving saved links; unavailable dispatch is grey. Credential-source preference remains separate. Frontend build, 24 native tests, and browser lifecycle/disabled-mode checks pass. Published in v2.1.8.

- [release] Publish [v2.1.7](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.7) with standalone-safe optional Diane integration. All platform builds and publication pass; public updater manifest, asset matching, and download URLs verify. Diane companion deployment remains separate.

- [release] Prepare 2.1.7 with optional Diane handoff and credential fallback while retaining standalone Todo operation. Frontend build and all six release suites pass. Separate Diane companion deployment remains pending.

- [merge] Reconcile the optional Diane task handoff and standalone hardening with the pre-existing credential fallback for Todo main. Preserve existing work in a checkpoint commit and safety snapshot; keep both native commands and style additions.
- [test] Combined production frontend build, all 24 native tests (including task CRUD/storage and credential-source fallback), and disconnected/malformed/stalled browser controls pass. Full TypeScript checking retains the same 16 known Star Focus errors. No app installation, restart, credential write, or user task-data migration.

- [fix] Enforce optional Diane integration: validate project/status responses and saved links before rendering; preserve unreadable links rather than overwriting them during failed polling.
- [test] Browser capture/edit/complete/delete/reload controls pass with absent, stalled, malformed and corrupt Diane data using fixture task persistence. Frontend build passes; native task storage unchanged. Existing Star Focus type errors remain.

## 2026-10-10

- [feat] Resolve Diane credentials natively before Todo fallback for matching standard OpenRouter/OpenAI/Moonshot endpoints. Add default-on preference, source status and connection-test support. Keep all existing keys, environment files, models and task data unchanged. No Keychain or Diane background service.
- [test] Add fixture-only source preservation, missing/corrupt source and endpoint isolation tests; frontend production build and 24 native tests pass. Full TypeScript check reports 16 pre-existing Star Focus errors, identical to the unchanged repository.

- [feat] Add immutable task dispatch to Diane, project/default inheritance, persistent session links, colored/shape status glyphs, result details, acknowledged Stop, and native Open in Diane. Follow-up remains in Diane; todo completion stays manual.
- [test] Frontend build, native check, synthetic browser lifecycle checks, and companion protocol tests pass. Add a separate development identifier/data directory. Source-only: installed apps and running sessions unchanged.

## 2026-10-08

- [release] Publish [v2.1.6](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.6) with 15-minute automatic update checks. All platform builds and publication pass; public updater manifest, uploaded assets, and download URLs verify.

- [release] Prepare 2.1.6 with 15-minute automatic update checks. Frontend build and six release suites pass.

- [updates] Shorten automatic checks and resume/online throttling from two hours to 15 minutes. Updated scheduling, lifecycle, persistence checks, and frontend build pass. Not yet published.

- [release] Publish [v2.1.5](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.5) with root-aligned task entry and no leading plus button. All platform builds and publication pass; public updater manifest, asset matching, and download URLs verify.

- [release] Prepare 2.1.5 with root-aligned task entry and no leading plus button; all six release regression suites pass.

- [ui] Remove the inline root-task composer’s plus button and align its box with the root checkbox column. Retain hover/focus reveal, visible drafts, and Enter submission. Frontend build and diff checks pass; not yet published.

## 2026-10-06

- [release] Publish [v2.1.4](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.4) with hover/focus-revealed top-level task entry. All platform builds and publication pass; the public updater manifest, uploaded assets, and download URLs verify.

## 2026-10-05

- [release] Prepare 2.1.4 with hover-revealed top-level task entry. Frontend build and all six release regression suites pass.

- [ui] Add a hover/focus-revealed Add task box below nonempty task lists, matching the transparent step-entry styling. Enter or plus creates a top-level task; Escape clears the draft.
- [checks] Frontend build passes. Full TypeScript checking remains blocked by existing Star Focus errors; this change is not yet published or installed.

- [release] Publish [v2.1.3](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.3) with automatic update checks, Settings/action dots, and hover step entry. All platform builds and publication pass. Public updater manifest and download URLs verify; the Mac archive matches its uploaded digest, passes signature verification, and rejects tampering.

- [release] Prepare 2.1.3 for user-authorized publication of automatic update checks, notification dots, and hover step entry.

- [updates] Check automatically on startup and every two hours, with throttled resume/online checks and silent background failures. Show a Settings dot and an install/restart action dot; installation remains manual.
- [ui] Reveal the empty Add step text and border only on hover or focus on fine-pointer devices. Preserve visible drafts, keyboard/plus entry, touch-device access, and the paper background.
- [checks] Automatic-update scheduling/lifecycle tests, updater persistence checks, frontend build, and compact browser interaction checks pass. Published in v2.1.3.

- [release] Publish [v2.1.2](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.2) with the integrated step-input background. All platform builds and automatic publication pass. Public latest.json and all download links verify; the public Mac updater archive matches its uploaded digest, passes signature verification, and rejects tampering.

- [release] Prepare 2.1.2 for the user-authorized background-fix release.

- [ui] Remove the lighter Add step field fill; retain the thin border over the existing paper background. Frontend build and diff checks pass. Published in v2.1.2.

- [checks] Public latest.json serves 2.1.1; all updater download URLs return HTTP 200. Public macOS archive signature verifies. Windows/Linux artifact signatures and uploaded digests match.
- [release] Publish [v2.1.1](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.1) after all platform builds pass. Verify uploaded updater digests and signatures, final asset URLs, universal Mac architecture, bundle version, and strict Mac code signature.
- [fix] Repair release validation to account for temporary draft asset URLs; validate canonical asset names before publication and actual URLs afterward, with regression coverage.

- [checks] Release regression scripts and all 21 native library tests pass for 2.1.1.
- [release] Prepare 2.1.1 for user-authorized publication through the signed GitHub updater workflow.

- [fix] Replace task handle HTML drag-and-drop with captured pointer gestures; explicitly focus clicked handles for keyboard movement, preserve parent groups, and cancel pending moves on Escape or lost capture.
- [checks] Real mouse and keyboard browser checks at 340px/460px verify task/step movement and saved payload order. Installed desktop behavior remains unverified; these changes are included in v2.1.1.
- [ui] Rename the tray and macOS menu action to “Toggle / Hide” as requested, retaining the visible platform shortcut.

- [ui] Keep a bordered Add step field visible beneath each editable task; Enter or plus submits, Escape clears, and the field stays ready for continued entry.
- [native] Show the platform toggle shortcut in tray and macOS app menus; give tray Quit a native Command-Q / Ctrl-Q accelerator.
- [checks] Frontend build, offline native check, and diff hygiene pass. Desktop visual verification and installed-app replacement remain unperformed.

## 2026-10-04

- [ui] Show only “Moved to tomorrow” (or the resolved destination) after moving a task or subtask. Omit the redundant description and empty paragraph. Frontend build and diff checks pass.

## 2026-10-03

- [delivery] Publish [v2.1.0](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.0) after all platform builds pass. Verify every public updater archive against the installed trust key and reject altered copies. Native Tauri download/signature verification passes; both Mac executables contain Intel and Apple Silicon slices and the bundle passes strict signature verification.

- [release] Normalize upload filenames before generating updater URLs, exclude internal Debian tarballs, and require every manifest URL to match a GitHub asset before publishing. Repair the first release manifest after the public download check caught GitHub’s filename normalization.

- [build] Build frontend assets and the companion task API for both Mac architectures before universal bundling; preserve dependency caches on failed builds. Add a manual workflow retry using the existing version tag so failed releases can be rebuilt without moving tags.

- [delivery] Install and relaunch updater-enabled version 2.1.0, verify signature and executable checksum, and push feature commit `a89605a`. The signing secret is configured; publication was subsequently approved and tag `v2.1.0` pushed.

- [updates] Add on-demand signed GitHub update checks, download/install progress, and restart controls in Settings. Drain pending task/native writes before installation, and block it while settings are unsaved or a focus session is active.
- [release] Prepare version 2.1.0 with a persistent updater trust key and a cross-platform signed-release workflow that publishes after complete manifest validation.
- [checks] Updater lifecycle and persistence checks, existing calendar/task checks, frontend build, native check, and signed macOS packaging pass. Repository-wide TypeScript checking still reports the documented pre-existing Star Focus errors.

- [release] Frontend/native builds and diff checks pass for the album sheet trim; reinstall, signature-check, checksum-verify, and relaunch version 2.0.4. Rollback: `/private/tmp/Sticky Todo.before-20261003-album-trim.app`.
- [albums] Remove the duplicate Work soundtrack heading and introductory description; show Albums for working followed directly by the album list.

- [release] Build, ad-hoc sign, signature-check, checksum-verify, reinstall, and relaunch version 2.0.4 with expanded task editing and atmosphere-based album recommendations. Preserve the previous app at `/private/tmp/Sticky Todo.before-20261003.app`.
- [checks] Native and frontend release builds pass, along with calendar rollover and nine task completion/persistence scenarios. Installed GUI remains running from `/Applications/Sticky Todo.app`.

- [checks] Album revision passes the frontend build and diff checks; the initial native check required an isolated Rust toolchain because no default was configured. Live model output has not been evaluated.
- [albums] Guide recommendations by concentration, energy, and listening atmosphere. Require musical explanations and mood cues, exclude task-word/topic matching, and label the sheet Albums for working.

- [checks] Frontend build, diff checks, and isolated component browser checks at 340px/460px pass for expanded editing, action isolation, wrapping, and read-only rows.

- [fix] Clicking the empty space after a task or subtask title now opens its editor. The input fills the available width up to the right-aligned action buttons; action clicks and historical read-only rows remain separate.

## 2026-09-23

- [release] Rebuild, signature-check, checksum-verify, reinstall, and relaunch version 2.0.4 with the live Today refresh; preserve the previous app as a temporary rollback bundle.

- [fix] Refresh local today at midnight and on window focus, visible-page return, and page restoration; preserve the selected date and show Go to today after rollover. Recheck at least every minute while timers run for clock/timezone changes.
- [tests] Pass calendar rollover/resume/navigation/cleanup regression checks and the frontend production build.

## 2026-09-22

- [delivery] Push automatic parent completion commit `7184669` to `origin/main` after destination-specific user approval.

- [tests] Pass nine task completion/persistence regression scenarios and the frontend/native production builds.
- [release] Signature-check, checksum-verify, reinstall, and relaunch version 2.0.4 with automatic parent completion; preserve the prior bundle as a temporary rollback copy.

- [behavior] Automatically complete a parent when its final unfinished current-day subtask is marked done, saving both statuses together. Historical steps do not block completion; manual status cycling remains available.

## 2026-09-15

- [configuration] Switch the installed app’s active OpenRouter model and saved profile to `deepseek/deepseek-v4.1-flash` using the existing key; verify a minimal live response (`OK`) and relaunch the app. No source or default-provider change.

- [maintenance] Remove user-approved Rust debug and release build output, reducing the repository from approximately 8.9 GiB to 214 MiB. Preserve rollback bundles, dependencies, task recovery material, and the installed app; verify both build directories are absent.

## 2026-08-22

- [frontend] Pin every atomic task and subtask action group to the right edge while retaining final-line packing and whole-group fallback wrapping.
- [tests] Verify exact right-edge alignment, containment, short and long text, subtasks, fallback rows, and edit mode in real-browser checks at `460px` and `340px`.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch version 2.0.4 with right-aligned task actions; retain the prior bundle as a temporary rollback copy.

## 2026-08-21

- [frontend] Flow each task or subtask icon group into available space after the final text fragment, while keeping the group atomic and text-aligned when it must wrap.
- [accessibility] Preserve click editing and add Enter/Space keyboard activation to the inline task label after replacing the old full-row text button.
- [tests] Pass the frontend production build and real-browser layout checks at the `460px` default and `340px` minimum, including short, wrapped, very long, subtask, and keyboard-edit states.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch version 2.0.4 with the inline action flow; retain the previous bundle as a temporary rollback copy.

## 2026-08-20

- [frontend] Replace task-row text actions with compact Breakdown, Copy, Delete, Push, and terminal Focus icons; give subtasks the same Copy/Delete/Push/Focus vocabulary.
- [frontend] Move manual step entry below each task group and keep the plus control aligned to the parent checkbox regardless of subtask count.
- [behavior] Copy full tasks with all current steps, or copy one selected step while retaining its parent task as the execution objective.
- [native] Carry individual subtasks forward beneath their parent task, merging later siblings into the existing destination parent instead of creating loose top-level tasks.
- [tests] Add parent-merge regression coverage and verify the 460px action order, subtask Focus, structured copy, carry payload, and add-step alignment in an isolated browser session.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch version 2.0.4 with the new icon actions and structured subtask carry-forward behavior.
- [frontend] Add compact drag handles for reordering top-level tasks and current-day subtasks, with scoped drop targets and precise insertion feedback.
- [accessibility] Let keyboard users move the focused task or subtask handle with Arrow Up and Arrow Down.
- [persistence] Save reordered arrays through the existing debounced Markdown path without changing the archive schema or native bridge.
- [tests] Pass the frontend production build and isolated 460px browser verification for pointer drag, keyboard movement, and persisted order.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch version 2.0.4; retain the previous app as a temporary rollback bundle.
- [docs] Complete plan `4-14-task-and-subtask-reordering` and document the new core task interaction.

## 2026-08-19

- [frontend] Remove the visible task Copy and composer Paste controls so ordinary clipboard work does not add more chrome to the compact task layout.
- [native] Add macOS Edit-menu Copy and Paste responders for standard Command-C and Command-V behavior, and drop general clipboard-read permission while retaining prompt export.
- [release] Rebuild, signature-check, reinstall, and relaunch version 2.0.4; verify enabled native Copy/Paste commands and retain the previous app as a temporary rollback bundle.
- [provider] Add Codex as a first-class background provider that reuses the local ChatGPT-authenticated CLI instead of requiring an OpenAI API key.
- [native] Run Codex requests non-interactively in a fresh temporary directory with ephemeral sessions, read-only sandboxing, no approvals, ignored user/project execution rules, empty stdin, and a three-minute timeout.
- [frontend] Give Codex a provider-specific settings state with executable-path auto-detection, an optional model override, no API-key field, login-status testing, and normal quick-provider switching.
- [tests] Verify the installed Codex login through a live isolated probe, add executable-resolution and prompt-boundary coverage, and pass all 20 native tests plus the frontend production build.
- [release] Rebuild and reinstall version 2.0.4, activate Codex with its default model, preserve the prior Moonshot profile and rollback copies, and confirm the installed GUI is running with the existing ChatGPT login.
- [frontend] Add an `Albums` action beside day planning that turns the visible date's task text, status, and current-day steps into a four-album work soundtrack through the configured AI provider.
- [frontend] Present album picks in a compact paper-toned sheet with task-mode cues, loading skeletons, regenerate, close, Escape dismissal, and responsive wrapping at the 460px baseline.
- [native] Add the structured `llm_recommend_albums` Tauri command while keeping recommendation results ephemeral and out of the Markdown and app-state stores.
- [build] Pin Cargo's default run target and Tauri's main bundle name to `todo-sticky` so the sibling `sticky-todo-api` CLI cannot be packaged or renamed as the macOS application executable.
- [release] Build, ad-hoc seal, checksum-verify, reinstall, and relaunch the corrected macOS app bundle from `/Applications/Sticky Todo.app`, retaining the previous bundle in a temporary rollback backup.
- [docs] Complete plan `4-12-task-aware-album-recommendations` and document the new UI, bridge contract, privacy boundary, and user-facing feature.

## 2026-08-17

- [frontend] Replace the similar step controls with distinct icon-only actions: a plus adds one manual step, while a branching hierarchy breaks a task into AI-generated steps; hover text and accessible names retain the full action labels.
- [docs] Record the completed task-step action clarity follow-up in plan `4-11` and the user-facing feature summary.

## 2026-08-16

- [native] Add a shared task API for date/range extraction plus nested task creation, editing, and deletion, with persistent Markdown-backed IDs and optional stale-write revision checks.
- [tooling] Add the `sticky-todo-api` JSON CLI and `npm run task-api --` entry point with saved knowledge-base path discovery for reusable Codex skills and other local agents.
- [frontend] Expose the same task API through typed Tauri bridge calls without changing the existing task-list workflow.
- [docs] Document the agent-facing CRUD contract, safe extract-before-mutate workflow, and completed plan `4-10-agent-task-api`.
- [data] Back up the 53-file local knowledge-base task archive, recover the missing `2026-02-23` weekly file with checksum verification, and keep the unresolved `2026-03-09` File Provider placeholder out of the merge until its contents are available.
- [diagnostics] Confirm that normal and isolated Star Focus stores have no retained missions, legacy/current WebKit goal stores have no goal items, and the oldest local Time Machine snapshot contains only the same cloud-only March placeholder.
- [frontend] Stabilize the date header with fixed arrow columns, a centered flexible date slot, and symmetrical chevron spacing so changing date lengths no longer shift navigation controls.
- [release] Rebuild, install, and relaunch the macOS app; verify short, medium, and longest-formatted English date labels against the production styles.
- [native] Detect macOS `SF_DATALESS` task archives before reads or read-before-write mutations, preventing File Provider placeholders from blocking indefinitely or being treated as empty data.
- [frontend] Replace the endless cloud-download spinner with a concise Dropbox availability error, disabled task creation, and an explicit Retry action.
- [native] Move initial markdown archive reads onto Tauri's blocking worker pool so a cloud-only File Provider placeholder cannot freeze native window painting.
- [frontend] Show a dedicated archive-loading state and disable task creation until initial task data is available.
- [native] Replace the unsupported transparent macOS window path with an explicit opaque sticky-paper window/WebView background.
- [frontend] Add a visible boot surface, sanitized local boot-stage diagnostic, and React recovery boundary so startup failures cannot remain an unexplained white window.
- [diagnostics] Confirm the existing task archive is intact but `dataless`, with Dropbox/File Provider reporting a requested yet incomplete download and a prior cancellation error.

## 2026-08-10

- [frontend] Add per-task and per-step `Copy` actions that write portable Markdown checklists plus `Prompt` actions that create execution-ready agent briefs without calling an AI provider.
- [frontend] Add a quiet `Paste` action beside New Task that reads plain text or copied checklists and recreates their hierarchy as unchecked work.
- [native] Add Tauri's official clipboard manager with plain-text read/write permissions only.
- [frontend] Widen the compact task-action wrap breakpoint so the default 460px shell preserves task text width after the new handoff controls are added.
- [native] Fix missing-data launches on macOS by resolving task and app-state roots from the signed-in account instead of a caller-overridden `HOME` environment.
- [native] Add account-home precedence and stable task/app-data path tests, rebuild and install the repaired bundle, and confirm the normal store is used while the isolated store remains untouched.
- [frontend] Fit the collapsed Goals `REPEAT` metric with a slightly wider measure, tighter tracking, and centered non-wrapping label text.
- [frontend] Replace the misleading generic empty state on past/future dates with date-aware guidance and a direct `Go to today` action.
- [native] Confirm the active markdown archive is intact and add regression coverage for loading current tasks and subtasks from a multi-date file.
- [frontend] Add a compact action-bar AI provider selector that switches configured providers in one action and routes unconfigured choices directly into setup.
- [settings] Preserve a separate API base, key, and model profile for each provider while migrating the existing active configuration without data loss.
- [frontend] Centralize provider labels, presets, configured-state checks, and switching behavior so the quick selector and Settings stay synchronized.
- [frontend] Add OpenRouter as a first-class AI provider with the canonical API base, Kimi K3 preset, routed-model suggestions, and OpenRouter-specific API-key guidance.
- [native] Extend the OpenAI-compatible adapter with OpenRouter attribution headers, legacy base-URL inference, trailing-slash normalization, and temperature `1.0` for routed Kimi model slugs.
- [native] Add focused coverage for OpenRouter inference, request URL and headers, provider/base detection, and Kimi versus non-Kimi temperature behavior.
- [frontend] Make the task arrow carry work from any past date directly to local today, while today moves to tomorrow and future dates move one day forward.
- [frontend] Give task and subtask arrows destination-aware tooltips, accessible names, and success feedback driven by the same centralized date rule.
- [docs] Complete plan `4-2-smart-task-carry-forward` and update the core workflow documentation.

## 2026-08-02

- [frontend] Rebuild the expanded Star Focus surface as responsive Focus Mode: one dominant orbital view, one task-first Flight Deck, compact controls before the map, and quieter travel-log/settings bands.
- [frontend] Add a deterministic Solar Route from Earth through the Moon, Venus, Mars, and Saturn, with every completed focus session advancing one named travel leg without changing native persistence.
- [frontend] Surface the next destination in the collapsed rail, expanded Mission Control, orbital HUD, completed-session summary, and travel log.
- [frontend] Replace square Three.js star and dust points with radial alpha-masked sprites so close particles no longer render as white blocks.
- [docs] Complete plan `1-44-star-focus-solar-route-layout-pass` and document the Focus Mode route and responsive hierarchy.
- [native] Position fresh app launches at the top-right of the current display work area with a Retina-aware 16px margin, then show and focus the window from Tauri's ready event.
- [native] Add focused placement tests for primary and left-side monitor coordinates, rebuild the macOS app-only bundle, seal it locally, replace the installed app, and relaunch it.
- [docs] Complete plan `4-1-top-right-launch-placement` and document the new launch behavior and native lifecycle boundary.
- [frontend] Replace the cramped 380px baseline with a ready-to-use 460px shell, one-time collapsed-rail migration, compact overlay panels, and responsive populated-task action wrapping.
- [frontend] Add native resize hit zones on every frameless edge and corner, including a visible bottom-right grip and explicit Tauri resize permission.
- [frontend] Move task capture below the date header, add an actionable empty state, repair the unreachable add-step path, improve date/filter labels, and add accessible names plus reduced-motion handling.
- [frontend] Add visible success/error feedback for AI planning, AI breakdown, and move-to-tomorrow actions; restore optimistic task state when a move fails.
- [frontend] Clarify first-run setup so users can start without AI, while keeping provider setup available for breakdown and planning.
- [docs] Add the product/design baseline, complete plan `4-ready-shell-and-ux-path-pass`, and record the core workflow audit in `docs/ux-review.md`.

## 2026-04-24

- [native] Make Moonshot Kimi the default LLM configuration with `https://api.moonshot.ai/v1`, `kimi-k2.6`, and temperature `1.0` for Kimi/Moonshot OpenAI-compatible calls.
- [frontend] Add a Moonshot (Kimi) provider preset in Settings and update the first-run defaults to `kimi-k2.6`.
- [docs] Add plan `3-kimi-moonshot-default-provider` and update the README/environment examples for the new default provider.

## 2026-04-20

- [frontend] Improve the true 3D shadow path by giving cloud shells and Saturn's rings masked shadow materials, tightening the solar shadow-map settings, and easing back the older ring-shadow overlay so local shadow interaction feels less approximate.
- [docs] Close plan `1-43-star-focus-3d-shadow-interaction-pass` and update the tracking docs for the new 3D shadow-interaction slice.
- [frontend] Deepen the true 3D sun treatment with structured flare sprites and a restrained illuminated scatter veil through the inner system so the star feels more like an active light source than a bright sphere.
- [docs] Close plan `1-42-star-focus-3d-solar-scatter-pass` and update the tracking docs for the new 3D solar-scatter slice.
- [frontend] Deepen the true 3D Tracking Station background with layered far/near nebula sprites and broad dust-haze veils through the system plane so the planets sit in a richer environment instead of clean empty space.
- [docs] Close plan `1-41-star-focus-3d-background-depth-pass` and update the tracking docs for the new 3D background-depth slice.
- [frontend] Replace the flat front atmosphere layer in the true 3D Tracking Station renderer with a shader-driven haze shell that reacts to day, terminator, night, and limb angle so Earth, Venus, Mars, and the outer atmosphere feel less like uniform overlays.
- [docs] Close plan `1-40-star-focus-3d-atmosphere-shell-depth-pass` and update the tracking docs for the new 3D atmosphere-shell slice.
- [frontend] Replace the flat Earth/Venus cloud-shell material in the true 3D Tracking Station renderer with a shader-driven shell that carries darker night-side clouds, brighter terminator color, and restrained silver-lining scatter tied to the sun and camera angle.
- [docs] Close plan `1-39-star-focus-3d-cloud-shell-scattering-pass` and update the tracking docs for the new 3D cloud-shell slice.
- [frontend] Add cloud-shadow coupling to the true 3D Tracking Station renderer by projecting Earth and Venus cloud masks back onto the lit surface, keeping the shadows synchronized with the cloud shells, and slightly retuning cloud emissive lift so the layered planets read more like one lighting system.
- [docs] Close plan `1-38-star-focus-3d-cloud-shadow-coupling-pass` and update the tracking docs for the new 3D cloud-shadow slice.
- [frontend] Add more optical richness to the true 3D Tracking Station renderer by separating atmosphere day/terminator/night color and replacing Saturn's flat glow band with a light/view-responsive ring-scattering pass.
- [docs] Close plan `1-37-star-focus-3d-scattering-pass` and update the tracking docs for the new 3D scattering slice.
- [frontend] Add clearer planetary phase behavior to the true 3D Tracking Station renderer with restrained crescent/rim overlays on the inner bodies and the Moon so the lit shapes read more like phased bodies than evenly shaded spheres.
- [docs] Close plan `1-36-star-focus-3d-phase-rim-pass` and update the tracking docs for the new 3D phase-rim slice.
- [frontend] Add Earth-Moon eclipse/transit interaction to the true 3D Tracking Station renderer with a moon-shadow cue on Earth and lunar-eclipse shading on the Moon so the pair feels more physically linked.
- [docs] Close plan `1-35-star-focus-3d-eclipse-and-transit-pass` and update the tracking docs for the new 3D eclipse-and-transit slice.
- [frontend] Add reflected-light cues to the true 3D Tracking Station renderer with an Earth ocean-glint pass and a subtle Moon Earthshine fill so the Earth-Moon pair feels less like isolated assets under one light.
- [docs] Close plan `1-34-star-focus-3d-reflected-light-pass` and update the tracking docs for the new 3D reflected-light slice.
- [frontend] Add more local 3D realism with an Earth dark-side light pass, a Saturn ring-shadow overlay, and light-aware shader wiring so the planets feel less like uniformly lit spheres.
- [docs] Close plan `1-33-star-focus-3d-occultation-and-night-detail-pass` and update the tracking docs for the new 3D local-detail slice.
- [frontend] Push the true 3D Tracking Station renderer further with sun-biased atmosphere glow, stronger sun/view-responsive Saturn ring lighting, and layered starfield depth so the system feels less like a polished diagram floating in empty space.
- [docs] Close plan `1-32-star-focus-3d-solar-lighting-and-depth-pass` and update the tracking docs for the new 3D solar-lighting-and-depth slice.
- [frontend] Deepen the true 3D Tracking Station renderer again with fresnel-style atmosphere glow, shadow-enabled lighting, alpha-tested ring occlusion, and view-angle-tuned Saturn ring brightness so the scene reads more like a lit system than a clean diagram.
- [docs] Close plan `1-31-star-focus-3d-atmosphere-and-shadow-pass` and update the tracking docs for the new 3D atmosphere-and-shadow slice.
- [frontend] Deepen the true 3D Tracking Station renderer with layered surface, bump, and roughness materials, separate cloud and atmosphere shells, textured Saturn rings, and phase-tuned scene cleanup so the bodies read less like first-pass procedural spheres.
- [docs] Close plan `1-30-star-focus-3d-material-realism-pass` and update the tracking docs for the new 3D realism slice.
- [frontend] Start the first true 3D Star Focus renderer by adding a lazy-loaded Three.js Tracking Station orbital scene with real meshes, orbital camera movement, dynamic lighting, procedural planet materials, archive markers, and a live mission craft path while keeping the sidebar on the lighter projected SVG map.
- [docs] Close plan `1-29-star-focus-true-3d-tracking-foundation` and record the new true-3D Tracking Station boundary in the tracking docs.
- [frontend] Tighten the projected planets with zero-slip weather breathing, stronger limb/detail falloff, and lower cloud-band contrast so the bodies read more like spheres than painted discs.
- [docs] Close plan `1-28-star-focus-spherical-falloff-pass` and record the new spherical-read refinement in the tracking docs.
- [frontend] Tighten Star Focus weather-layer motion so cloud and band groups stay visually locked to the planet discs, replacing the obvious sliding drift with a smaller centered shimmer.
- [docs] Close plan `1-27-star-focus-weather-layer-lock-pass` and record the weather-layer coherence fix in the tracking docs.
- [frontend] Make the shared Star Focus orbital scene respond to mission phase with calmer idle/orbit states, hotter ignition/heating atmosphere, phase-tuned rim and ring intensity, and subtle motion-speed shifts instead of adding more HUD chrome.
- [docs] Close plan `1-26-star-focus-phase-responsive-material-pass` and record the new phase-responsive material refinement in the tracking docs.
- [frontend] Add finer disc-level microtextures with ocean-current lines, cloud-deck swirls, dune traces, crater-ridge accents, and micro-bands so the projected planets keep more character when zoomed in.
- [docs] Close plan `1-25-star-focus-disc-microtexture-pass` and record the new disc-level microtexture refinement in the tracking docs.
- [frontend] Improve local orbital-scene depth with richer Saturn ring breakup, thickness variation, and layered atmospheric scattering falloff on the lit edges of the planets.
- [docs] Close plan `1-24-star-focus-ring-structure-and-scattering-pass` and record the new ring-and-scattering refinement in the tracking docs.
- [frontend] Make projected-planet lighting follow the scene geometry more believably with sun-driven gradients, dynamic night-side shading, camera-aware rim light, and Saturn ring occlusion that follows the projected ring path.
- [docs] Close plan `1-23-star-focus-lighting-and-ring-occlusion-pass` and record the new lighting-and-occlusion refinement in the tracking docs.
- [frontend] Add restrained planetary motion, outer atmosphere shells, aurora/weather drift, and stronger Saturn ring-shadow treatment so the projected Star Focus scene feels more alive.
- [docs] Close plan `1-22-star-focus-planet-motion-and-atmosphere-pass` and record the latest motion-and-atmosphere refinement in the tracking docs.
- [frontend] Deepen the projected Star Focus planet rendering with finer-grained surface layers, stronger lighting cues, richer moon detail, and a more refined Saturn ring treatment.
- [docs] Close plan `1-21-star-focus-planet-detail-pass` and record the latest fine-grained planetary-detail pass in the tracking docs.
- [frontend] Rebuild the shared Star Focus orbital view as a projected 3D scene with orbit-camera drag, depth-sorted celestial bodies, and stronger spatial layering in Tracking Station and Mission Control.
- [docs] Close plan `1-20-star-focus-projected-3d-orbital-pass` and record the new projected-3D scene boundary in the tracking docs.
- [frontend] Push the shared Star Focus scene further toward a cinematic Tracking Station finish with deeper atmosphere, stronger framing, and richer planetary surface detail.
- [docs] Close plan `1-19-star-focus-tracking-station-cinematic-polish` and record the latest cinematic polish pass in the tracking docs.
- [frontend] Improve the shared Star Focus orbital map with richer planetary surface detail, deeper space atmosphere, and a more premium overlay-first finish.
- [docs] Close plan `1-18-star-focus-orbital-map-materials-pass` and record the new materials-and-atmosphere pass in the tracking docs.
- [frontend] Remove the sidebar map HUD and camera dock so Mission Control stays quieter while Tracking Station remains the rich orbital-view surface.
- [docs] Close plan `1-17-star-focus-sidebar-map-simplification` and record the overlay-first map-chrome split in the tracking docs.
- [frontend] Declutter the shared Star Focus solar-system scene by reducing simultaneous bodies, archive labels, guide intensity, and sidebar control density while keeping the new realism direction.
- [docs] Close plan `1-16-star-focus-orbital-map-declutter-pass` and record the calmer visual-density split between Mission Control and Tracking Station.
- [frontend] Upgrade the shared Star Focus map into a compressed solar-system scene with distinct planets, a moon, an asteroid belt, and a ringed outer world while keeping mission markers and camera controls intact.
- [docs] Close plan `1-15-star-focus-compressed-solar-system-pass` and record the new celestial-body pass in the tracking docs.
- [frontend] Add direct Star Focus map camera controls with drag-to-pan, wheel/button zoom, and above/level/below pseudo-3D tilt in both Mission Control and Tracking Station.
- [docs] Close plan `1-14-star-focus-orbital-map-camera-controls` and record the lightweight camera-control boundary in the tracking docs.
- [frontend] Replace the Star Focus orbital map with a shared telemetry-style scene that adds a live trajectory, labeled archive markers, and a stronger sense of mission progress in both Mission Control and Tracking Station.
- [docs] Close plan `1-13-star-focus-orbital-map-realism-pass` and record the new shared orbital-scene component in the tracking docs.
- [frontend] Add dev-only Star Focus mission time-scale controls so local debugging can slow down or fast-forward the live track without changing production behavior.
- [docs] Close plan `2-1-dev-mode-star-focus-time-scale` and record the new dev-only mission-speed controls in the tracking docs.
- [frontend] Add a development-only task debug tray with sample-task seeding, sample-pack seeding, clear-day, and reload actions for faster local testing.
- [docs] Close plan `2-dev-mode-task-debug-panel` and record the dev-only debug surface in the tracking docs.
- [frontend] Remove duplicate secondary Star Focus labels and rebalance captions so the rail and overlay feel quieter without changing the layout model.
- [docs] Close plan `1-12` and record the Star Focus hierarchy-trim pass in the tracking docs.
- [frontend] Remove more explanatory Star Focus copy so Mission Control and Tracking Station rely on labels, metrics, and actions instead of help text.
- [docs] Close plan `1-11` and record the more guided, less descriptive Star Focus presentation in the tracking docs.
- [frontend] Trim Star Focus copy density in Mission Control and Tracking Station, and remove redundant overlay help text while keeping the existing visual direction.
- [docs] Close plan `1-10` and record the new copy-light Star Focus presentation in the tracking docs.
- [docs] Close plans `1-8` and `1-9`, record the no-markdown-sync boundary, and move the remaining Star Focus retention questions back to backlog.
- [frontend] Add configurable local Star Focus archive-retention presets in Tracking Station and trim retained mission history through the shared Star Focus state hook.
- [native] Persist the Star Focus archive-retention limit in native local state, sanitize unsupported values, and re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-7`, create follow-up plan `1-8`, and update the repo tracking/docs around the new archive-retention decision.
- [frontend] Expand the local Star Focus archive to 12 missions, add a simple `Recent` vs `Full` Tracking Station archive view, and clarify archive-retention copy.
- [frontend] Fix Star Focus mission numbering so vehicle codes and orbit indices continue advancing after the retained archive reaches its cap.
- [native] Enforce the same 12-mission Star Focus archive cap in the native persistence layer and re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-6`, create follow-up plan `1-7`, and update the repo tracking/docs around the compact-rail and archive-retention decisions.
- [frontend] Keep the sticky-note window compact by default with both side rails collapsed for new users and compact-mode rail exclusivity when one side expands.
- [frontend] Auto-open Tracking Station once for restored active sessions when the mission rail is collapsed, and add clearer armed/restored/completed state banners plus explicit local archive-retention copy.
- [native] Re-run `cargo +stable check --manifest-path src-tauri/Cargo.toml` after the compact/layout polish slice.
- [docs] Close plans `1-4` and `1-5`, create follow-up plan `1-6`, and update the repo tracking/docs around the new Tracking Station model.
- [frontend] Add the first Star Focus Tracking Station overlay with a larger starmap, mirrored session controls, full local mission archive, and maintenance actions.
- [frontend] Let Focus selection open Tracking Station when the rail is collapsed and default new Star Focus state to a compact right-rail baseline.
- [native] Align the native Star Focus default state with the compact-by-default right Mission Control rail.
- [native] Validate the new Star Focus persistence path with `cargo +stable check --manifest-path src-tauri/Cargo.toml`.
- [docs] Close plan `1-3` after native verification and create follow-up plan `1-4` for the overlay reassessment track.
- [native] Add Tauri-backed Star Focus persistence commands and migrate Mission Control state off browser-only storage into native app data.
- [frontend] Add orbit-history maintenance controls and wire Mission Control state saves through the new native persistence path.
- [docs] Move plan `1-3` to in-progress and note that native verification remains pending because this environment had to provision Rust first.
- [frontend] Add pause/resume, reload-safe active sessions, clearer cancel semantics, and stronger phase-driven Mission Control visuals.
- [docs] Close plan `1-2`, create follow-up plan `1-3`, and defer expanded-overlay work behind persistence hardening.
- [frontend] Add the first Star Focus Mission Control shell with a right sidebar, local mission/session state, task handoff, and a sidebar-only starmap view.
- [docs] Close plan `1-1`, create follow-up plan `1-2`, and move the active Star Focus track to session controls plus animation polish.
- [docs] Lock the Star Focus v1 design decisions and create the first implementation sub-plan for a frontend-only Mission Control shell.
- [docs] Initialize the dev documentation scaffold and tracking files.
- [docs] Tailor the new tracking docs to the Sticky Todo codebase and seed the Star Focus design-planning workstream.
