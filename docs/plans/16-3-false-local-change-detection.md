# 16-3: False Local Change Detection

**Parent:** [16-sync-efficiency](16-sync-efficiency.md)
**Status:** completed
**Goal:** Receive cloud dates consistently and retry genuine local changes on both clients without falsely blaming user edits.

## Tasks
- [x] Reproduce the reported November 7 read mismatch without modifying user data.
- [x] Make canonical single-date extraction match canonical history for absent, empty and duplicate sections.
- [x] Use neutral bounded automatic retry for actual concurrent local changes on Mac and phone.
- [x] Verify phone missing/empty date consistency and automatic-update races.
- [x] Verify native extraction and real-hook races; rebuild/reinstall Mac with the footer correction and deliver a new original-key APK.

## Decisions
- Canonical date requests return only actual sections and keep the first matching section. Default agent/API extraction retains its existing synthetic empty-date response.
- Never remove compare-before-write protection. A genuine local race gets one prompt automatic retry, then the normal periodic checks; it is not evidence that the user edited anything.
- Read-only live diagnosis prints only counts/representation differences, never task text or credentials.

## Evidence
- Installed CLI on 2026-11-08: November 7 has zero actual sections in its calendar owner, but targeted extraction returns one synthetic empty day. The two unchanged reads compare differently in the sync hook, producing the screenshot's false error.
- 41 native tests, 26 Node suites and TypeScript pass; 124 Flutter tests and analysis pass. New checks preserve real concurrent edits, retain independent automatic work on retry, keep the native stale-write guard and stop repeated races from causing a rapid retry loop.
- Read-only account metadata check confirms sync remains enabled and November 7 has an acknowledged revision with no pending mutation. Default CLI still intentionally synthesizes an absent date; the canonical read contract is verified separately by native regressions.
- Final combined Mac build reinstalled with data preserved; original-key APK 2.1.16+18 delivered. Typography, recovery clarification, hashes and rollback receipt are in [4-54](4-54-text-emphasis-consistency.md).
