# 24. Dockit interface languages

**Status:** completed for local language implementation. Physical iPhone installation remains in [client delivery](23-dockit-transfer.md).

**Goal:** Use the chosen interface language across the standalone notebook, Mac menus, phone apps, owned sign-in page and embedded workbench, keeping authored records intact.

The available choices are English, Simplified Chinese, Traditional Chinese, Cantonese, Japanese, Korean, French, German, Spanish and Portuguese. The standalone globe offers the device default or an explicit preference. The embedded module inherits its host's language.

## Five verification reviews

| Review | What was checked | Evidence and limits |
| --- | --- | --- |
| 1. Source and data boundaries | Inventoried 1,361 unique source messages across 108 files. Calls comprise 1,034 web/Mac, 607 embedded, 548 Flutter and 14 standalone sign-in sites. Wrapped code-owned UI strings and positional arguments. | The model received public program text through localhost only. An authored task literally named “Delete” and a mixed-script draft stayed unchanged when switching languages. |
| 2. Language quality | Checked 12,249 translated values across nine target locales for empty copy, missing keys, extra keys, misplaced placeholders and model artifacts. Reviewed frequently used actions, restoring a notebook, permissions, receipt states and brand names. | Reused matching local catalogs and the local HY-MT model; corrected flawed phrases and normalized Chinese scripts locally. The checks cover all catalog entries. Human native-speaker proofreading of every translation is outstanding. |
| 3. Interaction and layout | Selected each language from the actual globe in Chromium at 340px and 1100px. Tested fr-CA default, a retained draft, Portuguese after reload, localized settings, labels and globe geometry. Exercised all ten choices on Android and iPhone Flutter layouts. | Cantonese application copy is separate. Used Hong Kong Chinese for framework calendars/date data without a native Cantonese delegate. Corrected an observed French fallback and CJK date ordering. [Compact browser](../../output/interface/notebook-340-yue.png) · [Portuguese settings](../../output/interface/settings-340-pt.png). |
| 4. Native and storage | Android installed over the preceding signed preview on a synthetic emulator. French persisted after process restart, Cantonese opened, and original task trees, goals, focus and routines were preserved. Restored the prior preference. Rust compiled the localized Mac application and tray menus. | [Installed French](../../output/interface/installed-android-fr.png) · [Installed Cantonese](../../output/interface/installed-android-yue.png). A physical iPhone and its system document picker were unavailable. Xcode reported the iOS 26.4 platform missing. Operating-system dialogs and external-service error details can use their issuing system’s language. |
| 5. Package and compatibility | Used the real Shiprite-vendored **0.1.19** archive as the behavior baseline for producer **0.1.21**. Retained all 80 baseline paths and all 13 upstream test sources byte-for-byte; preserved the original public exports, host contract, dependency list and permissions. | Fifteen embedded test suites passed (75 tests), including live host language changes with a retained draft. The producer adds localized source and compiled ESM while retaining the original task editor, weekly-document editor/review, settings and execution APIs. [0.1.21 package](../../output/interface/diane-app-todo-plugin-0.1.21.tgz). |

## Rebuild

1. From the product root, run `node scripts/audit-interface.cjs`, then `python3 scripts/sync-interface.py` to verify the source inventory and generate Flutter, sign-in and package lookups.
2. Run `npm test`, `npm run build:frontend` and the normal Mac and Flutter client builds. English uses the source messages. The nine locale files each contain every source key.
3. In `plugin/`, run `npm run typecheck`, `npm run build`, `npm test -- --run` and `npm pack --offline --ignore-scripts`. Versioned producer inputs are in the product tree and work without the original staging folder. The tarball contains both `dist/index.js` / `dist/index.css` and source exports.
4. When copy changes, run `node scripts/audit-interface.cjs --update-inventory`, update each translated catalog and rerun the checks above.

The 0.1.19 baseline tarball SHA-256 is `c7dbf208c3088c60b63518824b0d1d6bc4cfe278dd359eae16d81488d5549bd0`. The reviewed 0.1.21 local tarball SHA-256 is `dddf7e7599b996312950761dc1a4ef33ecffef11b096e4d863b32b40fdf4ce1c`.

## Final checks

The source audit reports zero missing, extra, empty or invalid-placeholder values for every target locale and zero known model-instruction artifacts. Some entries legitimately match the English spelling (for example product names, file paths and international technical abbreviations). No runtime translator is needed.

All 33 Node suites, 75 embedded tests and 153 Flutter tests passed; one existing Flutter test remained skipped. TypeScript, the plugin typecheck and the focused Flutter analyzer passed. The final Android preview APK SHA-256 is `8df70f3f071167af88e38a5fffc3fa2e04b962ed54124cd26b04a5c617024a15`. Reopening it in French used a newly captured accessibility tree and a painted notebook screenshot after force-stop. [APK](../../output/clients/Dockit-debug.apk) · [Mac app](../../output/clients/Dockit.app).
