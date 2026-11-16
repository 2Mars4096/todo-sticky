# 21: Meeting follow-ups in Todo

**Status:** completed (standalone Mac and shared backend live)
**Goal:** Monitor analyzed meetings from Today in both desktop Todo surfaces.

## Tasks
- [x] Checkpoint reviews and catch up older analyses through the shared account.
- [x] Show suggestions, evidence, review dates and empty reviews in Todo.
- [x] Verify account isolation, retries, transcript edits, catch-up and task creation.

## Decisions
- Generate suggestions automatically and add a daily task when selected.
- Use Todo-scoped backend routes and the existing canonical push receipt.

## Notes
- Installed and reopened standalone Sticky Todo 2.1.16 with the shared backend flags and stable Rust 1.100.0. Signature, exact bundle contents and 56 task files verified. Previous app: `/Applications/.sticky-todo-install-08lo4igi/previous/Sticky Todo.app`. The embedded Diane client remains a separate release.
- Shared API `diane-api-00031-pet` and worker `diane-worker-00020-zat` each serve 100% of production traffic. Cloud Build `b7881a5c-9c93-46b7-ae6f-4a46ff905dbf` layered the review changes onto each serving image and tested them with synthetic records. The worker keeps its deployed analyzer and records the review when analysis completes. Existing-account catch-up, counts and source citations were verified on the live service.

## Project steps

- [x] In Today, accepting meeting follow-ups for the same project and list date creates one parent task with ordered steps. Matching ignores case and repeated spaces in the saved meeting project label. Meetings without a project use their own title and meeting ID. Each step keeps its own source evidence, assignee and deadline.
- [x] Verify two meetings share one parent, distinct projects/dates and unlabeled meetings stay separate, and retries preserve step identity.

## Meeting list presentation

- [x] Meeting follow-ups use full-width disclosure rows, aligned suggestion counts and one date label per run of same-day reviews. The expanded list scrolls within the note. Checked long Chinese and English titles at 340, 460 and 800 pixels, keyboard expansion and transcript disclosure.

## Review dismissal

- [x] Meeting reviews expand independently. Clear this meeting and Clear all suggestions dismiss the reviewed suggestions after confirmation. The account retains meeting history and existing tasks. Reviews generated after the selected cutoff remain available.
- [x] Check simultaneous expansion, cancellation, individual and bulk clearing at 340, 430 and 800 px.
- [x] Reuse the DeleteAction control from task rows. Put the bulk action on the review-date line and align expanded text and actions with the meeting title. Final browser checks passed at all three widths.

## Meeting selection

- [x] Select one or more suggestions in a meeting, then use the single Add to today action. Its label shows the selection count. A lone remaining suggestion supports one-click addition. Collapsing and reopening a meeting retains its selection while the list stays mounted.
- [x] Verify submitted indices, preserved choices, keyboard use and the final single-action shortcut at three widths.

- [x] Append older reviews in place and preserve expanded panels and selections. Use 10px top and bottom suggestion padding and a 2px gap before the transcript control.

## Android delivery

- [x] Android 2.1.16+26 (version code 2026) adds signed-in shared-account meeting follow-ups to Today. Open multiple meetings, inspect transcript citations, select project steps, append older reviews and clear suggestions per meeting or across reviews.
- [x] The ARM64 release replaced the root `todo-sticky-latest.apk` after ZIP, package, version, embedded feature and signer-continuity checks. SHA-256 `fdf7331223cb1d140bacec4d615708877687b03324bf41910a02c3013bd3f08d`. Isolated Flutter 3.41.9 build used the same Kotlin and reorder compatibility adjustments as +25. 140 Flutter tests passed with one skip. No physical device was connected.

## One-tap dismissal

- [x] The trash icon on each meeting row directly dismisses its follow-ups. Successful dismissals disappear from the dashboard, including previously cleared reviews. Bulk clearing retains its confirmation. Source meetings and accepted tasks remain available.
