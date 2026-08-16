# 4-8: Stable Date Header Layout

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Keep both date-navigation arrows fixed while the centered date label changes length.

## Tasks
- [x] 1. Replace the content-sized date navigation row with a stable three-column layout.
- [x] 2. Center the date text independently from the calendar chevron.
- [x] 3. Preserve enough label width for the longest English weekday name at compact sizes.
- [x] 4. Build, install, restart, and verify the production header styles.

## Decisions
- Use fixed arrow columns around a flexible center column rather than sizing navigation from the current date string.
- Reserve symmetrical space around the date label so the calendar chevron does not shift its visual center.

## Notes
- The full date may ellipsize only when the complete formatted string cannot fit; the center column still reserves room for the longest weekday name.
- Production-style fixture verification covered short, medium, and longest-formatted labels; both arrow positions remained identical and `Wednesday, September 30, 2026` fit at the normal compact center width.
- The installed macOS bundle was rebuilt and relaunched. Direct desktop screenshot inspection was unavailable because the system UI-inspection service did not start, so visual geometry was verified against the same built production CSS in a browser fixture.
