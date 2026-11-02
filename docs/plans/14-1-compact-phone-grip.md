# 14-1: Compact Phone Grip

**Parent:** [14-task-control-spacing](14-task-control-spacing.md)
**Status:** completed
**Goal:** Remove wasted space before the phone drag grip and tighten the aligned task controls.

## Tasks
- [x] Narrow the grip to 24px, checkbox slot to 40px and root left inset to zero when a handle exists.
- [x] Use 12px optical gaps and retain first-line vertical alignment and parent-relative step indentation.
- [x] Verify phone drag/layout behavior and screenshots.
- [x] Rebuild original-key Android +11 for delivery.

## Decisions
- User prefers compact alignment over wide blank targets. Keep full row-height drag targets, accessible names, and the existing task behavior.
- Root text starts at 66px instead of 104px; visible dots start at 14px instead of 44px. Today and Earlier use the same shared grip.

## Verification
- Analyzer/formatting and all 86 tests pass; nine screenshot/workflow checks pass with normal/enlarged text. Notes and expanded child-row screenshots reviewed.
- Delivered original-key production +11 / 2011 at `release/todo-sticky.apk`, 19,622,447 bytes; signature/alignment verified. SHA-256 `ead9d78c79309b242927712faa7f7df113d317a2a3e5e1d075901ad9f6edcc37`.
