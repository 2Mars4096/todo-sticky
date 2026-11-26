# 26-1: Personal notebook first

**Parent:** [26-final-release-review](26-final-release-review.md)
**Status:** completed
**Goal:** Keep personal planning immediate and expose collaboration choices only where needed.

## Tasks
- [x] Audit notebook, Account, Settings, Integrations and assignment entry on web/shared Mac and phones.
- [x] Put personal Sync/recovery before optional assignments; name the disclosure by its action.
- [x] Remove the personal-only destination selector when no shared membership exists.
- [x] Choose the sole local task implicitly without selecting a shared destination or sending anything.
- [x] Preserve explicit multiple-task selection, stale-selection recovery, account scoping and task-specific assignment entry.
- [x] Verify context counts, account guards, long labels, nested navigation and existing regressions.

## Decisions

The notebook already works immediately without signing in, choosing a workspace or starting Shiprite. Its task trees, dates, goals and personal projects remain local-first. No notebook/store migration or identity mapping changes are needed.

Account now leads with Sync and recovery. Optional collaboration is labeled **Assign in Shiprite**. Phone task-specific assignment entry stays near the top and expanded; web task-specific entry opens, scrolls into view and receives focus. The phone disclosure retains its context subtitle; the web disclosure now names a saved shared selection even while collapsed, so a previous shared AI scope is not silently hidden.

When there are no editable shared destinations and no saved selection, hide the dropdown containing only Personal account. The permission explanation remains inside the explicitly opened assignment disclosure. A stale or unavailable saved destination still has a selector and a return to Personal account; never silently rewrite it. Malformed stored IDs now expose Clear selection on web, matching phone recovery, rather than leaving the user trapped behind an error.

Exactly one local task needs no task dropdown; its title and steps appear before the optional recipient field. Nested tasks remain independently assignable, so a parent with a step offers both choices. A stale explicit requested task never falls back to another task. Multiple valid tasks retain their selector. Choosing a shared destination remains explicit even with one membership: Personal account is still a meaningful alternative and the selection also scopes AI usage. Names, IDs, receipt validation, owner checks, sync, conflict and sharing logic are preserved.

## Verification

- Focused Node checks: no/one/multiple local tasks, valid/stale explicit task, no/one/multiple memberships, no automatic scope writes, and per-user saved context isolation.
- Phone context tests: no network membership discovery until the disclosure opens; no/one/two destinations never auto-select shared scope; one local task is implicit after explicit shared choice; long destination names fit 320px; returning to Personal account removes outbound controls. Existing Android/iPhone assignment tests still cover nested-step choice, retries, stable IDs and receipts; shared-account and navigation tests pass.
- Browser production assets: 18 signed-in states over English 320px and German 1100px, covering zero/one/two destinations, personal-first geometry, explicit shared choice and return to personal, long labels and no accidental assignment writes. Includes invalid-selection recovery. Zero missing states or panel overflow. Reproduce with `python3 scripts/interface-review/personal-account.py`.
- Screenshots: `output/interface-five/personal-account/{en,de}-{0,1,2}.png` in `/Volumes/data/codex-tmp/dockit-personal-review-20261126`.
- Native Mac and signed-device acceptance remain the P0 gates in the parent review. This pass verifies shared React rendering and Flutter widget platform variants, not installed-client or live-service changes.

- Full regression: 34 Node suites and 176 Flutter tests pass (one optional screenshot test skipped); production frontend build and TypeScript pass.

## Remaining work

Authenticated production sign-in, multi-device sync/conflicts, real Shiprite handoff and exact signed native distribution acceptance remain unchanged release gates. Workspace terminology inside optional collaboration continues to mean a real shared authorization/billing boundary, not a prerequisite for personal use.
