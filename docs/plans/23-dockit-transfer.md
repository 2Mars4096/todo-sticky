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

## Suite UI and record handoffs

A normal notebook open recovers an imported task's source from its owner's canonical record. Dockit displays the quote and timestamp, checks account changes, opens an exact Mynit reference, and tries the native app with a browser fallback on phones. Assigning a dated task sends its stable ID and origin to Shiprite, which returns a creator-scoped receipt. Checking status returns the shared state and revision. The link back opens the original dated task.

The Chromium regression exercised Mynit decision export, ordinary notebook restart, source opening at 1:05, stable Shiprite retry after a lost response, restricted receipt access, status revision 3 and return focus. The web, ad-hoc Mac and Android builds include the shared product controls. Flutter tested 143 cases with one skip, and final analysis reported no issues. Android launch and the Mac bundle signature were verified. Mac window handoff, signed iPhone installation and live account delivery remain open. [Web citation](../../output/clients/handoff/web-citation.png) · [Receipt](../../output/clients/handoff/web-receipt.png)

## Cross-product consistency pass

The phone and web source and assignment links reuse the suite destination marks. The receipt places status, revision and action together; frequent date navigation updates immediately.

## In-app workflow review

The selected day shows open work on web and Mac. Phones can reveal hidden finished tasks without changing their completion status.

## Repeat task capture and existing notebooks

- [x] Restore focus after Add in the daily and inline React composers. Preserve multi-line paragraphs, guard IME composition, and retain the accessible Add action.
- [x] Make phone Add unavailable for blank or composing text, retain the capture focus and accept Cmd/Ctrl+Enter on a hardware keyboard.
- [x] Reopen pre-update synthetic data, add to it and reopen it again. Chromium used the original IndexedDB v1 day tree. The rebuilt Mac CLI read the earlier Markdown fixture at its recorded revision. Flutter opened an on-disk v1 notebook. All three preserved the original IDs and nested steps.
- [x] Inspect 390px and 1100px Chromium renders and Android 360×740 and iOS 390×844 Flutter renders with multiline CJK text. Task text, controls and selected input fit at those sizes. Flutter also tested 150% text with a keyboard inset. The phone screenshots use host fonts; physical iPhone installation remains open.

Browser and Mac share the React capture surface. Chromium verified repeated click and shortcut submissions independently in both composers. The production web build, strictly signature-verified Mac package and debug-signed Android Preview APK completed. All 32 Node suites and 148 Flutter tests passed, with one existing Flutter skip.

The browser reopens the notebook on its original origin in the same browser profile. On Mac, choose the existing notebook root under Settings → Storage → Change task folder. On phone, an in-place update of the same application retains its private notebook. To transfer an existing notebook between installations, use Settings → Your notebook → Export a backup and Restore a backup. Restore replaces the receiving notebook after confirmation. Android Preview uses a separate application ID.

[Compact web](../../output/clients/quick-capture-390.png) · [Wide web](../../output/clients/quick-capture-1100.png) · [Android layout](../../output/clients/quick-capture-android.png) · [iPhone layout](../../output/clients/quick-capture-iOS.png)

On emulator-5582, the already-installed Dockit Preview (SHA-256 beginning `70e0efe0`) saved a synthetic task before the update. Android installed the new preview in place (`adb install -r`, SHA-256 beginning `76e6d8aa`). The two dated trees, goals, focus, preferences, sync metadata and routine schedules matched before and after installation. The updated app added another task and kept the earlier entries. The 1080×2400 device capture shows the before/after entries and the preserved Earlier tasks section. [Android upgrade screen](../../output/clients/quick-capture-android-upgrade.png)

## Shared paragraph field

Dockit owns the expanding textarea reused by Mynit and Shiprite. Its measured border follows the consuming app’s style and the field still measures after each controlled text change. The suite sync verifies identical source in all three clients.

## Notebook calendar

- [x] Open the selected month and day. Arrow keys move the calendar focus, Enter selects, and selection or Escape returns focus to the date button.
- [x] Center the popup within the notebook header. Daily and monthly navigation use the same familiar chevron, retain distinct accessible names, and have 44px navigation targets for touch pointers.
- [x] Preserve the selected historical date in the Flutter Notes and Progress pickers. Confirming the same Notes date keeps Undo available.
- [x] Check Chromium at 320, 340, 460 and 1100px. The previous popup extended 4.5px beyond the 340px viewport. The revised popup fits each width. Flutter exercised November 1969 and December 2101. Both Android and iOS host layouts opened a historical day from Notes and Progress.

[Compact touch calendar](../../output/clients/calendar-320.png) · [Desktop calendar](../../output/clients/calendar-1100.png) · [Android layout](../../output/clients/calendar-android.png) · [iPhone layout](../../output/clients/calendar-iOS.png)

## Task disclosure feedback

- [x] Keep the control and its hit area stationary as the chevron changes from right-facing (closed) to down-facing (open). Keep task actions and steps immediately usable.
- [x] Check Enter and Space on the shared React control, touch on compact Chromium, and touch and keyboard on Flutter. A pointer or touch reversal continues from the current angle. Enter and Space set the exact final icon orientation on the first frame with a zero-duration transition. Reduced motion also makes pointer activation immediate.
- [x] Exercise a parent and real nested step in the Chromium production build at 1100px and 390px. Check the Android and iPhone layouts through Flutter and inspect the rendered task actions and steps.

The dedicated browser test is [check-disclosure-motion.cjs](../../tests/check-disclosure-motion.cjs). The pointer rotation runs for 150ms. Chromium reported a 0s transition under reduced motion. The ordinary-motion test reversed a running turn at 84.78 degrees without a position jump. Flutter tests verified that the visible step actions changed before the animation finished and the button retained its dimensions.

All 32 Node regression suites and 151 Flutter tests passed; one existing phone test remained skipped. TypeScript and focused Dart analysis passed. The web preview, local signed Mac bundle and debug-signed Android Preview APK were rebuilt. The Mac interaction was exercised on the shared React implementation in Chromium. Android and iPhone layout images come from the Flutter host renderer.

[Compact browser](../../output/clients/disclosure-390-no-preference.png) · [Desktop browser](../../output/clients/disclosure-1100-no-preference.png) · [Android](../../output/clients/disclosure-android.png) · [iPhone](../../output/clients/disclosure-iOS.png)

## Current Flutter phone exports

The iOS 26.4 simulator run and current Android/iPhone exports are now recorded in [Plan 25](25-interface-element-review.md). Physical iPhone installation still requires an authorized signing and provisioning setup.

## Repeated step capture

- [x] Compare three paths. The existing calendar already restores the selected date and control. Undo for deletion spans notebook history. Manual step capture had an observable focus loss after clicking Add and a phone composition gap, and both had a working model in top-level capture.
- [x] Keep focus in the same parent’s step field after an accepted Add or Cmd/Ctrl+Enter. Plain Enter retains multiline entry. A composing or empty draft cannot submit, and the new child row provides immediate feedback. Existing locale keys, visual styles and notebook models are reused.
- [x] Run the [step regression](../../tests/check-step-capture.cjs) at 360px with reduced motion and 1100px with standard motion in Chromium. The production browser notebook and synthetic Mac bridge each reopened exactly two children after a click, a shortcut and repeated input. The first child preserved a CJK paragraph and blank line. The [native macOS WebKit check](../../output/clients/step-capture/mac-webkit.json) exercised the production React bundle with a synthetic local bridge. The rebuilt standalone Mac app passed strict deep signature verification. Direct manipulation of its packaged Tauri window remains open.
- [x] Check Flutter at 360×740 Android and 390×844 iPhone, including active composition, empty actions, repeat shortcuts and stable focus. The [installed API 35 Android release](../../output/clients/step-capture/installed-android.json) and [iOS 26.4 Simulator build](../../output/clients/step-capture/installed-ios.json) both accepted a second step without tapping the field again and showed both children after relaunch. Physical iPhone installation requires provisioning.
- [x] Pass all 33 standalone Node suites, 75 embedded tests, plugin typecheck, production render and package checks. Flutter passed 159 tests with its existing optional preview skipped. Focused Dart analysis passed. The interface audit found matching entries and placeholders for all 1,366 keys in nine translations.

[Compact browser](../../output/clients/step-capture/step-capture-browser-360.png) · [Wide browser](../../output/clients/step-capture/step-capture-browser-1100.png) · [Android screen](../../output/clients/step-capture/step-capture-android.png) · [iPhone screen](../../output/clients/step-capture/step-capture-iphone.png)

The local phone exports retain version 2.1.19 and advance the build to 33. The three Android ABI splits match their prior package and certificate. The iPhone device IPA is unsigned. The [build manifest](../../output/clients/step-capture/builds.json) records identifiers and hashes for the [ARM64 APK](../../output/clients/step-capture/Dockit-arm64-v8a-release.apk), [device IPA](../../output/clients/step-capture/Dockit-unsigned.ipa), [Simulator app](../../output/clients/step-capture/iphonesimulator/Dockit.app), [Mac app](../../output/clients/step-capture/macOS/Dockit.app) and [embedded package 0.1.26](../../output/interface-five/diane-app-todo-plugin-0.1.26.tgz). Build 32 remains available at its previously recorded paths.

## Phone navigation and sign-in

- [x] Compare Notes, Goals and Focus with the pre-transfer Sticky Todo phone at `5d6a8ff`. The Flutter client retains all three bottom destinations and all 28 predecessor Dart source paths.
- [x] Open Settings and Account & sync from the app mark on any tab. Signed-out notebooks show Sign in in the header. The existing account page owns Google authentication, notebook sync and assignment controls.
- [x] Upgrade the API 35 emulator with the signed ARM64 APK, `io.github.twomars4096.sticky_todo` 2.1.20, Android version code 2035. With networking disabled, cold launch showed all three tabs, Sign in opened Continue with Google, and the app icon opened Settings from Goals. Back returned to the selected tab.
- [x] Install the connected iPhone build on an iPhone 17 Pro simulator running iOS 26.4. XCTest exercised `work.pipedreams.dockit` through initial login, Goals, the drawer, Settings, Account & sync and return to Focus.
- [x] Run 39 focused Flutter tests, including the ordinary account-enabled application entry, local notebook edits and steps, goals, archive filter recovery, conditional synchronization and Shiprite assignments. The catalog audit checked 1,362 keys per translation.

The local signed APK has SHA-256 `0c17a555264316aa1eb81f3f16b8d9f696fc0e4267a65d506926566394357b7c`. Live Google authentication and a provisioned physical iPhone remain open.

## Browser sign-in return

- [x] Preserve the shared issuer, verifier exchange and original notebook or recording ownership when opening the branded approval URL.
- [x] Verify cold-start continuation without a second browser, the Android callback with a stopped process and the same callback with the activity backgrounded.

The signed 2.1.21+36 (Android version code 2036) Android build retained its package and signer. On Android API 35, the actual sign-in button opened `https://pipedreams.work/signin`. The OS dispatched `todo-sticky://account-return` to the installed app in both tests. 48 focused Flutter checks passed. The iOS 26.4 simulator app and unsigned device IPA carry the matching version. Live Google account selection and provisioned physical iPhone installation remain unverified.

A dedicated iPhone 17 Pro simulator running iOS 26.4 opened the installed app through the system URL resolver. XCTest observed the app reach the foreground from terminated and background states for both return URLs. The run completed two tests with zero failures.

## Phone Settings and navigation

- [x] Notes opens on the selected notebook date, with search and progress beside it. The app mark beside Notes, Goals and Focus opens Settings or Account & sync. Settings shows the account state, display language, notebook material, AI provider and planning machines.
- [x] Retain the original bottom destinations checked against `5d6a8ff` (Notes, Goals and Focus). The signed release preserves the existing application ID and signer while upgrading 2036 to 2037 on Android API 35.
- [x] Verify the menu, Settings, account entry and return on an installed iPhone 17 Pro simulator running iOS 26.4. The matching device IPA is unsigned and requires provisioning. Signed-in service tests use fixtures. No personal account was used.

[Android home](../reviews/phone-settings/android-home.png) · [Android Settings](../reviews/phone-settings/android-settings.png) · [Installed Android checks](../reviews/phone-settings/installed-android.json) · [iPhone home](../reviews/phone-settings/iphone-home.png) · [iPhone Settings](../reviews/phone-settings/iphone-settings.png)

43 focused Flutter tests passed, including all ten language choices, 320 px at 1.4×, 360 px at 1.5× with a keyboard, nested edits, account fixtures and cloud synchronization. The installed Android app retained a task created on the previous build and returned to it from Account & sync.

The ARM64 release binary contains the production broker and branded approval origin. Public HTTPS discovery for `todo` returned project `dear-diane-202610`, API prefix `/api/plugins/todo` and the branded sign-in path. The public Dockit website and approval route each returned HTTP 200. The notebook opens its real app-private file store and the account controller selects the production shared service. An empty notebook has no sample records.

## Production web notebook

- [x] Preserve the product landing and desktop release link. The new Open Dockit control goes to the React notebook at `/app/`. Recognized `/tasks/<id>` paths load the same client. The custom domain retains its other routes and Firebase initialization files.
- [x] Run all 33 Node suites and build with the production shared account service and `/app/` assets. Compare every deployed public app file with the build. Firebase Hosting release `b1fabf00a2379815` succeeds `29bbc94392dee8f5`. [Release receipt](../reviews/production-web/firebase-release.json)
- [x] Verify the public landing, initially empty notebook, Settings and account entry at 390 and 1100 px in fresh Chrome profiles. Each browser reopened its saved synthetic task after reload. The tested Google button opened the production branded approval route with app ID `todo` and a browser return; the check cancelled before Google identity selection. The phone-size web date row contains only notebook navigation, the app chooser and language.
- [x] Confirm both `/app` and `/app/` serve the compiled notebook and that the shared-task route returns identical application HTML. User notebooks and backend deployments were outside this release.

[Live notebook](https://dockit.pipedreams.work/app/) · [Phone browser](../reviews/production-web/phone-notebook.png) · [Desktop browser](../reviews/production-web/desktop-notebook.png) · [Phone account](../reviews/production-web/phone-account.png)

## Phone list retrieval

In Search and Progress, swipe through task states. The goal filter and sort controls stay beside the strip. Sort the archive by newest date, oldest date or task title. Pull Notes, Search or Progress to refresh the device notebook or run its enabled account sync.

Sticky Todo at `5d6a8ff` searched nested task text and filtered the archive by status and goal. Sorting applies only to the search/progress results. Daily tasks keep their saved manual order, drag handles and capture draft. Closing the archive returns to the same day.

43 focused Flutter tests and a 63-case store, account and sync run passed. The latter included an edit made while a slower disk refresh was pending. The archive regression separately verified alphabetical ordering on both phone targets. API 35 retained a task across the 2037 → 2038 signed upgrade and kept the sort control at identical coordinates during a horizontal swipe to Stopped. iOS 26.4 reopened the saved task and searched, filtered, sorted and pulled the installed archive.

[Android](../reviews/phone-lists/android.png) · [iPhone](../reviews/phone-lists/iphone.png) · [Signed APK and unsigned IPA hashes](../reviews/phone-lists/release.json)
