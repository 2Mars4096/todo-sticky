# 17-1: Original app sync over Diane canonical records

**Parent:** [17](17-diane-shared-apps.md)
**Status:** in-progress
**Goal:** Preserve standalone Todo UI and offline sync semantics while sharing Diane identity, canonical data and quota authority.

## Tasks
- [x] Export product-owned `/v1/sync` adapter over canonical task/goal/routine/focus records, without a second task payload store.
- [x] Preserve legacy IDs/date occurrences, schema-1 metadata protection, integer CAS, idempotent mutations and migration revision seeding.
- [ ] Integrate central sign-in endpoints and verified legacy-owner aliases without changing existing local notes or silently switching service defaults.
- [ ] Support standalone browser transport/cache with original UI.
- [ ] Verify desktop/web/phone tests, original-key Android build and iOS Flutter scaffold/build where available.
- [ ] Publish product artifacts/contracts for parent integration; leave production migration/deployment to parent.

## Decisions
- Parent owns shared identity broker and live migration/cutover. Shared service origin: `https://dear-diane-202610-api.web.app`; existing selected/default service is not changed before confirmed migration.
- Auth uses central Firebase ID tokens, `appId=todo`, and parent-verified legacy owner mappings.
- Sync metadata may retain revision/hash/original-ID aliases and container presence, but payload bodies remain canonical plugin records.
- Source references stay product-owned; no runtime import from the original production service or secrets bundled into releases.

## Backend checkpoint
- Product wheel `diane-todo-plugin==0.1.2` built; 12 canonical-sync tests pass against host SQLite and FastAPI fixtures.
- Migration seed preserves matching preimported source IDs and original legacy integer revisions. Cross-surface edits advance sync revision; stale whole-day replacements refuse. No production seed/deployment performed here.
