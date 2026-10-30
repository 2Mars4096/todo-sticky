# 8-6: Sync progress and historical checklist compatibility

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Show sync stage/count/elapsed time on desktop and Android and resolve the observed history-upload blockage.

## Tasks
- [x] Inspect request timing and validate local history read-only without printing task contents.
- [x] Add measured stage/count/elapsed/waiting progress, including the desktop apply overlay.
- [x] Preserve legacy blank checklist titles across backend/clients and test their round trip.
- [x] Bound desktop animation-frame waits so hidden windows cannot stall sync.
- [x] Verify regressions and visual states, deploy compatibility fix, reinstall Mac and deliver Android +5.

## Findings
- Recent logs show repeated 422 day uploads; server request latency is below four seconds. Local read-only validation finds blank checklist titles rejected by the cloud schema, despite being valid stored Markdown. Preserve these entries rather than deleting them or altering local archives.
- Progress is indeterminate during account/history/page loading, then counts processed records only after validation/persistence. No invented ETA or synthetic percentage during unknown-length work.
- A native write is never abandoned with a timeout; prolonged stages remain visible. Replace frame-only UI waits with a bounded fallback, not concurrent writes.

## Verification and delivery
- Read-only validation covers 137 unique dates across 4,407 archive sections. Former blank-title failures are gone; source files were not modified by validation.
- Backend revision `sticky-todo-sync-00010-62k` deployed; 15 backend tests pass. After deployment, observed 19 successful PUTs and no rejected PUTs on that revision.
- Desktop tests exercise the real hook with a delayed acknowledgement, failure-stage/date reporting and hidden-frame recovery. Phone tests cover acknowledged counts, failed-upload counts, blank-title downloads and 360px/150% text progress. Final checks with 8-7: TypeScript, 18 Node suites, Flutter analysis and 50 tests pass.
- Mac progress build installed with 56 task files/settings unchanged, then superseded by the Account workspace build in 8-7. Final phone release is `release/todo-sticky.apk`, version 2.1.15+5 / 2005, 19.43 MB, same key.
