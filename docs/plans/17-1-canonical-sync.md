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
