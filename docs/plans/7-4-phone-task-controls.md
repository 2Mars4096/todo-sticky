# 7-4: Phone task controls

**Parent:** [7-flutter-android](7-flutter-android.md)
**Status:** completed
**Goal:** Match desktop task affordances with a visible phone reorder grip and quiet icon actions.

## Tasks
- [x] Add a dedicated immediate-drag handle to daily root tasks, retaining stored order and accessible reorder actions.
- [x] Replace Focus, Step and Suggest labels with named icon buttons; group editing and secondary actions under horizontal dots.
- [x] Verify drag, filtered tasks, persistence, narrow layouts and existing phone workflows.
- [x] Build an updated signed APK and update usage documentation.

## Decisions
- Retain the warm note palette and touch targets. Earlier tasks retain their source dates and Move control; nested steps retain existing up/down controls.
- Drag starts only from the grip, leaving title gestures and scrolling available.

## Verification
- Flutter 3.47.8 analysis clean; 52 tests pass, optional screenshots separately pass. Expanded phone layout reviewed at 390×844; narrow/150% text tests pass. Physical phone acceptance remains unverified.
- Release signature verified, matching the previous APK certificate. Android versionCode 2006, 2.1.15+6; 19,425,343 bytes.
- APK SHA-256: `12a85925c38e5833b1db2d8c8e4cac176e88204c531fb3cb252a95b2eceee08f`. Previous delivery preserved at `/tmp/todo-sticky-before-phone-controls.apk`.
