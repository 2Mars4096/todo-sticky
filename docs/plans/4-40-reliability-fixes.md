# 4-40: Reliability Fixes

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Fix reproduced Star Focus errors before the finish workflow.

## Tasks
- [x] Reproduce full type-check failures and fix underlying lighting argument, narrowing, compatible array indexing, and retention normalization.
- [x] Install matching Three.js types and guard nullable texture maps.
- [x] Run full type checking, frontend build, completion, rollover, loading, calendar, and persistence checks.
- [x] Inspect existing pointer reorder implementation; retain the already-shipped fix and record native verification limit.

## Notes
- Installed macOS pointer interaction remains unverified: no desktop interaction tool is available in this session. Browser/source evidence must not be represented as native acceptance.
- Existing step-entry changes were preserved in a separate baseline commit.
