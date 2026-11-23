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

## Notebook language loading

- [x] Split nine language catalogs out of the shared initial module and mount the notebook while the selected language loads.
- [x] Run all 33 Node suites. Chromium opened the production build in English, French and Japanese. The latter two typed into the notebook during an intentionally stalled catalog download and retained the draft after translation. Each requested only its own catalog. English requested none.
- [x] Publish Hosting version `af423af58e95a0f8`. Production entry bytes fell from 1,598,894 to 769,341 (gzip level 6 from 466,010 to 214,455). Compare all 22 staged app files with the live site, retain the 15 other original file hashes and verify both app URLs and the shared-task route.
- [x] Build the [local Mac application](../../output/clients/phased-loading/macOS/Dockit.app), version 2.1.17, and verify its ad-hoc signature and bundled screenshot helper. The executable SHA-256 is `efdad0a45807ac5ce8a669b9feb34a1c6dac10b0bd07888e5ee0bca59cf28df6`.

## Peer navigation alignment (2026-11-22)

At 390 × 844 with the same safe-area insets, the first entry field started at y103 in Notes and y104 in Goals. Both shared the y730 bottom rail with Focus. Focus opened on its timer at y32. These measurements came from the production Flutter widget trees with isolated records on Android and iOS test targets.

At 1280 × 800, Search and Progress shared a header ending at y52 and a results area beginning at y102. Notes used a date header ending at y63. The lower action bar stayed at y756. The web and packaged Mac frontend were measured in Chromium, with a test bridge for the Mac sample.

## Icon-only footer navigation

- [x] On both phone targets, position Notes, Goals, Focus and the drawer mark in one 56 px row above the safe inset. At 390 × 844 with a 20 px bottom inset every icon had center y=796 on all three destinations. The centers of the actual painted glyph bounds differed by at most 0.5 px. At 320 × 740 and 140% text, the four phone regression cases passed, including at least 48 px touch targets, semantic labels, translated long-press names and selection.
- [x] Verify 2.1.24+39. Android upgraded on API 35 from code 2038 to 2039, retained its original install time and a synthetic notebook task, and opened all three tabs and the drawer. APK SHA-256 `13354778eac61d7921b85ba9ed0104b3f6bb4565c720e772a8ed4f355c1634ac`. The iPhone simulator installed and launched the same source version. The unsigned device IPA SHA-256 is `e8f46699e7f7acb264229bf4bc25f42e5e589e80b0cb82057351632914cc47ef`.
- [x] Test the shared web and Mac footer at 320 and 1280 px. Both kept all controls in view. Icons centered within their buttons, archive destinations exposed selection, and French supplied the accessible names. All 33 Node suites and TypeScript passed. Verified all 22 public files, both app URLs and the task route under Hosting version `db753a242062602f`. The 28 other pre-existing hashes were preserved.
- [x] Verify the ad-hoc signature, helper and native task creation/reopen in Mac 2.1.18. Its main executable SHA-256 is `7eb24ffeec2d737d45fdca27af5ab58a07e2fe748ea15e1b6ed2b6ca27413d57`. Removed the unpublishable 2.1.17 updater archive from the generated bundle directory after confirming the replacement and retaining an external rollback copy.

## Transparent phone drawer mark

- [x] Draw the approved stacked folders, three amber tabs and notched tray as a transparent 24 px vector mark for the phone footer. Keep the launcher, Settings and empty-notebook artwork. Use one notebook-colored Material and a 56 × 56 leading drawer target. Notes, Goals and Focus divide the remaining width equally.
- [x] Render all three tabs on Android and iOS at 390 × 844. Each destination was 111⅓ × 56 px. All controls centered at y=796. The painted ink centers were within one pixel of each other. Verify the corners of the mark and the full-width surface for Paper, Frosted and Liquid. Seven final Flutter checks passed, including the 320 px / 140% text drawer, focus, selection, tooltips and semantic checks.
- [x] Install signed build 2039 on a clean API 35 guest, save a task, upgrade directly to 2041 and reopen the task. The installation timestamp and release signer matched. Accessibility bounds measured a 147 px square followed by three 311 × 147 px destinations on the 1080 px display. Open each destination and the drawer. The installed APK SHA-256 is `7b02bee4033f4050651af2218d9007cb7e3fcf7fcdbe825e8bcb7131f012188f`.
- [x] Install iPhone simulator build 41 and exercise Notes, Goals and Focus. The actual 402-point viewport exposed a 56-point drawer and three 115⅓-point destinations. The unsigned iPhone device IPA SHA-256 is `3fd3d3cf0c324c1a4f5df8bea2935ea564bab338c1ff596aedefff6cdfcd7e48`. Both phone platforms are on 2.1.25+41. The web and Mac action bars have no drawer mark and continue to use the 2.1.18 footer.

## Phone footer clearance

- [x] Use a 48 × 48 drawer target followed by three equal destinations on the existing notebook material. All four controls sit 24 logical pixels above the device’s safe bottom.
- [x] Seven Flutter visual, material, navigation and accessibility checks passed. At 390 × 844 with 20 px bottom inset, the 48 px row occupies y=776–824. The icon centers are y=800, compared with y=796 previously.
- [x] Upgrade directly from Android 2041 to 2042 while retaining install time and the saved synthetic task. On the installed 1080 × 2400 API 35 guest at 420 dpi, the 126 px square drawer and three 318 × 126 px destinations spanned y=2211–2337 across all tabs. The center was exactly 63 physical pixels (24 dp) above the usable bottom.
- [x] Install simulator build 42 and visit Notes, Goals and Focus. The actual 402 pt viewport put the 48 pt drawer and three 118 × 48 pt destinations at y=792–840. Each selected destination exposed its selected accessibility trait.
- [x] Export both platforms as 2.1.26+42. Signed ARM64 APK SHA-256 `7d25ca3fb54b2f4980e0bf911944a68bb965708e7d463d523b72c90ea4d5afad`. Unsigned device IPA SHA-256 `102660a96668711696f7c214051e442c85aace3ece9b67aa4c494af52b02fe05`.

## Shared sign-in and account management

- [x] Use provider-neutral shared login prompts and verified-email messaging; retain the standalone service’s Google prompts. Expose the shared account manager in Account settings, with a fixed system-browser URL. Keep workspace assignment, membership and sync settings separate.
- [x] Verify all ten interface languages and run all 33 Node suites, TypeScript, and 53 Flutter account, sign-in-return, sync and navigation tests. Isolated browser and Mac frontend checks covered both shared and standalone modes and the exact URL passed to the native launcher.
- [x] Publish Hosting version `72cdbcb4bbd01d32`. All 22 staged public app files matched the release. The prior 31 other file hashes were retained. A clean browser followed the actual Settings link from `/app/` to `https://pipedreams.work/account`.
- [x] Replace the installed `/Applications/Dockit.app` through a normal quit/relaunch. Mac 2.1.19 retains its bundle identity, ad-hoc signature class and identical native screenshot helper. The new executable’s SHA-256 is `32aad33f34dd97180c114b77c2c21b8885f85ec2c32d1612d433bb32731c0b07`.
- [x] Install Android 2.1.27 build 2043 over 2042 with the same release certificate, existing install time and prior dated task. Verify shared sign-in and manager controls on the installed Android and iPhone simulator builds. The suite ARM64 APK SHA-256 is `13bccae63407cafc358c5f5040bf89c943166596014f4206ee7dd8d6c3b335f5`. The unsigned device IPA SHA-256 is `865f961fd4d529b4e17d3a9e67c6ed583fb1faad58d5d719ddb05824fd588d48`.
