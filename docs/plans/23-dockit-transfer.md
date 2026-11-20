# 23. Dockit client transfer

**Status:** in-progress

**Goal:** Create dated to-dos from proposals and assign a selected task and its steps from each Dockit client.

## Tasks

- [x] Reconcile the existing web, Tauri and phone clients with the reviewed transfer branch. Keep the existing notebook formats and identifiers.
- [x] Check browser revisions and account ownership before replacing a day or sending an assignment. Exercise nested steps, receipt handling, editor access and retries with synthetic data.
- [x] Build the web client, macOS release bundle and Android preview APK. Verify the APK signature and emulator activity.
- [x] Exercise the Flutter form on Android and iOS layouts. Type-check the iPhone native delegates.
- [ ] Build the iPhone target, sign and install it on a phone, then verify the document picker, task return, persistence and assignment.
- [ ] Exercise the packaged Mac window with an isolated profile and confirm a live editor assignment on each platform using a designated test account.

## Local verification, November 20

All paths below are relative to the checkout. Screenshots, packages and logs are local in `output/clients/`.

| Client | Build and installation | Workflow and visual evidence |
| --- | --- | --- |
| Web | Strict TypeScript and Vite production build. Serve `dist/` with `npm run preview`. | Fresh Chromium profile at 390×844, 460×640 and 1100×760. Created a proposal and nested step, observed the IndexedDB commit, reloaded, then used Account to sign in with fixture responses. Keyboard submission sent the selected task, step and recipient. Verified the receipt, missing-editor state, step focus and zero page errors. See `web-workflow.log`, `web-assign.png` and `web-check.py`. |
| Android | `Dockit-debug.apk` is a debug-signed Dockit Preview 2.1.16+29. The application ID is `io.github.twomars4096.sticky_todo.preview`. The APK came from a local Flutter 3.47.8 build with matching Dart sources, Android app sources and lockfile. APK Signature Scheme v2 verified. The disposable emulator recorded that activity and displayed a synthetic task. See `android-emulator.activity` and `android-emulator-task.png`. | At 360×740 the Flutter workflow added a task and step, opened Settings → Account & sync, selected the workspace and recipient, displayed the service error and retried against the same assignment ID. These assignment receipts used a fixture. The local release-mode Gradle attempt stopped at its lock socket. |
| iPhone | Source in `phone/ios/`, target `work.pipedreams.dockit`. Both Swift delegates type-checked for arm64 iOS 15 against the iPhoneOS SDK and an available Flutter header. The Flutter 3.47.8 cache contains Android and host engines only. Device compilation, signing, installation and system UI checks remain open. | At 390×844 the shared Flutter engine exercised the same form with iOS platform behavior, an injected service error, retry and receipt. See `iOS-tasks.png`, `iOS-assigned.png` and `phone-form.log`. These images come from the host Flutter renderer. |
| macOS | `Dockit.app` is an arm64 release bundle with the screenshot helper, ad-hoc signature and no notarization. Deep strict signature verification passed. No system installation. | The bundled native CLI created a proposal with a nested step and reopened it from a synthetic Markdown notebook in a separate invocation. See `mac-create.json` and `mac-reopen.json`. All 45 native tests passed. The shared React form ran at the native 460×640 default size in Chromium. A separately identified debug launch with isolated storage exited after a LaunchServices error. A native window and live dispatch remain unverified. |

The package SHA-256 is `2a42dec1251f71f77f770eff19bc57681ed49eea8a5f4d6c60e5dd828e51034b`. The source-matched phone suite recorded 141 passes and one skip. A direct Flutter engine run exercised 13 targeted checks including both new platform form tests. The Dart analysis server reported zero errors. All 32 Node regression suites passed.

Added top padding to the expanded workspace selector and verified the full floating label and pipedreams account title in the Android and iOS assignment renders. The rebuilt debug preview uses the same fix.

## Decisions

- Reuse the assignment and browser revision guards from local commit `7cda241` and the existing iPhone project. Keep the Mac screenshot helper, Android app links, native file channels and existing user edits.
- An assignment sends the selected task tree and optional member UID. Retrying the same owner, workspace, date, task ID and recipient uses the same assignment ID. Server-side membership and live delivery need separate acceptance.
- Use synthetic notebooks, a mock account transport and local packages for review. The original production APK remains a historical release. Do not use it to verify this preview.

An independent device build restored Flutter 3.47.8’s iOS engine and resolved the Swift packages. Xcode still reports that the iOS 26.4 device destination is unavailable. The normal iPhone build and physical installation remain open.
