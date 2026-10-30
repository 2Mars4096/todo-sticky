# 7-3: Concise Android copy

**Parent:** [7-flutter-android](7-flutter-android.md)
**Status:** completed
**Goal:** Make Android screens focus on controls and current data, removing repetitive descriptions and promotional text.

## Tasks
- [x] Audit and trim copy in Notes, Goals, Focus, Settings, AI, Music, Plan and Account.
- [x] Preserve consent, conflict/recovery context, errors and accessible control names.
- [x] Run Flutter analysis/tests and visually verify key screens on the isolated emulator.
- [x] Build and deliver an updated optimized APK with the same release key.

## Decisions
- Apply this pass to the Android app discussed in this thread; retain the established paper styling and functionality.
- Remove redundant explanatory blocks and their extra spacing rather than replacing them with new slogans.
- Keep concise warnings where a choice uploads or replaces data. Existing provider/model, task dates and sync state are useful information, not filler.

## Verification
- Flutter analysis and all 44 tests pass, including 360px/150% text Account/conflict checks. Adjust the prior footer-scroll fixture to end at the retained recovery control.
- Isolated emulator review covers Notes, Settings, Account, AI, Machines, Goals, Routines, Focus, Music and Plan. Existing synthetic task survives the in-place APK update. Screenshots/UI dumps are in ignored `output/account-sync/copy-cleanup/`.
- Keep account identity, useful provider/date/session metadata, privacy consent, recovery choices and operational errors. The pass changes presentation only; native storage, AI requests, synchronization and task behavior remain unchanged.

- Final `release/todo-sticky.apk`: 2.1.15+3 / versionCode 2003, 19,359,571 bytes (19.36 MB), SHA-256 `d3eb2f5c5f8d958a3ef24f62fc5f1981013f6ec00569ddfecc04a2cf34dc2902`. Same verified signing certificate as +2; emulator in-place upgrade succeeds without losing the synthetic notebook.
