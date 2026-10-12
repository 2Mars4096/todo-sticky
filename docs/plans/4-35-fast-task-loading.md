# 4-35: Fast Task Loading

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Show today's tasks promptly and keep repeated historical archives from overwhelming the carried-task list.

## Tasks
- [x] 1. Measure local archive reads and identify repeated historical sections.
- [x] 2. Load Today before history, preserve edits during background loading, and bound stalled reads.
- [x] 3. Select canonical historical sections using calendar source-file rules and limit initial carried-row rendering.
- [x] 4. Test delayed/stalled scans, concurrent edits, retries, stale results, and duplicate archive ownership.
- [x] 5. Verify native tests and frontend build; update documentation.

## Decisions
- User archive inspected read-only: 54 files, approximately 1.7 MB, 4,400 returned sections across 130 distinct dates.
- Broad extraction projected 10,264 unfinished roots; canonical calendar ownership reduces this to 297.
- Today renders before the history scan finishes. Carried work renders in batches of 40.
- Stalled reads become recoverable after eight seconds. Retrying a pending archive scan reuses that request.
- No automatic edits to user task archives.

## Validation
- Frontend build, five task/persistence/calendar suites, and 26 native tests pass.
- Browser fixtures verify delayed/stalled history, edits during loading, and 10,000-task pagination (40 rows initially, 80 after Show more).
- Existing 16 Star Focus TypeScript diagnostics remain; no new diagnostics.
- Publication tracked in [4-36-publish-2-1-10](4-36-publish-2-1-10.md).
