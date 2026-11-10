# 13: Goal planning and mobile drag

**Status:** completed
**Goal:** Move Earlier work into Today from its grip, and turn long-term goals into linked daily work with truthful progress.

## Tasks

- [x] 1. Review the current Android workflow, persistence, Markdown and sync contracts.
- [x] 2. Add a handle before Earlier-task checkboxes, Today drop targets and edge scrolling while preserving existing daily reordering.
- [x] 3. Add manual and explicitly requested AI goal plans; review suggestions before adding them.
- [x] 4. Schedule selected steps for Today or a chosen date with stable task identities and goal provenance.
- [x] 5. Derive plan completion from the actual linked daily tasks; expose goal filters in Progress.
- [x] 6. Preserve metadata in JSON, Markdown, native desktop transforms and cloud protocol validation.
- [x] 7. Verify persistence, moves, goal identity collisions, legacy sync upgrades and the phone workflow at normal/enlarged text.
- [x] 8. Review the phone screens and build/sign a separately installable preview APK.
- [x] 9. Commit and push the verified source to main, and deliver the APK in Dropbox.
- [x] 10. Deploy the compatible Cloud Run backend; completed in [13-1](13-goal-planning-and-mobile-drag.md#13-1-production-deployment).
- [x] 11. Build and verify the original-key production update, rebuild/install Mac; completed in [13-1](13-goal-planning-and-mobile-drag.md#13-1-production-deployment).

## Decisions

- The user's 2026-10-31 request explicitly activates goal linking previously held in plan 10, authorizes implementation/publication on main, and requests Dropbox APK delivery.
- Keep the phone UI flat: clear goal titles, an editable step list, selected scheduling and one main scheduling action. Use accessible icon controls/tooltips; retain consequential deletion warnings. No introductory paragraphs, slogans or stacked explanatory cards.
- `GoalItem.plan` stores up to 200 `{id, text}` entries. Daily `Task.goalId` and `goalStepId` carry provenance. Scheduling uses the plan step ID as the stable task ID; repeated scheduling finds work on any date instead of creating duplicates.
- Plan entries do not store copied completion or dates. A step is complete only if all of its dated instances are done; stopped work is separate. The goal's own completion remains deliberate.
- Adding nested work, moving tasks and day planning retain goal association. Same-titled tasks belonging to different goals never merge by title. Removing a plan entry keeps already scheduled work and its goal association.
- Updated clients negotiate payload schema 2. The service projects schema 1 for old readers and preserves hidden metadata on matching legacy writes. A client refuses to sync goal-bearing records to an old service rather than dropping metadata. Unchanged-revision legacy baselines migrate metadata without replacing local edits.
- Android is the requested interaction surface. Desktop changes preserve the shared data contract; no desktop app installation is part of this delivery.

## Original preview environment constraints

- This execution environment has no original Android release keystore. The existing signed APK remains untouched. An explicit `stickyReviewBuild` opt-in creates optimized `io.github.twomars4096.sticky_todo.preview` with a separate label and signing identity; ordinary production release builds still fail without the real key.
- The preview's browser sign-in uses manual return, preventing the production app from receiving the preview handoff.
- The existing live sync service currently advertises only protocol schema 1 without the new payload capability. Authenticated Google Cloud deployment credentials are not available here. Source and tests will be prepared; new goal data stays local until the backend update is deployed.
- Widget/codec/protocol verification is distinct from physical-phone, live-provider and real Google account acceptance.

## Verification

- Flutter: formatting clean, analyzer reports no issues, 86 tests passed with one existing opt-in screenshot test skipped. Goal flow and AI proposal review also passed with real-font screenshots at 360 px and 100%/150% text, including a simulated keyboard inset.
- Drag tests cover empty/header/row targets, insertion around hidden completed tasks, full task-tree persistence, cancellation and scrolling beyond the source row.
- Data tests cover repeat-safe selected scheduling, save failure/retry, actual completion after date moves, split parent instances, same-title goals, stale proposals, legacy IDs, Markdown round trips and sync upgrade/downgrade safeguards.
- Shared checks: 20 Node suites, TypeScript check, frontend production build, 19 backend tests and 16 native tests using the actual Markdown/file-storage/task-API modules. Full Tauri packaging was not part of this Android delivery.

## Android artifact

- Filename: `todo-sticky-preview-2.1.15-9.apk`; version `2.1.15`, ARM64 split version code `2009`, minimum Android API 24, target API 36.
- Package/label: `io.github.twomars4096.sticky_todo.preview` / **Sticky Todo Preview**. Release optimization, `debuggable=false`, separate Android debug signing certificate; it installs alongside production.
- Size: 19,622,467 bytes. SHA-256: `87b6f0f10a05d5c32f099b87bf7a70f42ade0363069cad4e55e38a0d7c8cafc0`.
- APK v2 signature, ZIP integrity and 16 KB alignment verified. All 43 Android/Dart build input hashes matched after the final build. Existing production APK was not replaced. Physical installation was not tested here.
- Dropbox upload completed at `/projects/todo-sticky/release/todo-sticky-preview-2.1.15-9.apk`; returned size matches the verified local artifact. Implementation and preview delivery are complete; this plan remains open for the authenticated backend deployment and same-key production update above.


## Production completion — 2026-11-01

The local Mac environment has authenticated deployment access and the original release key. [13-1](13-goal-planning-and-mobile-drag.md#13-1-production-deployment) supersedes the preview-only constraints above: backend schema-2 support is live on revision `sticky-todo-sync-00012-z9w`, Mac is rebuilt/installed with data preserved, and `release/todo-sticky.apk` is the original-key production 2.1.15+9 update (19.62 MB). Existing preview artifacts remain separate and unchanged.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="13-1-production-deployment"></a>

## 13-1: Goal Planning Production Deployment

**Goal:** Deploy the compatible backend and deliver verified production Mac and Android builds using the existing configuration and signing key.

### Tasks
- [x] Verify incoming source, local credentials/signing availability and regression checks.
- [x] Deploy the backend and verify live schema-2 capability and authentication boundaries.
- [x] Build/install Mac with a backup, signature verification and data-preservation checks.
- [x] Build the production Android package with the original key; verify package, version and update compatibility.
- [x] Record delivery evidence and update parent tracking.

### Decisions
- User explicitly requests deployment and rebuilding after pulling ba07999.
- Preserve existing Cloud Run environment/IAM and use the dedicated Sticky Todo project/service in Singapore. Prior revision: sticky-todo-sync-00011-jbv.
- The local original Android key is available. Build production 2.1.15+9 (2009), not the separately signed preview package. Preserve the existing production APK before replacement.
- Local checks pass: 19 backend tests, 20 Node suites, TypeScript, Flutter formatting/analyzer and 86 Flutter tests. No live user notes are needed for verification.

### Delivery Evidence
- Cloud Run revision `sticky-todo-sync-00012-z9w` serves 100% of traffic. Public config verifies `goalPlanning:true`, payload schemas `[1,2]`; health passes and anonymous/invalid-token sync requests remain rejected. Environment, service account, memory/CPU, timeout, concurrency and scaling limits match the prior service. Sign-in JavaScript matches source. No user records were accessed for verification.
- Mac: optimized build and all 40 native tests pass; production paragraph/editing browser check passes at 340/460/1000px. Installed exact signed bundle at `/Applications/Sticky Todo.app`, launched, and all 56 task files/native settings remain unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-goal-schema-install-20261101-052603`.
- Android: original-key production package `io.github.twomars4096.sticky_todo`, 2.1.15+9 / versionCode 2009. Delivery: `release/todo-sticky.apk`, 19,622,447 bytes (19.62 MB), SHA-256 `de5233b8ee9d7f4af68d10220b07c17c89477c5e6a0ad92c9385c4466fb7b387`. V2 signature and 16 KB alignment pass; certificate SHA-256 remains `1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`.
- Dedicated emulator update from versionCode 2007 succeeds and launches. Its synthetic notebook remains byte-identical, with tasks/goals preserved. No physical phone or actual account sign-in was needed for this verification.
- Machine-readable service, build-source hashes, APK and Mac reports live under ignored `output/goal-planning-delivery/`. Previous production APK preserved there. No release tag or public installer publication.
