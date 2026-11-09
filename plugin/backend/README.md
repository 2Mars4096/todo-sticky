# Todo backend package

`diane-todo-plugin` owns the embedded Todo compatibility adapter and standalone sync projection. Diane installs a pinned wheel; it never imports a product checkout at runtime. Host React/identity/data/Universal Cell contracts remain in Diane.

- `diane.plugins.todo_compat`: original embedded frontend API over canonical records.
- `diane.plugins.todo_sync`: original standalone `/v1/sync` protocol over the same records, with integer revisions and hash-only sync metadata.
- `diane.plugins.todo_sync_protocol`: frozen original wire validators; `backend/` is the legacy deployment retained for rollback, not a second new data store.

Host registration: `build_sync_router(plugin_service, auth, companion_service, before_write=None)`. It exposes GET `/v1/health`, GET `/v1/sync?after=&pageSize=200&schemaVersion=2`, PUT `/v1/sync/{key}`. Central configuration and browser sign-in routes belong to Diane's connected-app broker. Responses containing records are no-store.

Migration API: `CanonicalTodoSync(plugin_service).seed_records(owner, legacy_records, source_id='sticky-todo-personal-migration-2026')`. Supply immutable original envelopes (key, revision, payload, deleted, updatedAt, mutationId); goal records seed first. Exact repeat seeds acknowledge without reverting later canonical edits. Divergent existing records or existing unrelated sync metadata refuse. Parent must complete/quiesce migration before exposing sync to clients. No migration route is exposed to public clients.

A normal atomic write is limited to 180 changed canonical records to keep record/outbox updates below Firestore transaction limits. Unchanged records are not rewritten. Larger migrations must use bounded canonical import batches followed by matching revision seeds. The adapter never resets client revisions or discards offline edits.
