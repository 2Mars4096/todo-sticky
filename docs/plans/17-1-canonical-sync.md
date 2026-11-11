# 17-1: Original app sync over Diane canonical records

**Parent:** [17](17-diane-shared-apps.md)
**Status:** in-progress
**Goal:** Preserve standalone Todo UI and offline sync semantics while sharing Diane identity, canonical data and quota authority.

## Tasks
- [x] Export product-owned `/v1/sync` adapter over canonical task/goal/routine/focus records, without a second task payload store.
- [x] Preserve legacy IDs/date occurrences, schema-1 metadata protection, integer CAS, idempotent mutations and migration revision seeding.
- [x] Integrate central sign-in endpoints and issuer-bound legacy-owner aliases, retaining original baselines/pending edits and explicit direct AI choices.
- [x] Support central browser authentication transport and conditional snapshot cache in the original UI.
- [ ] Complete independent browser local-task I/O (original React app still requires Tauri; deliberately outside this bounded cutover).
- [x] Verify desktop/phone regression suites and web type/build checks; stage original-key shared Android build20 (split version2020).
- [x] Skip iOS implementation/build at the user’s explicit request.
- [x] Resolve canonical task links to exact dated original tasks without automatic execution.
- [x] Stage shared Mac app candidate without replacing the installed original.
- [ ] Perform paired installed-app acceptance after parent release gate.
- [ ] Publish product artifacts/contracts for parent integration; leave production migration/deployment to parent.

## Decisions
- Parent owns shared identity broker and live migration/cutover. Shared service origin: `https://dear-diane-202610-api.web.app`; existing selected/default service is not changed before confirmed migration.
- Auth uses central Firebase ID tokens, `appId=todo`, and parent-verified legacy owner mappings.
- Sync metadata may retain revision/hash/original-ID aliases and container presence, but payload bodies remain canonical plugin records.
- Source references stay product-owned; no runtime import from the original production service or secrets bundled into releases.

## Backend checkpoint
- Product wheel `diane-todo-plugin==0.1.4` built; 17 canonical-sync tests pass against host SQLite and FastAPI fixtures.
- Migration seed preserves matching preimported source IDs and original legacy integer revisions. Cross-surface edits advance sync revision; stale whole-day replacements refuse. No production seed/deployment performed here.

## Client checkpoint (2026-11-10)
- Node: all 29 suites; TypeScript: clean; Flutter: 137 passed, one pre-existing skip; Rust: 42 passed. Additional canonical task-link lookup/sync regression passes (138 total phone tests including this added case).
- Android candidate: `release/todo-sticky-shared-2.1.16-20.apk`, original package and signer, shared origin and cutover flag enabled. Not installed or published; original APK preserved.
- Cutover flags are explicit release-time opt-ins. They migrate only the known original service or an empty selection; custom services are retained. Issuer-bound owner verification is required before copying local baseline/pending metadata.
- Shared agent calls use the signed-in Diane compatibility endpoint (Universal Cell and shared metering), with stable per-request idempotency identity. Existing explicit direct providers remain direct; no silent fallback.
- Parent owns production migration, broker/deployment readiness, cross-app real-device acceptance and authorization to release. No live data was changed by this product work.

## Plugin 0.1.4 — direct controls and quiet preparation
- [x] Flatten footer into Import & backup, Scheduling machines, and AI settings peers. Save machines is enabled only for changed drafts; failed saves retain edits.
- [x] On active/enabled Todo, debounce task changes for 1s, flush pending saves, then POST /api/sticky-todo/preparations/refresh with current scope. Quiet refresh repeats after60s; loading/account changes/unmount fence or cancel requests. No task execution.
- [x] Strict host React19/SDK TypeScript passes; 360px fixture under complete host styles verifies flat controls, dirty/save/failure behavior and AI settings event. Lifecycle test covers disabled/loading, flush ordering, account changes during flush and abort.
- Preparation backend and per-task presentation are owned by Diane; no live model calls were made during these checks. Standalone apps and APKs were not rebuilt for this plugin change.

- [x] Plugin0.1.5 CSS-only footer alignment: equal14px markers plus6px gap, direct summaries only; narrow full-host-style label positions all x72px. Native Enter/Space disclosure behavior and save/retry checks pass.

- [x] Plugin0.1.6 capability entry fix: character-by-character browser typing `gpu, batch` stays intact through failure/retry, saves `["gpu","batch"]`, and omits the local draft field from persisted schema. Strict host typing and narrow footer checks pass.

## 2026-11-10 — Shared-service Android rebuild

- Delivered **2.1.16+24 (Android versionCode 2024)** to `todo-sticky-latest.apk` in this repository root; replaced the prior root APK only.
- Original signing certificate verified against the prior release; package/version and copied SHA-256 checked. SHA-256: `d2f545603bcf3312ab309ce3f833307ff40ffb810487254cc866b97391a0e26a`.
- Built with Flutter3.47.8, cached dependencies, ARM64 release and shared Diane origin. Signing material stays outside Git.
- Shared Google popup fix is live in Diane API `diane-api-00019-vil`; public Google account-entry verified. Phone account completion remains user acceptance.

Build command (temporary source copy): `flutter build apk --release --no-pub --target-platform android-arm64 --split-per-abi --dart-define=SYNC_SERVER_URL=https://dear-diane-202610-api.web.app --dart-define=DIANE_SHARED_CUTOVER=true`. `flutter pub get --offline` succeeded. `apksigner verify --print-certs` and `aapt dump badging` verified original signer/package/version; source hashes matched repository at delivery.

The already-started test attempt passed122 with one skip but could not load sync_merge_test.dart because its sibling `tests/fixtures/sync-merge.json` was absent from the temporary phone-only copy. No product failure is inferred and no full-suite pass is claimed. Per the user's minimal-check instruction it was not rerun; release build and artifact checks are the delivery gate.

## November 10 — Sync control
- [x] Replace folder-sync checkbox and Sync now with one Sync action; retain owner binding before enabling sync.
- [x] All30 Node suites pass; the manual-sync regression verifies enabling a paused folder and syncing from the same click. Frontend production build passes.
- [x] Build and ad-hoc-sign the staged Mac .app; strict deep signature verification passes. User requested leaving the installed app untouched. Updater signing is not performed (no release private key); no publication.

- [x] Subsequent user request: reinstall and reopen current Sticky Todo and Diane builds. Installed signature/process checks pass; profiles/data untouched, rollback copies retained under `/Users/lizhi/.codex-accounts/app/.tmp/desktop-before-reinstall-20261110-203046`.

## November 10 — Shared Mac installation
- [x] User explicitly authorized shared-backend Mac installation. Build with `STICKY_SHARED_CUTOVER=1 VITE_SYNC_SERVER_URL=https://dear-diane-202610-api.web.app npm run build -- --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'`.
- [x] Install and relaunch `/Applications/Sticky Todo.app` (2.1.16), verify deep signature/bundle equality, runtime shared origin and cutover marker. Preserve all56 task files; only requested native config change is connectDiane=true.
- [x] Include reviewed two-stage local Diane handoff from plan6, plus the independently prepared single Sync control. 31 Node suites, TypeScript and browser handoff checks pass.
- Backup and verification receipt: `output/shared-mac-delivery/macos-verification.json`; original bundle/profile/tasks/WebKit retained at `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-shared-backend-install-20261110-203058`.
- Google sign-in, real cross-device sync and live model/session acceptance remain pending; no public release, backend mutation or Diane reinstall.

## November10 — Requested reinstall, publication and login repair
- [x] Rebuild/reinstall original Mac app with shared flags, verify runtime backend, signed bundle and all56 unchanged task files. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-shared-backend-install-20261110-203430`.
- [x] Reproduce and fix the shared API cold-instance token-mint error in Diane: completion and exchange may hit different processes. All27 backend sign-in regressions pass; narrow two-file image deployed as diane-api-00021-gup with100% traffic. Prior00019-vil remains available for rollback.
- [x] Separate Todo commits for guarded Sync, editable local setup/session handoff, and delivery documentation. Backend auth fix lives in Diane commit a9508536.
- [ ] User verifies a fresh Google sign-in after deployment; an earlier failed consumed proof cannot be retried.
