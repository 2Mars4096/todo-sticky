# 16-4: Phone Sync Shortcut

**Parent:** [16-sync-efficiency](16-sync-efficiency.md)
**Status:** completed
**Goal:** Make the phone cloud control synchronize directly while keeping account configuration in Settings.

## Tasks
- [x] Check the current cloud control and explain the eye visibility control.
- [x] Replace cloud-to-Account navigation with the existing manual sync action and brief result feedback.
- [x] Keep unavailable/busy states safe and Account available through Settings.
- [x] Verify direct sync, no navigation, result feedback and local-only behavior.
- [x] Build and deliver the next original-key APK.

## Decisions
- One tap on an enabled cloud control requests sync. It never opens Account automatically or enables sync/sign-in implicitly.
- Existing controller draft/save/conflict protections remain authoritative. The button displays its result message.
- The eye control shows/hides completed and stopped tasks; it does not delete them.

## Verification
- Analyzer clean and all 127 phone tests pass (one optional screenshot test skipped).
- New widget checks verify a direct controller request without route changes, disabled/busy protection, authoritative result feedback and no implicit account enablement.

## Delivery
- Original-key Android 2.1.16+19 / versionCode 2019 delivered at `release/todo-sticky.apk`, 19,884,735 bytes (19.88 MB), ARM64. Production package, matching certificate, v2 signature, ZIP integrity, 16 KB alignment and service origin verify.
- SHA-256 `004512d8d9363a98dd793f9214571d60137e7abdc2c18aeea7c544217a88afc6`. Prior +18 APK, source hashes, test/build logs and verification report are retained under ignored `output/phone-sync-shortcut-delivery/`.
