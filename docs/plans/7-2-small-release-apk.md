# 7-2: Smaller Android release APK

**Parent:** [7-flutter-android](7-flutter-android.md)
**Status:** completed
**Goal:** Deliver an optimized ARM64 APK targeting 10–20 MB while retaining account sync and the full local workflow.

## Tasks
- [x] Measure the delivered debug APK and identify its largest entries.
- [x] Prepare the matching Flutter toolchain and durable private release signing.
- [x] Build an optimized ARM64 APK with the deployed sync service prefilled.
- [x] Verify size, signature, package metadata and release contents; deliver at `release/todo-sticky.apk`.
- [x] Document reproducible build steps and debug-to-release installation compatibility.

## Findings
- Current APK is 82.8 MiB. Major compressed entries: Flutter runtime 37.05 MiB, development kernel 21.52 MiB, Vulkan validation library 14.53 MiB, isolate snapshot 4.20 MiB.
- Existing CI intentionally builds a debug review APK. Release Gradle configuration already requires an external signing keystore; keep private signing material out of Git.
- Exact release size will be measured, not inferred from debug contents. No features or user data are removed to meet the target.

## Verification
- Flutter 3.47.8 from official tag `737ba8f885`; analysis clean and all 44 tests pass (optional screenshot test skipped).
- A persistent private release key was created outside Git; its ignored Gradle configuration references it. APK build number increases from 1 to 2.

- Delivered `release/todo-sticky.apk`: 19,359,751 bytes (19.36 MB / 18.46 MiB), 77.7% smaller than the 86.82 MB debug APK. SHA-256 `fe9340847b566868be77ca63ea04a3ea5542477fc3aae96d7418337f6285be26`.
- APK v2 signature passes; ARM64 only, version 2.1.15+2 / Android versionCode 2002, API 24 minimum. No debuggable flag, development kernel, isolate snapshot or Vulkan validation library. Release engine/app libraries account for 11.76 MB / 6.88 MB.
- Isolated Android 35 emulator: install/cold launch, synthetic task capture, process-restart persistence, prefilled live service URL and enabled Google sign-in all pass. No runtime errors observed; emulator stopped. No real login, physical phone, or user notebook was accessed.
- Prior debug signature differs from the persistent release key. Existing debug installs need notebook export before removal, then release install/import. Keep the private key directory for subsequent in-place release updates.
- Evidence: ignored `output/account-sync/release-check/` contains screenshots, UI dumps and size/signature report. The original CI debug artifact remains under `output/account-sync/`.
