# 25. Dockit five-cycle element review and Flutter exports

**Status:** Reviewed current local product source and the states listed below. The evidence preserves partial observations and unexercised feature gates.

## What was reviewed

Each source row has a real file span, a locale, a build reference and five separate findings: source binding, catalog resolution, placeholder equivalence, residue checks and literal sentinel preservation. Runtime rows use a page/state, locale, actual selector/widget/AX path, text role and five separately captured observations. The five passes cover presence, localized wording, geometry, accessible role/name and repeatability. A missing observation stays missing. A native menu option, an accessibility node and a visible text run are distinct records.

The matrix uses English, Simplified Chinese, Traditional Chinese, Cantonese, Japanese, Korean, French, German, Spanish and Portuguese. Fresh runs used synthetic notebook content, offline account/service fixtures and disposable app identities.

| Surface and build scope | State renders | Elements observed five times | Partial elements | Actual cycle observations |
|---|---:|---:|---:|---:|
| web-wide | 900 | 6,680 | 0 | 33,400 |
| web-compact | 900 | 5,710 | 0 | 28,550 |
| mac-shared | 1,000 | 8,940 | 0 | 44,700 |
| signin | 250 | 280 | 0 | 1,400 |
| embedded | 550 | 1,670 | 0 | 8,350 |
| account-fixture | 500 | 2,060 | 0 | 10,300 |
| web-components | 1,150 | 5,210 | 0 | 26,050 |
| embedded-components | 1,150 | 5,770 | 0 | 28,850 |
| flutter-android | 950 | 6,035 | 0 | 30,175 |
| flutter-iOS | 865 | 5,172 | 0 | 25,860 |
| counter-android | 200 | 40 | 0 | 200 |
| counter-iOS | 200 | 40 | 0 | 200 |
| android-installed | 150 | 480 | 0 | 2,400 |
| ios-native-xctest | 150 | 574 | 32 | 2,950 |
| ios-cantonese-guard | 15 | 59 | 0 | 295 |
| ios-simulator-engine | 950 | 5,623 | 118 | 28,267 |
| mac-native-debug | 1,000 | 6,310 | 0 | 31,550 |

**Measured totals.** 10,880 state renders and 303,497 element observations. 60,653 of 60,803 observed locale/state/element identities have all five, with 150 retained partial identities. 2,537 source occurrences × 10 locales × 5 passes produced 126,850 source findings. These totals describe independent evidence layers.

## Fixes and follow-up checks

- Restored legible compact Focus-rail controls and timer terminology. Separated opening a notebook date from a task’s unfinished state. Allowed the compact Focus route summary to wrap. Verified compact/wide browser and native Mac views.
- Wrapped all six compact native settings tabs into two rows when necessary. The earlier Spanish Updates label extended beyond the Mac-window viewport in the bridge fixture. Repeated the Mac fixture and actual native WKWebView checks.
- Corrected singular and plural search-result and progress counts in the standalone, Flutter and embedded clients. The extra component and phone tests check one and two results across all ten locales. Underlying notebook contents and status codes are independent of these labels.
- The first original Cantonese relaunch could be mistaken for Traditional Chinese because the two globe labels coincide. The corrected guard verifies the distinct capture prompt before termination and after relaunch. All five fresh transitions on the exact exported simulator app passed. Original and corrective observations remain separate.

## Scope and outstanding limits

Of 25,370 source/locale cells, 7,661 share a literal or template with captured states, 14,829 have no candidate in their mapped surfaces, and 2,880 are runtime-only expressions. Matching copy can occur in several components; these counts do not prove that a specific source branch executed.

The [feature and gate table](../reviews/25-interface-elements/feature-gates.csv) groups unmatched source cells by concrete workflow and lists representative source keys. The [source-to-render crosswalk](../reviews/25-interface-elements/source-render-links.jsonl.gz) retains every occurrence, source span and candidate page/state. Unmatched fragments, live user values and translated templates must be distinguished from a missing whole page. Real Google consent, real member assignments, live model responses, destructive recovery, OS document/screen-picking permissions, installer errors and physical-iPhone execution remain outside this local synthetic exercise.

Native Android evidence is the installed Preview package on a synthetic emulator. Broader Android route evidence used the host Flutter renderer. Native iPhone XCTest exercised the actual installed app; the deeper Simulator route matrix used the actual iOS Flutter engine with isolated synthetic routes. Mac native evidence came from a separate Tauri debug bundle that checked its synthetic KB path before any read or write. Standalone Chromium, Tauri bridge fixtures and native WKWebView are separately identified. Supplemental component pages mount real production components with synthetic adapters; they do not establish live host/provider access.

The original iPhone test has 32 partial Cantonese notebook/menu identities, preserved alongside the independent guarded retest. The simulator-engine menu has 118 partial accessibility identities caused by staggered menu exposure. All 118 have same-text language-option witnesses on all five native UIKit visits; those witnesses are linked separately, without filling missing cycles in another build. See [partial identities](../reviews/25-interface-elements/partial-elements.jsonl.gz).


### Unmatched source cells by feature

| Page or gate | No matching captured string | Runtime-value cells | Representative unmatched source key |
|---|---:|---:|---|
| Notebook and task operations · date/finish states, long text, retry, persistence and validation | 2832 | 0 | . Changed |
| Project and multi-day project planning · editing, stale plans, failed saves, proposals and scheduled work | 1906 | 0 | . Saved tasks and steps will remain. |
| Focus · active/paused/completed missions, orbital map details and historical state | 1318 | 0 | +{0} archived mission |
| Accounts and sync · live identity, provider/configuration failure, sync conflict, recovery and retry | 1298 | 0 | Account changed before the request. |
| Shell and other controls · transient navigation, notices, integrations or data-dependent text | 1208 | 0 |  · Set up |
| Goals and routines · long-term work, reminders, destructive choices and history | 1152 | 0 | Add a goal |
| Day plan and suggestions · constraints, generated proposals, apply/discard and provider failures | 1018 | 0 | (optional) |
| Assignment and execution · workspace/recipient selection, approval/revision states and external run details | 1010 | 0 | A newer result is available. |
| Meeting intake · specific saved analyses, linked tasks, citation revisions and missing passages | 810 | 0 | Add to today |
| Settings · storage, appearance, AI configuration, developer tools and integrations | 768 | 0 | A matching Shiprite key is available. You can change key reuse in Integrations. |
| Search and progress · mixed filters, retained history, limits and unavailable records | 494 | 0 |  · Due {0} |
| Conflict and recovery · conflicting cloud records, saved copies and restore confirmation | 358 | 0 | (Blank task) |
| Embedded document/editor · weekly files, recovery, host reconciliation and edit decisions | 279 | 0 | Changes not saved. Your edits stay here. |
| Platform-owned operations · update phases, screenshot capture, OS file pickers and errors | 239 | 0 | A document picker is open. |
| macOS application and tray menus · native menu/popover outside the web document | 89 | 0 | About Dockit |
| Legacy sign-in · account selection, cancellation, denied completion and return | 50 | 0 | Connecting… |
| Runtime record or computed value · no static string identity | 0 | 2880 | User-authored or computed content |

These are counts of source-occurrence/locale comparisons. A source can have no text match because a fragment joins other text, a placeholder contains a variable, a shared string has several possible sources, or the triggering data was absent. The workbook-sized crosswalk is available as compressed JSONL, with each original source span intact.

## Evidence and reproduction

[Source ledger](../reviews/25-interface-elements/source-five.jsonl.gz) · [Rendered ledger](../reviews/25-interface-elements/rendered-five.jsonl.gz) · [State names and counts](../reviews/25-interface-elements/state-coverage.csv) · [Detailed summary](../reviews/25-interface-elements/review-summary.json) · [Checksums](../reviews/25-interface-elements/SHA256SUMS). The collectors and reconciliation code are in [scripts/interface-review](../../scripts/interface-review/).

## Local phone exports

[Release arm64 Android APK](../../output/clients/android-release/Dockit-arm64-v8a-release.apk) · [armeabi-v7a APK](../../output/clients/android-release/Dockit-armeabi-v7a-release.apk) · [x86_64 APK](../../output/clients/android-release/Dockit-x86_64-release.apk) · [Preview APK](../../output/clients/Dockit-debug.apk) · [Simulator app](../../output/clients/ios-simulator/Dockit.app) · [Unsigned device app](../../output/clients/ios-device/Dockit.app) · [Unsigned IPA](../../output/clients/ios-device/Dockit-unsigned.ipa).

The ARM64 release uses the original application ID and the historical production signer and advances version code 2029 to 2030. Preview has its own application ID and debug signer. The IPA contains the arm64 device app under `Payload/Dockit.app`; it needs provisioning and signing for a physical iPhone. The archive-count run used the [0.1.23 Dockit plugin](../../output/interface-five/diane-app-todo-plugin-0.1.23.tgz). The older instrumented simulator bundle and Cantonese-tested export are retained separately.


## Build provenance

The broad release-0.1.22-equivalent sweeps preceded the archive-count correction. Actual installed Android and Simulator shell checks used the explicit APK and executable fingerprints in the native ledgers. For iOS, the deeper 950-render fixture ran on the real simulator under its own bundle identity; its completed rows were streamed before automatic test-app removal. The archive-count producer was **0.1.23**, SHA-256 **73902ddcdd505a80a69aab39de9ef22b03b09f06794bb80ea4afcbb7405ee787**. The correction was then checked in 1,150 standalone and 1,150 embedded real-component state renders, and in the Android and iPhone Flutter-host count tests (200 individual count observations per platform). The final corrected code was rebuilt for each local export. The entire native broad matrix was not rerun against those final two count strings.

[Signed APK and Apple export fingerprints](../reviews/25-interface-elements/final-exports.json) include complete app-tree hashes for the simulator, the earlier exact Cantonese-tested and XCTest-tested simulator apps, and the unsigned device app. The root installable production Android ID is `io.github.twomars4096.sticky_todo`. Only the Android release build overrides the local version to `2.1.17+30` so arm64 receives code 2030. The Preview package does not upgrade a production install. Android upgrade identity was checked by signature, package and version comparison. No production account, production-device data or publishing action was used.

The exact simulator app used for the successful Cantonese retest is [retained separately](../../output/clients/ios-simulator/Dockit-Cantonese-tested.app). The [first XCUITest build](../../output/clients/ios-simulator/Dockit-tested.app) is also retained. Treat the first original Cantonese relaunch and the incompletely exposed staggered-menu semantics as historical limitations; the raw results were not overwritten.

## Goal, reminder, deadline and Focus follow-up

The [supplemental baseline](../reviews/25-interface-elements/supplemental-goal-focus/render-summary.json) exercised 23 real notebook states five times in all ten languages. Each run created a goal and a routine, cancelled a reminder edit, changed its cadence, paused and resumed it, saved and cancelled a task date, reviewed and revised a finish promise, recovered from a forced notebook write failure, and finished a Focus session. Each recent archive showed six missions and each full archive showed ten. The baseline captured 46,470 element observations. It retained 21 partial identities on the recovered task list. [Functional evidence](../reviews/25-interface-elements/supplemental-goal-focus/workflow-evidence.json)

Three corrections followed. The standalone Focus phase names use the selected language when displayed. Open and completed deadline badges follow the selected calendar locale. The goal header names unfinished goals and active routines, with separate singular and plural forms. The embedded producer is [0.1.24](../../output/interface-five/diane-app-todo-plugin-0.1.24.tgz), SHA-256 `01ac25f20b14a097c92b823a41d6a4c7e06c12a76f774fe37dd23dd12715a665`. All 75 plugin tests, type checking, offline dist rendering, package validation and 33 standalone Node suites passed.

| Focused retest, ten languages × five cycles | Observations |
|---|---:|
| Full standalone notebook, saved due date, five phases in running/paused/resumed Focus and inline paused label | [850](../reviews/25-interface-elements/supplemental-goal-focus/corrected/notebook.json) |
| Standalone components, zero/one/three goals and routines, open, closed, today and overdue dates | [1,050](../reviews/25-interface-elements/supplemental-goal-focus/corrected/web.json) |
| Embedded production components, same counts and deadlines | [1,050](../reviews/25-interface-elements/supplemental-goal-focus/corrected/embedded.json) |
| Native macOS WKWebView, 100 isolated notebook/component visits covering phase names, counts and deadlines | [1,100](../reviews/25-interface-elements/supplemental-goal-focus/corrected/mac-wkwebview.json) |
| Flutter daily notebook, actual localized saved deadline in Android layout | [50](../reviews/25-interface-elements/supplemental-goal-focus/corrected/flutter-android.json) |
| Flutter daily notebook, actual localized saved deadline in iPhone layout | [50](../reviews/25-interface-elements/supplemental-goal-focus/corrected/flutter-iOS.json) |

The Flutter date format uses the phone's compact day-and-month design. Flutter's goals and Focus screens have their own controls. The embedded plugin has no standalone mission-phase route. The evidence above covers local synthetic workflows and host-rendered mobile widgets. The installed-device baseline and its outstanding feature gates remain recorded separately above.

### Corrected phone and Mac exports

The final Flutter exports use version **2.1.18+31**. The [release APK for ARM64](../../output/clients/android-release/Dockit-arm64-v8a-release.apk) has version code **2031**, SHA-256 `398c2e2dba41ae2ab35dfad05f824f6bc9af0e26f6925ffe9c7e3071caff7c7b`, and the existing production package ID and certificate. The [Preview APK](../../output/clients/Dockit-debug.apk) retains its separate ID. The [iPhone Simulator app](../../output/clients/ios-simulator/Dockit.app), [unsigned iPhone device app](../../output/clients/ios-device/Dockit.app) and [unsigned IPA](../../output/clients/ios-device/Dockit-unsigned.ipa) were rebuilt. The IPA SHA-256 is `6a15d9bd5b5b91aae42f3c87f202dbc5fcd5293f0c5ba78f268781a266b90323`; its device binary was verified inside `Payload/Dockit.app`. A physical iPhone requires provisioning and signing. The rebuilt [Mac app](../../output/clients/Dockit.app) passed strict deep code-signature verification. [Hashes for all platform builds](../reviews/25-interface-elements/supplemental-goal-focus/corrected/final-exports.json) · [4,150 targeted observations](../reviews/25-interface-elements/supplemental-goal-focus/corrected/result.json)

## Build 32 deadline verification

Version 2.1.19+32 displays saved task deadlines using the selected phone language's month and day format. The French, Spanish and Portuguese labels describe a deadline. For December 12 the Japanese rendering is 「期限：12月12日」 and the French rendering is “Échéance : 12 déc.”.

- [x] Verify the saved deadline on both Flutter phone layouts, five times per language. [50 Android observations](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/flutter-android.json) · [50 iPhone observations](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/flutter-iOS.json)
- [x] Verify the translated ISO deadline on an actual archive task row in standalone and embedded Dockit. [100 observations across ten languages and five cycles](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/archive-deadline.json)
- [x] Export and fingerprint the [signed ARM64 APK](../../output/clients/android-release/Dockit-arm64-v8a-release.apk), [iPhone Simulator app](../../output/clients/ios-simulator/Dockit.app), [unsigned device IPA](../../output/clients/ios-device/Dockit-unsigned.ipa) and [embedded package 0.1.25](../../output/interface-five/diane-app-todo-plugin-0.1.25.tgz). The Android release retains the production certificate and package ID with version code 2032. Physical iPhone installation requires provisioning and signing. [All export hashes](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/final-exports.json)
- [x] Confirm the visible deadline after switching language and relaunching the exported build 32 iPhone Simulator app five times per language. All 50 switches and relaunches passed on iOS 26.4. The installed bundle matched the export byte for byte by tree hash. [Native receipt and observed labels](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/installed-ios32.json) · [1,150 visible and accessibility text observations](../reviews/25-interface-elements/supplemental-goal-focus/corrected/deadline32/installed-ios32-elements.jsonl.gz)

Build 31 has a [separate installed iPhone receipt](../reviews/25-interface-elements/supplemental-goal-focus/corrected/installed-ios31/receipt.json), [reviewed simulator bundle](../../output/clients/ios-simulator/Dockit-build31-reviewed.app) and [historical export hashes](../reviews/25-interface-elements/supplemental-goal-focus/corrected/final-exports.json). The standard export paths above now contain build 32.

## Archive filters and adjacent controls

- [x] Measure the bounding boxes of visible controls and text in English and German. The [original geometry ledger](../../output/clients/pair-review/adjacent-pairs.jsonl.gz) contains 303 profile/state observations across 92 named states, 6,168 element observations, 92,513 non-contained pairs and 8,057 nearby pairs. The web and standalone component profiles contributed 111 observations, Mac bridge and native WKWebView 81, embedded components 38, Android Flutter layouts 38 and iPhone Flutter layouts 35. See the [per-profile totals](../../output/clients/pair-review/pair-summary.json) and [screen index](../../output/clients/pair-review/screen-index/).
- [x] Correct archive filter overflow in Search and Progress. At 320px, a long project name made the filter area scroll 1,948px horizontally. All five compact and wide browser/Mac-bridge retests measured zero filter-region overflow. Reset clears the active filters, restores matching results and puts keyboard focus in search or on the retained progress date. [Before](../../output/clients/pair-review/archive-before.json) · [After](../../output/clients/pair-review/archive-after.json) · [Regression](../../tests/check-archive-filters.cjs)
- [x] Check the embedded search and progress controls along with project editing, scheduling, closed and missing projects. The producer package is [0.1.28](../../output/clients/pair-review/diane-app-todo-plugin-0.1.28.tgz), SHA-256 `086ee2ef1d3410850b11cdb00ba775691b67949eaee2a5844b971eb52c76d1ff`. [Compact embedded states](../../output/clients/pair-review/embedded-components-460-de.json)
- [x] Simplify the standalone settings heading and Style section. The German Storage tab now says where the browser saves the notebook. The final production bundle passed 12 web and 12 synthetic Mac-bridge settings visits at 340, 390, 460 and 1,100px. All selected tabs exposed their active state, all tab labels fit their navigation area, and Escape closed each dialog. All six Mac sections also passed in a native 460px WKWebView using a synthetic local bridge. The local [arm64 Mac app](../../output/clients/pair-review/macOS/Dockit.app) passed strict deep verification with an ad hoc signature. [Before](../../output/clients/pair-review/settings-before.json) · [Final React geometry and screenshot filenames](../../output/clients/pair-review/settings-after.json) · [Final native WebKit geometry](../../output/clients/pair-review/settings-final-webkit.json)
- [x] Verify build 34 on an installed [Android API 35 emulator](../../output/clients/pair-review/installed-android.json) and [iOS 26.4 Simulator](../../output/clients/pair-review/installed-ios.json). Each opened Search, filtered out a real fixture task, reset twice and accepted more typing without tapping the field again. Flutter passed 161 tests with one existing skip. [Phone exports and signatures](../../output/clients/pair-review/builds.json) · [ARM64 APK](../../output/clients/pair-review/Dockit-arm64-v8a-release.apk) · [unsigned device IPA](../../output/clients/pair-review/Dockit-unsigned.ipa)

The original ledger flagged 1,403 close control pairs and 219 intersecting rectangles. Of the intersections, 192 occurred with the phone language menu open. These measurements include background elements, labels within controls, and partially clipped items. They identify candidates for inspection. They do not establish 219 usability defects. No measured visible element extended beyond the viewport under the collector’s rule. The installed-phone retests were narrower than the Flutter layout sweeps. Physical iPhone installation, interaction with the packaged Mac window and live authenticated integrations remain open.
