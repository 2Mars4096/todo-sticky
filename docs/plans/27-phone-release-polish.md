# 27: Phone release review, data safety and tactile notebook

**Status:** in-progress
**Goal:** Decide whether the Dockit iPhone and Android app can go to early access, fix the release blockers found, and give the notebook a distinctive, responsive feel without changing its workflows.

## Tasks
- [x] 1. Review the phone app end to end on current `main` (41a5b33)
  - [x] 1-1. Source review of persistence, sync, editing, goals and linkage
  - [x] 1-2. Rendered screens at 1.0× and 1.5× text, iPhone simulator launch
  - [x] 1-3. Reddit and vendor-forum pitfalls for to-do apps, mapped to Dockit
  - [x] 1-4. Zilo editing and sync patterns compared with Dockit
- [x] 2. Fix data-safety and editing blockers (see Changes)
- [x] 3. Visual, motion and feedback upgrade on the phone notebook
- [x] 4. Tests for each fix; rendered and installed checks
- [ ] 5. Exercise the upgraded build by touch on a simulator and a physical phone (needs simulator access or a device)
- [ ] 6. P0 items below that need production services or cross-client changes

## Verdict

- **Early access (personal, phone):** ready after this branch merges, with the P0 cross-client items below disclosed. Capture, editing, steps, dated lists, Earlier tasks, goals, routines, day planning, Focus and local persistence work together in tests and renders.
- **Public release:** not yet. Before this branch, a failed load could be overwritten, long text could make the notebook unreadable or stop sync, and restoring a backup could delete newer cloud days. Those are fixed here. The remaining public gates are the existing production identity/sync/device gates in [plan 26](26-final-release-review.md#p0--before-public-release) plus the cross-client items in P0 below.
- **Framework:** the core mechanisms exist. No new module is needed for scope. The gaps are links between existing mechanisms (routine ↔ task, assignment status ↔ task, goal progress ↔ linked tasks), not missing subsystems.

## Changes

### Data safety (blockers)
- `StickyStore.changed()` no longer persists while the notebook is unloaded or failed to load. Previously any Settings change, deep link or shared-account cutover wrote empty defaults over `sticky-todo.json`, and the next save replaced the backup too.
- Input limits match the sync contract: task text ≤ 5,000 characters and steps ≤ 12 levels at capture, edit, step add and checklist import. The loader allowed 20,000 / 32 and sync 5,000 / 12, so accepted content could stop every later sync.
- Focus history labels are single-line (`focusTaskLabel`), including missions already stored, so a multi-line task no longer blocks sync for all records.
- Restore keeps account settings but clears sync baselines and pending mutations. The next sync downloads newer cloud days and shows differences as conflicts instead of pushing deletions to every device. Dialog copy updated.
- Recovery conflict copies are capped at 30; the Focus slider saves once per drag instead of on every tick.

### Editing
- Edit sheet asks **Discard your changes?** (Keep editing / Discard) on Back, scrim or Cancel when edited; drag-to-dismiss is off for the editor. Save is disabled with an inline message when the title is empty, and stays open with an error if the task moved or is too long.
- Completing, stopping or reopening shows an Undo receipt. Undo restores every status in the affected tree, so an accidental tap on a parent no longer wipes its steps. Reopening a fully finished parent reopens its latest step (it previously snapped back to done).
- A visible Edit action sits beside Move; double tap and the ⋯ menu remain.
- Steps reorder with the same grip as tasks. Hidden finished steps are skipped by drag and by screen-reader Move up/down.

### Visual, motion and feedback
Direction: *the working note, written with ink*. Motion confirms a state change and nothing else; all of it collapses with reduced motion.
- **Desk-calendar header:** a date stamp (month, day) beside Today/weekday; one line at 1.5× text where the old three-line date broke the row. Days turn with a 220 ms directional slide and a selection haptic.
- **Ink strike:** finishing a task draws a slightly rising pen stroke across each rendered line (280 ms, ease-out-quart); reopening lifts it. Check icons settle in.
- **Fresh ink:** a newly captured task is washed amber for about a second, with a light haptic.
- **Undo receipt:** an ink-dark pill above the footer for 6 s; it no longer pushes the list down.
- **Status row:** sync state (signed-in only) and a progress ring with the day's count.
- **Material:** paper grain on the Paper material, fading tab changes, rounded icon set, neutral Earlier tasks (no alarm badge), the drawn transparent tray in the empty state and drawer.
- Readable, locale-aware dates replace stored ISO keys in Search, Progress, routines, project plans, step history, deadline history and assignments.

## Icon guidance
- One family: Material rounded. Outlined for idle destinations, filled for the selected one.
- Icon-only only where meaning is conventional (search, back, chevrons, edit, more, eye). Plan keeps its label; music and Progress keep tooltips and accessible names.
- 48 dp targets everywhere except the drag grips (24 dp wide, full row height); widening them would move every row. Tracked in P1.
- State icons carry a second cue: strike, muted text, or a label.

## Reddit and forum pitfalls → Dockit
| Pitfall | Dockit after this branch |
| --- | --- |
| Slow capture | Capture field is the first control; focus stays after add. Return inserts a line by design; + adds. |
| Sync loses or resurrects data | Unreadable-file overwrite, unsyncable content and restore deletions fixed. Routine resurrection remains (P0). |
| Overdue guilt | Earlier tasks is neutral, never auto-moved. |
| Parent completes steps; no undo | Undo restores the whole tree; reopen keeps steps. |
| Recurring duplicates or skips | One id per routine per day; Skip next exists. Missed days are not back-filled. |
| AI takes over | Plans are previews; apply has Undo; manual and edited steps stay. |
| Timer dies in background | Focus uses stored start/end times. OS end alert not verified (P1). |
| Gamification punishes | No streaks; the Focus scene is decoration. |
| Lock-in | JSON export and restore on every tier. |

## Goals, Mynit and Shiprite
- Daily tasks carry `goalId`/`goalStepId`; goal progress counts plan steps only. Tasks attached with **Assign to project** or from Mynit appear as linked tasks but not in progress (documented choice; reconsider in P1).
- Routine tasks have no link back to their routine and schedules stay on one device (P0/P1 below).
- Mynit follow-ups land on today only, with no goal choice; the source opens Mynit by deep link.
- Shiprite assignment status lives only in the Account panel's widget state. It is not shown on the task row, and the assignment id includes the task date, so moving the task loses status lookup (P0).
- Recommended direction: keep one Task model. Add `source` (Mynit meeting/segment) and `assignment` (Shiprite id, status, revision) as optional task fields, synced with the day record, shown as small chips on the row next to the goal chip. Goals stay the long-term container; routines become goals of kind *routine* whose generated tasks carry the routine id.

## Roadmap

### P0: before public release
- Routine resurrection: a routine task deleted on one device is recreated by another before its first sync and then uploaded. Materialize only after the day's first successful sync, or record handled-through in synced goal data. (web + phone)
- Shiprite assignment id must not depend on the task date; persist the last receipt on the task and show its status on the row. (web + phone + backend contract)
- Load fallback for schema errors: when the main file parses but fails validation, offer the previous readable file instead of only the error. (phone)
- Routine task id length: cap the encoded goal part at 109 characters so ids stay within the 128 sync limit. (web + phone)
- Existing plan 26 P0: production sign-in/sign-out/switch, two-device offline conflict, Mynit → Dockit → Shiprite chain, signed store builds, large text and screen readers on installed builds.

### P1: early access
- Translate AI provider and transport error messages (about 30 strings in `ai_service.dart`, `cloud_sync.dart`).
- Stop retrying an unresolved shared link on every focus change and background sync.
- Wider drag grips or a long-press drag on the whole row.
- Focus end alert scheduled with the OS; tell the user when notifications are off.
- Goal progress option to count linked tasks; unassign project on phone and web.
- Mynit follow-ups: choose date and goal at add time.
- Bulk actions for Earlier tasks (move all to today, let go).

### P2: later
- Editor draft autosave (Zilo-style) for long paragraphs.
- Swipe between days on the list.
- Optional home-screen widget for capture.

## Decisions
- Restore favours keeping cloud data: clearing baselines turns differences into reviewable conflicts. Restoring to deliberately roll back the cloud is now a conflict review, not a silent overwrite.
- Reopen of a fully finished parent reopens its last step rather than every step, so finished work is not lost and the parent can stay open.
- The editor sheet cannot be dragged closed because a drag dismissal cannot be intercepted; Back, scrim and Cancel ask first.
- Return in the capture field keeps inserting a new line (paragraph capture is a product decision).

## Verification (2026-11-28, branch `dockit/final-release-polish`)
- `flutter test`: 184 tests pass, one optional screenshot test skipped (new `release_safety_test.dart`: 8 tests).
- `flutter analyze`: two existing informational lints, no warnings or errors.
- `npm test`: all 34 Node regression suites pass. `scripts/audit-interface.cjs`: no missing, extra, placeholder or suspect entries in nine locales.
- Renders at 360 pt, 1.0× and 1.5× text: notes, task actions, editor, goals, routines, search, progress, plan, Focus.
- iPhone 17 Pro simulator (iOS 26.4): debug build installed and launched in Cantonese; header stamp, grain and empty state render. Touch interaction was not exercised because simulator access was not granted in this session.
- Android: `flutter build apk --debug --target-platform android-arm64` succeeds. Not installed on an emulator or phone.
- Not verified: physical devices, haptics on hardware, VoiceOver/TalkBack, production sync, the web and Mac clients (unchanged except corrected catalog entries).

## Notes
- The Dropbox checkout has uncommitted translation work on a detached HEAD. This branch was cut from `origin/main` in a separate worktree and also edits `phone/assets/interface/*.json`, `interface_labels.dart` and `task_tile.dart`; expect catalog merge conflicts. Regenerate with `scripts/sync-interface.py` after merging catalogs.
- Corrected the French, German, Korean and Portuguese **Discard** entries, which read as a sentence or as Delete.
- Cleanup: the spare iPhone 17 Pro simulator booted for an access request was shut down. The worktree build outputs under `/Volumes/data/codex-tmp/dockit-final-release-polish/phone/build` are kept for review installs.
