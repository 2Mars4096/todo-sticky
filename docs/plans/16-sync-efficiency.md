# 16: Sync Efficiency And Interaction

**Status:** completed
**Goal:** Remove redundant sync storage/scan work and resume promptly after editing while preserving conflict and durability checks.

## Tasks
- [x] Trace both clients and identify repeated no-op writes, full scans and list reloads.
- [x] Batch unchanged acknowledgements and checkpoint only actual metadata changes.
- [x] Use targeted desktop date checks and one post-download reload; use scoped Android record snapshots.
- [x] Shorten debounce to 900ms, resume after editing, and count actual changes in progress.
- [x] Verify conflicts, schema migration, concurrent edits, save recovery and synthetic efficiency cases.
- [x] Rebuild/install Mac and deliver signed Android +14. Mac installation completed with [15-3](15-3-mac-project-planning.md).

## Decisions
- Client-only change; existing backend/schema, access rules, conflict resolution, backup and idempotent mutation ordering remain intact.
- Do not increase Android's 20-record cloud page size: the 16MB response guard must accommodate large permitted records. This pass targets local disk, scans and UI work, not claims of reduced network transfer.
- Acknowledgements that are already current require no local write. Changed acknowledgement baselines save together before actual transfers; pending upload identities still persist before network writes and acknowledgements remain durable after each transfer.
- Desktop downloads check only the affected date (or current goals/focus record) and retain native compare-before-write. List reload happens once after a download batch, including partial failures. Metadata migration has its own bounded refresh before uploads.
- Active nonempty draft editors defer sync; empty capture focus does not. Finishing editing schedules a retry. Desktop overlapping triggers queue one bounded follow-up. No startup dependency on accounts is introduced.
- Progress totals exclude unchanged acknowledgements. Actual conflict choices still require explicit review and retain both versions.

## Verification
- 21 Node suites and TypeScript pass; Android analyzer and 100 tests pass.
- Synthetic desktop checks: 200 equal records require one full scan, zero metadata writes and zero reloads. A 20-date download uses one full scan, 20 targeted reads and one reload, versus repeated full snapshots/reloads previously. Concurrent changes abort the affected apply while refreshing already applied dates.
- Android: 200 already-acknowledged records cause no notebook saves; 41 equal first-link records checkpoint once instead of once per record. Existing account/conflict/goal-migration/retry tests pass.
- Fix the desktop test harness's missing URLSearchParams global and assert that the held upload is actually reached, preventing a pending test promise from silently ending verification early.

- Editing-resume regression confirms leaving a draft starts a sync attempt after the 900ms debounce without waiting for the minute poll. Production Account UI check passes at 340px; its fixture now opens the Connection disclosure when the production build has a prefilled URL.

## Delivery
- Android production +14 / 2014 built at `release/todo-sticky.apk`, 19,753,663 bytes; original-key v2 signature and 16 KB alignment verified. SHA-256 `9427c191bc427af151382bc7c0d8bfa43cf19da131567dc9b78524f874d910b6`.
- Mac optimized bundle built and signed successfully. The normal Quit request stalled before backup/replacement. Cancelled only the installer and its osascript child; the running user app/data remain untouched. Installation awaits the user closing the app normally after saving edits.

- 2026-11-02: The Mac project build includes these sync changes and is installed/running. Bounded normal Quit/shortcut handling succeeded before backup and replacement; all 56 task files/settings unchanged. The earlier installation blocker is resolved.
