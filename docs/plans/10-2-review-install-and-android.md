# 10-2: Review, Install And Android Workflow Parity

**Parent:** [10-user-workflow-improvements](10-user-workflow-improvements.md)
**Status:** completed
**Goal:** Review the desktop additions, install the verified Mac app and deliver a signed Android APK with matching workflows.

## Tasks
- [x] 1. Repeat desktop review and address consequential findings.
- [x] 2. Add Android Search/Progress, planning constraints/edit protection, optional routines, focus review and compact sync status.
- [x] 3. Verify both clients with synthetic workflow, persistence and layout checks.
- [x] 4. Back up the stopped Mac app/state/tasks; install, launch and verify data/signature preservation.
- [x] 5. Build a new same-key Android release; verify/update-test and replace the local delivery APK.
- [x] 6. Update documentation and record UI/UX findings and verification limits.

## Decisions
- User explicitly requests installation and a new APK, then selects matching Android features before building.
- Keep routine definitions local on each device; generated tasks share stable occurrence identities and use existing task sync. Preserve current account consent/keys and unrelated uncommitted work.
- No public release or backend deployment. No clearing user application data.


## Review Findings And Fixes
- Match Android replanning to desktop text fingerprints so synced edited/started/legacy steps survive a new plan. Verify Unicode hashing and occurrence IDs across clients.
- Harden desktop routine dictionaries against inherited entries from unusual goal IDs.
- Fix enlarged-text routine-header and plan-confirmation overflow. Put phone Focus controls before the map and reveal Review task after completion.
- Preserve phone task/goal status semantics; stopped work is not counted as completed in the Notes summary.

## Verification And Delivery
- Desktop: all 19 Node suites, TypeScript and the production workflow browser check pass; optimized native app builds successfully. Install exact signed bundle at `/Applications/Sticky Todo.app`, launch successfully and verify all 56 task files and native config unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-workflow-install-20261030-164552`.
- Android: analyzer clean, all 60 tests pass (plus optional visual captures). Focused sync acknowledgement checks also pass. Review Notes, Search, Progress, Routines, Focus and planning at 360px/normal and enlarged text.
- APK: `release/todo-sticky.apk`, ARM64 release 2.1.15+7, versionCode 2007, 19,491,291 bytes. V2 signature verifies; certificate matches previous release (`1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`). SHA-256: `d429208e548565856bcb4e7c19b28f798de9f6ccc6621ed5c26b459406b1af61`.
- Isolated `Todo_Release_35` emulator update from versionCode 2005 to 2007 succeeds. Notebook bytes/tasks/goals remain unchanged; new workflow controls visible after launch. No physical phone or user account was used in these tests.
- Evidence: `output/workflow-delivery/{macos-verification,apk-verification}.json`, phone-review screenshots, emulator screenshot/UI dump; previous delivered APK retained in the same ignored output folder. No release tags, public distribution or backend changes.
- Native launch/signature/data checks are smoke acceptance; live AI response quality, physical-phone behavior and a real-person usability study remain separate.
