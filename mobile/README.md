# Sticky Todo for Android

A native Flutter client for the same daily workflow as the desktop app: fast capture, nested steps, outcomes, deadlines, daily planning, goals, routines and Star Focus. The paper surface, phone navigation and explicit AI previews keep the task list central.

## Run and build

Use Flutter **3.47.8 stable**, Dart 3.13, a **JDK 17** (not only a JRE), and the Android SDK. Android 7 / API 24 or newer is supported. The application ID is `io.github.twomars4096.sticky_todo`.

```bash
cd mobile
flutter pub get --enforce-lockfile
flutter analyze
flutter test
flutter run
flutter build apk --debug --target-platform android-arm64
```

The installable **review APK** is `build/app/outputs/flutter-apk/app-debug.apk`. It is debug signed; use `adb install -r` or open the APK on your Android phone. It is not a Play Store production release. The GitHub **Flutter Android** workflow runs formatting, analysis, tests and an ARM64 debug build, and uploads the APK as a review artifact.

For distribution, create your release keystore, copy `android/key.properties.example` to the ignored `android/key.properties`, and fill its values locally. Then run `flutter build appbundle --release`. Release builds deliberately fail when a release key has not been supplied. Never commit a keystore or passwords.

## Use

- Capture at the top of Notes. Tap a task to reveal actions and steps; double tap the title to edit. Long press a root task to reorder; step arrows move children within their parent.
- Check a task to finish it. Tasks with an Outcome ask **Complete / Revise / Stop**. Completing a parent completes its steps; completing all steps with an Outcome asks for outcome review.
- Browse any date with the header. Today shows unfinished earlier work under **Earlier tasks**, without copying it. Move offers today/next day or a chosen date and keeps metadata. Matching tasks show read-only earlier steps.
- **Plan** takes an explicit time window and optional machines. The preview lists blocks chronologically and names unscheduled work. Apply replaces only unfinished generated blocks for that date; Undo preserves later edited/completed work. Suggestions remain proposals until accepted.
- **Goals** holds long-term goals and manually reset routines. **Focus** starts, pauses, resumes, restores and finishes sessions; its travel log retains 6, 12 or 24 sessions. Finishing a session does not complete the task.
- **Settings → AI assistance** supports saved Moonshot, OpenRouter, OpenAI, Anthropic, Gemini and custom HTTPS OpenAI-compatible profiles. API keys live in Android secure storage and are excluded from exports and synchronization. Connection tests use the unsaved draft without changing saved settings. Provider errors retain the actual reason, including rate limits, unsupported models and malformed output.
- The headphone action suggests a task-aware album list. A task’s menu copies a structured agent prompt for Diane or another assistant.
- Export or restore a complete JSON notebook through Android’s file picker. Markdown day export preserves desktop task IDs, nested status markers and finish metadata. **Import a checklist** accepts pasted Markdown as new tasks, preserving hierarchy and finish metadata with fresh IDs.

## Data and recovery

The phone works offline without an account or Diane. `sticky-todo.json` lives in app-private storage. Writes are serialized, written and flushed to a temporary file, then atomically renamed; a previous readable save is retained. A corrupted primary file is preserved before fallback recovery. An unreadable notebook is never silently treated as an empty notebook. Save failures keep edits on screen with a persistent Retry action.

Android system auto-backup is disabled so encrypted key material cannot be accidentally restored without its Keystore keys. Use the explicit export for migration, or the separate account/sync feature. Clearing Android app storage or uninstalling removes local data; export first when using the standalone app.

### Account integration seam

The separate `feature/google-account-sync` branch builds on this app. `StickyStore.syncRecords()` exports desktop-compatible `day:YYYY-MM-DD`, `goals`, and completed `focus:<missionId>` records. `applySyncRecord()` validates incoming records and persists them. `syncMetadata` stores per-account baselines/revisions; it is omitted from user exports. Credentials, device preferences and active focus timers are not sync records. `StickyApp.accountBuilder` adds account UI without making core startup depend on authentication.

## Feature parity and platform boundaries

| Desktop capability | Android implementation |
| --- | --- |
| Daily tasks, arbitrary nested steps, statuses, completion cascade | Implemented, with stable desktop-compatible JSON IDs |
| Date navigation, Today rollover, original-date backlog, promotion | Implemented without daily duplicate copies |
| Reorder roots and steps | Long press roots; accessible step up/down controls |
| Outcomes, due dates, deadline history, Complete / Revise / Stop | Implemented with explicit draft save/cancel |
| AI breakdown and outcome suggestions | Implemented with review/apply and stale task checks |
| Day planning, time/machines, preview/apply/discard, unscheduled tasks | Implemented with schema/time/overlap validation and stale-plan checks |
| Delete and plan Undo; recoverable saves | Implemented; Undo does not overwrite later edits |
| Goals and manually reset routines | Implemented |
| Focus controls, restore, route, history and retention | Implemented; the phone uses a native orbital route with pinch/pan rather than the desktop WebGL renderer |
| AI profiles, connection test, album suggestions | Implemented for all HTTP API providers |
| Clipboard and Markdown task interchange | Native clipboard, agent prompt, checklist import and Markdown day export |
| Paper / Frosted / Liquid materials | Phone-adapted static palettes; no perpetual decorative animation |
| Local Codex executable and Diane credential-file fallback | Desktop-only; Android cannot run or read the computer’s local processes/files |
| Diane companion dispatch/status/session link | Not available remotely: the companion backend explicitly rejects non-local hosts, even when remote bearer authentication succeeds. The current simplified desktop task row also omits dispatch controls. Android retains Copy agent prompt; see the protocol review below |
| Desktop file watchers and arbitrary knowledge-base directory | App-private atomic storage plus explicit file import/export. Account sync supplies automatic cross-platform transport on its separate branch |
| Tray, always-on-top window, desktop hotkeys, Tauri updater | Desktop-only. Android uses normal application lifecycle, touch/keyboard controls and signed APK/Play distribution |

### Dear Diane companion protocol review

Dear Diane supports authenticated remote HTTP access, but its **Todo companion API is deliberately local-only**. At inspected Dear Diane commit [`2581669`](https://github.com/2Mars4096/dear-diane/tree/2581669e8c8e07670db8fede7eb770a245fc6eef), [`src/diane/server/routers/sticky_todo.py`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/src/diane/server/routers/sticky_todo.py) attaches `Depends(local_only)` to `/api/sticky-todo`. That guard requires both the request client and URL hostname to be local and rejects a foreign Origin. It applies to project discovery, dispatch, status and stop. A phone request to a real HTTPS server origin fails that guard; the bearer-key check in [`src/diane/remote/access.py`](https://github.com/2Mars4096/dear-diane/blob/2581669e8c8e07670db8fede7eb770a245fc6eef/src/diane/remote/access.py) does not override it.

Todo's [`src-tauri/src/diane.rs`](../src-tauri/src/diane.rs) likewise targets the fixed computer loopback address `127.0.0.1:45173`. Its companion protocol preserves the selected Diane project and execution profile, and retries an immutable request UUID without starting a second run. The current desktop [Run in Diane documentation](../README.md#run-in-diane-companion-update-required) also records that the simplified task row omits dispatch controls while retaining settings and stored session links.

Diane's generic `/api/v2/agent-runs` endpoints are remotely usable, including by its own mobile client, but substituting them would require a separate project/profile selection and durable retry contract. They do not expose the Todo companion's saved defaults and request receipts. Matching the companion workflow on Android therefore requires an explicitly supported authenticated remote companion API in Dear Diane, including project/default discovery, idempotent dispatch, status/stop and browser session navigation. Adding a URL and bearer field to Todo alone would not enable that workflow.

This branch preserves **Copy agent prompt** and independent task/AI use. It does not change Dear Diane, weaken its local-only guard, deploy a relay, configure credentials or start an agent run. [Protocol findings and remaining work](../docs/plans/7-1-diane-remote-feasibility.md) record this functional gap explicitly.

## Verification

Verified with Flutter 3.47.8 / Dart 3.13.7: analyzer clean, **22 tests passed**, four phone screenshots inspected, and an **ARM64 debug APK built and signature-verified**.

`flutter test` covers local persistence/retry, malformed-import atomicity, nested/status/finish serialization, completion review, source-preserving moves, metadata, Undo, stale AI results, midnight rollover, Focus restore/retention, Markdown interchange, sync exclusions, precise AI errors and plan validation. Widget tests exercise capture/steps/goals at 360 px and enlarged text at 150%.

Optional actual Flutter review captures:

```bash
STICKY_SCREENSHOTS=/tmp/sticky-phone flutter test test/phone_preview_test.dart
```

The optional capture test renders 390×844 Notes, task actions, Goals and active Focus. It loads a local font for human review and does not add golden binaries to the repository. It is skipped in ordinary CI.

Physical-device acceptance remains separate: keyboard/IME, TalkBack, Android file-picker behavior, credential persistence, lifecycle under OS termination, authenticated provider calls and production signing. No API keys or live account were used during automated verification.
