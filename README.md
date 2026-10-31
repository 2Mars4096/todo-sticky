# Sticky Todo

A compact desktop planner for daily tasks, clear outcomes, and focused work. Tasks stay in local Markdown files; AI assistance is optional.

Repository files: [folder and script guide](docs/folder-guide.md), including hidden directories and safe cleanup rules.

## Install

Local macOS installation: `/Applications/Sticky Todo.app` includes the reviewed workflow improvements and deployed sync service URL (2026-10-30). Open **Settings → Account → Continue with Google**, then enable **Sync this task folder** when ready. See [account setup](docs/account-sync.md).

Local Android release build: `release/todo-sticky.apk` (ARM64, 19.49 MB, release-signed, sync URL prefilled). The local `release/` folder is excluded from Git.

Android source 2.1.15+9 adds Earlier-to-Today dragging and **Goals → plan → linked daily tasks → Progress**. Add steps manually or review an AI proposal, then schedule selected steps for Today or another date. Completion follows the actual daily tasks. See [Android usage and preview build](mobile/README.md). The separately installable preview is used when the original production signing key is unavailable. New goal-plan data stays on the device until the compatible sync backend is deployed; existing production APKs remain available.

Download the latest installer from [Releases](https://github.com/2Mars4096/todo-sticky/releases):

| Platform | File |
|----------|------|
| **macOS** (Intel + Apple Silicon) | `.dmg` |
| **Windows** | `.msi` or `.exe` |
| **Linux** | `.deb` or `.AppImage` |

First launch opens the task list with the **What needs doing?** field ready. Write a task, then choose **Add** or press **Cmd/Ctrl+Enter**. Enter inserts a new line; paragraphs and blank lines stay with the task. AI setup is optional and can wait until you need it.

Open **Settings** to configure tools by purpose:

| Section | What it contains |
|---------|------------------|
| **Storage** | Current task folder and **Change task folder**. The default is `~/Documents/Sticky Todo`; task files live in `content/to-do/` inside it. |
| **AI** | Provider and key, with **Model and connection options** and **Scheduling machines (optional)** available on demand. |
| **Integrations** | Optional Dear Diane task handoff and reuse of matching local Diane credentials. |
| **Account** | Optional Google sign-in and task sync in the current source/local build; requires a deployed sync service. |
| **Updates** | Check for, download, and install app updates. |

For AI assistance, choose Moonshot, OpenRouter, OpenAI, Anthropic, Gemini, a custom OpenAI-compatible endpoint, or **Codex (ChatGPT login)**. API providers use their configured endpoint, key, and model. Codex reuses your existing local `codex login`; its model can be blank, and its executable defaults to `codex` with common install paths detected. Use **Test connection**, then save the settings.

**If Plan fails after a successful connection test:** save the tested settings first. Test connection checks the current form with a short request (or the Codex login); planning uses the saved provider and asks for a longer structured response. Plan shows the actual provider error, including unavailable models, timeouts, empty/truncated replies and invalid JSON. Your tasks change only after a valid proposal is applied.

The window appears after the app shell is ready; a short fallback keeps startup errors visible if frontend loading fails.

On macOS, the default task folder and local app-state folder stay anchored to the signed-in account, so launching Sticky Todo from an installer or automation tool cannot silently open a separate empty data store.

If macOS or Dropbox has offloaded the Markdown archive, Sticky Todo reports **Tasks are waiting in Dropbox** instead of treating the archive as empty or waiting forever. Reveal the configured `content/to-do/.../index.md` file in Finder, choose **Make available offline** or **Download now**, then use **Retry** after the file becomes local.

By default, Todo uses Diane’s existing OpenRouter, OpenAI or Moonshot key on the same computer when the provider URL matches, then falls back to Todo’s own key. Diane does not need to be open. Turn off **Use Diane credentials when available** in **Settings → Integrations** to use Todo’s key exclusively. Existing `.env` files, keys and model choices are preserved; there is no Keychain access or cross-device sync. Launch an updated Diane once to advertise its file locations; older installs can use the existing `~/.dan/graphs_dir` marker.

Each provider keeps its own API URL, key, and last-used model. Switch providers in **Settings → AI**; wider windows also show a quick selector beside Settings. Choosing an unconfigured provider opens its setup.

> macOS Gatekeeper may warn about an unsigned app. Right-click → **Open** to bypass.

## Update

The app checks for updates at launch and every 15 minutes, including overdue checks when you return. A dot on **Settings** marks an available update, and another dot marks **Download and install** or **Restart now** inside Settings. Checks run quietly; installation and restart stay manual.

You can also open **Settings → Updates → Check for updates**. When a newer release is available, choose **Download and install**, then **Restart now**. Windows restarts through its installer. Save changed settings and finish any focus session first. Tasks and settings stay in their existing storage.

Version 2.1.0 introduces in-app updates. Older installations need one manual upgrade to this version; later published GitHub releases can be installed from the app.

### Publish an update

Run `npm run release` from a clean `main` branch after committing the changes. This bumps the patch version and pushes its version tag. GitHub Actions builds signed installers for macOS, Windows, and Linux, validates the complete `latest.json`, and publishes the release when all builds succeed. A normal branch push does not publish an app update. If packaging fails, fix the workflow on `main`, then run `gh workflow run release.yml -f release_tag=v2.1.0` with the failed version tag; the retry builds that exact tagged source without moving the tag.

The workflow needs the repository secret `TAURI_SIGNING_PRIVATE_KEY` and, for an encrypted key, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Keep a backup of the original signing key; replacing it breaks trust for existing installations. For a local release build, set `TAURI_SIGNING_PRIVATE_KEY` to the key file path and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to its password (empty for the current key). Never commit the private key.

## Demos

Recorded from the **2.1.12 source UI** using fictional tasks in an isolated browser. AI steps and planning responses are fixed examples, not live model output. Native window behavior and file sync are not demonstrated here. [Download installers](https://github.com/2Mars4096/todo-sticky/releases).

### Capture, break down, and move tasks

Add a task, request suggested steps, then move unfinished work to tomorrow and navigate to that day. These are the original demo scenarios, refreshed for the current controls.

<img src="demo/demo.gif" width="600" alt="Add picnic supplies, break a fictional postcard task into steps, and move library books to tomorrow">

[Watch the MP4](demo/demo.mp4)

### Preview a day plan

Set available hours, generate a proposal, review its blocks, and apply it. **Undo** restores the previous tasks.

<img src="demo/planning.gif" width="600" alt="Review a sample morning plan before applying it, then undo the change">

[Watch the MP4](demo/planning.mp4)

### Define an outcome and due date

Record what finished means and save a due date. Both remain visible when you select another task.

<img src="demo/outcomes.gif" width="600" alt="Set a print-ready postcard outcome and save its due date">

[Watch the MP4](demo/outcomes.mp4)

### Focus on one task

Start a Star Focus session, pause and resume, then finish the session and return to your tasks. Finishing a session does not complete the task for you.

<img src="demo/focus.gif" width="600" alt="Start, pause, resume and finish a Star Focus session for the fictional postcard task">

[Watch the MP4](demo/focus.mp4)

### Keep goals and settings close

Add a long-term goal and a manually reset routine, then browse the compact Settings sections.

<img src="demo/goals-settings.gif" width="600" alt="Add a drawing-club goal and desk-tidying routine, then browse Settings">

[Watch the MP4](demo/goals-settings.mp4)

See [demo/README.md](demo/README.md) to reproduce the recordings safely.

## Note materials and earlier tasks

Drag an earlier task's six-dot handle above the **Earlier tasks** divider to place it among Today's tasks. An empty Today has its own drop area. The full task, steps, outcome and deadline move together. You can also select the earlier task and use **Move to today**, or press Arrow Up on the first handle within its source date. Escape cancels a drag.

Open **Settings → Style** to choose **Paper**, **Frosted glass**, or **Liquid glass**. Choices apply immediately to the note and Goals/Routines panel and are remembered on this device. The glass materials are drawn inside the opaque app window. Paper remains the default.

## Features

Click an unfinished task to select it. Icon buttons for **Focus**, **Add step**, **Suggest steps with AI**, **Move**, and **Delete** appear beside its details. Hover to see each action name. Double-click the title or press Enter while the title is focused to edit it. Choose Save or press Cmd/Ctrl+Enter to save; Enter inserts a new line and Escape cancels.

- **Persistent capture** — The top **New task** field stays visible. Add step opens a growing multiline field for the selected task; Add or Cmd/Ctrl+Enter adds the step and Escape clears its draft.
- **Readable task hierarchy** — Titles lead, saved Outcome and Due details sit beneath them, and step groups collapse to a count and next-step summary. Expand a group to work through it.
- **Task actions** — AI step suggestions and moving are available directly. Delete is also directly available; deletion offers Undo. Drag the six-dot handle to reorder tasks or steps within one task.
- **Compact shell** — Named **Goals** and **Focus** controls replace idle side columns in small windows. The active Focus countdown stays visible; expanded tools overlay the note. Wider windows can show side panels.
- **Predictable launch placement** — Fresh launches open at the top-right of the current display with a safe screen-edge margin; after that, the app respects wherever you drag it
- **Task completion** — Tasks without an Outcome retain the todo → done → partial cycle and completion of their parent when its current-day steps are done. Tasks with an Outcome require **Complete / Revise / Stop** review. Completing a parent completes its steps; stopping remains a separate decision.
- **Earlier unfinished work** — Today collects unfinished past tasks under **Earlier tasks**, with their source dates. The collapsed section remembers your choice, loads separately from Today, and offers Show more in batches of 40. Edits stay in the original Markdown date.
- **Smart carry-forward** — Move unfinished past work directly to today; moving one subtask preserves its parent on the destination date and merges later sibling moves beneath it. A single-line confirmation shows the destination
- **Date navigation** — Jump between days with fixed-position prev/next arrows and a centered calendar label; empty past/future dates offer a direct return to today. The Today marker refreshes at midnight and when you return to the app, advancing an open Today view while preserving explicitly browsed dates
- **Native clipboard** — Use standard Command-C and Command-V while editing; the task action row stays limited to Focus, Add step, AI suggestions, Move and Delete
- **Agent task API** — Extract, create, edit, and delete Markdown-backed tasks from reusable skills through a local JSON CLI, with revision checks for safe writes
- **Task history** — **Earlier steps (N)** within a task reveals its read-only historical steps; these stay collapsed by default
- **AI assistance** — Explicitly request outcome suggestions, step breakdowns, or a proposed day plan when useful. Selecting a task does not make an AI request.
- **Codex background provider** — Run breakdowns, schedules, and album picks through the locally authenticated Codex CLI in an ephemeral read-only workspace, without adding an OpenAI API key
- **Task-aware albums** — Find four albums suited to the concentration, energy, and atmosphere of the work, in a compact list with musical reasons and listening-mood cues (requires a configured AI provider)
- **Goals and Routines** — Keep long-term goals and reusable reminders in flat lists. Manual reset remains the default. Routines on both platforms can optionally create daily, weekday or weekly tasks, with Pause and Skip next. Schedules run on this device; generated tasks use ordinary task sync. Type and press Enter to add, double-click or press Enter on a focused item to edit, and Escape to cancel.
- **Star Focus** — Select a task, choose a duration, then **Start focus**. **Pause**, **Resume**, and **Finish session** control the timer. Sessions travel the Solar Route and enter a native-local log with `6` / `12` / `24` retention presets. Session completion leaves task-outcome review to you; **Review task** returns to its original entry. A simplified map keeps controls working if 3D rendering is unavailable, and **Try 3D again** retries it.
- **Undo and save recovery** — Deleting a task or applying a day plan offers **Undo**. Failed writes keep edits in memory and show a persistent **Changes not saved** notice with **Retry save**. Pending saves must finish before switching dates or task folders.
- **File sync** — Tasks stored as Markdown in `content/to-do/`; edits sync both ways
- **Always on top** — Sticky window stays visible; runs in the menu bar with a tray icon
- **Native shell** — Built with Tauri and the platform WebView

### Outcomes and due dates

Select an unfinished task to add an optional **Outcome** or **Due** date. Saved details remain visible when the task is unselected. Write the outcome yourself, or choose **Suggest outcome** in an empty editor. The response is labeled **AI suggestion · not saved**. **Use suggestion** (or Tab in the empty outcome field) copies it into your draft; Enter or leaving the editor saves, and Escape cancels.

Date changes are drafts until **Save date** or Enter. **Clear date** edits the draft; **Cancel** or Escape preserves the saved date. Deadline history records the original date and subsequent changes. Carrying a task forward keeps its due date.

AI step suggestions use the outcome and date to propose bounded work including a closing action. When an outcome is ready to review, choose **Complete**, **Revise**, or **Stop**. Stopped tasks stay distinct from completed work and do not carry forward.

### Review a day plan before applying it

Open **Plan** for the selected date, set your available **From / Until** times, and optionally select configured machines. The desktop remembers these choices. **Adjust task time & breaks** offers optional time budgets and unavailable periods together; Auto lets AI estimate. **Generate proposal** shows chronological blocks and any tasks left unscheduled. Generating a proposal does not change your tasks.

Choose **Apply plan** to add the blocks, or **Discard** to leave the tasks as they were. Desktop replanning replaces untouched todo suggestions for that planning date while retaining edited, started, manual and completed work. Older generated steps without original-text fingerprints are retained too. The confirmation offers **Undo**. If tasks or planning details change during review, generate a fresh proposal before applying it.

### Search, progress and routines

The magnifying-glass button opens **Search** across task dates, including completed/stopped tasks and steps. Results show their date and parent context; selecting one opens the original task. The chart button opens **Progress** for a day or week. Task counts describe the current states on those dates' lists, not when completion occurred. Steps are separate, and focus totals use retained sessions and planned minutes. Unavailable archive files are reported rather than counted as empty history.

The small account indicator opens Account details. Its symbol and tooltip distinguish local-only, waiting, syncing, cloud-acknowledged and attention states. Editing a task clears the prior synced indication until the current content is acknowledged.

Under **Goals → Routines**, Manual remains unchanged. Daily, Weekdays and Weekly generate one ordinary task on eligible dates when Today is loaded. Weekly uses the weekday you configure it; the device's local calendar controls dates. Schedules are stored on this device for the current task folder, while generated tasks can sync normally. Missed days are not backfilled. **Pause** leaves existing tasks intact; **Skip next** skips the next ungenerated occurrence. Changing a schedule affects future generation, not existing task text. A failed task save leaves the occurrence pending for Retry without duplicating it.

The reviewed desktop build is installed locally. Android 2.1.15+7 adds matching Search, Progress, routine scheduling, planning constraints and focus review. Download the local signed APK from `release/todo-sticky.apk`; it updates the prior release without uninstalling. Schedule definitions remain device-local on both platforms.

### Recovering moves and saved goals

Task moves keep the source until the destination is saved. You can continue capturing and editing unrelated work during a move. If you change the task being moved, the app keeps your newer local version and the earlier copied version at the destination, and explains the conflict. If the destination succeeds but source cleanup fails, **Retry save** finishes cleanup without sending the task again.

Goals shows a notice when saved data cannot be read or written. Before replacing malformed goal data, it saves an exact recovery copy on the same device; if recovery storage is unavailable, the original is left untouched. New edits stay in the current window until a save succeeds.

## Development

```bash
# Prerequisites: Node.js 18+, Rust (https://rustup.rs)

npm install
npm run dev
```

This starts Vite on port 5173 and launches the Tauri window.
In development builds, a `Dev` button appears in the bottom action bar so you can seed sample tasks, clear the current day, reload task state, and slow down or fast-forward Star Focus mission time.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start app (Vite + Tauri) |
| `npm run dev:vite` | Vite-only (no native window) |
| `npm test` | Run the Node regression suites |
| `npm run build:frontend` | Build the frontend for preview or packaging |
| `npm run build` | Build distributable for current platform |
| `npm run task-api -- --help` | Show the local JSON task API used by agent skills |
| `npm run release` | Bump patch version, tag, and push (triggers CI) |

### Tests

Run `npm test` for the Node regressions and `npx tsc --noEmit` for TypeScript checking. Browser checks use synthetic task/settings data and mocked native services, without accessing an installed app, user archives, credentials, or live AI.

With Playwright available, run `npm run build:frontend`, then start a production preview with `npm run preview -- --host 127.0.0.1 --port 4173`. In another terminal:

```bash
TODO_TEST_URL=http://127.0.0.1:4173 node tests/check-refined-shell.cjs
TODO_TEST_URL=http://127.0.0.1:4173 node tests/check-task-interactions.cjs
TODO_TEST_URL=http://127.0.0.1:4173 node tests/check-focus-refinements.cjs
```

The shared `tests/helpers/browser-fixture.cjs` also accepts `PLAYWRIGHT_MODULE` (module name or path), `CHROME_EXECUTABLE`, `CHROMIUM_ARGS` (a JSON array of strings), and optional `CHROME_LIBRARY_PATH` / `CHROME_FONTCONFIG_PATH` for an existing Chromium runtime. `TODO_TEST_URL` can point to Vite instead; it defaults to `http://127.0.0.1:5173`. Set `TODO_TEST_OUTPUT` to a directory to save optional screenshots and reports. The Focus suite needs WebGL2 support and deliberately exercises graphics failures.

## Agent Task API

The repository includes a local command API that resolves the knowledge-base path from the app's saved settings and prints machine-readable JSON:

```bash
npm run task-api -- extract --date 2026-08-16
npm run task-api -- create --date 2026-08-16 --text "Review notes" --subtask "Mark key claims"
npm run task-api -- edit --date 2026-08-16 --id TASK_ID --status done --expected-revision REVISION
npm run task-api -- delete --date 2026-08-16 --id TASK_ID --expected-revision REVISION
```

Use `--kb-path PATH` or `STICKY_TODO_KB_PATH` to override path discovery. See [docs/llm-api-guide.md](docs/llm-api-guide.md) for the JSON contract and skill-safe workflow.

## Releasing

Releases are automated via GitHub Actions. To publish a new version:

```bash
npm run release        # bumps patch (2.0.0 → 2.0.1), creates tag, pushes
# or manually:
npm version minor      # 2.0.0 → 2.1.0
git push --follow-tags
```

The workflow builds for **macOS** (universal binary), **Windows**, and **Linux**, then uploads them as a draft GitHub Release. After all platform builds and manifest/asset checks pass, the workflow publishes it as the latest release. Users can install it through **Settings → Updates**.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌥⌘T** / **Ctrl+Alt+T** (Windows) / **Ctrl+Shift+Alt+T** (Linux) | Show/hide window (global) |
| **⌘Q** / **Ctrl+Q** | Quit (app/menu shortcut) |
| **Enter** | New line in task/step editors; submit goals and other single-line fields |
| **Cmd/Ctrl+Enter** | Add a task/step or save its edited text |
| **Escape** | Close a dialog or compact side panel; cancel a title, outcome, date, or step draft |
| **Drag the six-dot handle** | Reorder a task with its steps, or a step within its parent; Escape cancels the drag |
| **Arrow Up / Arrow Down** | Move a task or subtask after clicking or tabbing to its six-dot handle |
| **Drag any window edge or corner** | Resize the frameless window; the bottom-right grip is always visible |
| **Double-click** | Edit task text |

## Run in Diane (companion update required)

Diane is optional. Todo opens, saves, and manages your tasks, dates, goals and focus without it. If Diane is disconnected or unavailable, only its dispatch/status controls are affected. Independently configured AI providers continue to use their own configuration.

In **Settings → Integrations**, enable **Connect to Dear Diane on this computer** and Save. It is off by default; off hides task controls and stops connection attempts without deleting session links or stopping existing Diane runs. The separate credential preference controls key reuse. Open Dear Diane and select the project/folder you want to use; Settings shows that destination when you enable the connection. The simplified task row currently omits Diane dispatch controls. Existing integration settings and stored links are preserved.

Closing Todo leaves Diane working. Reopening reconnects; a disconnected indicator does not mean the run failed. Reconnect reuses the original dispatch and does not submit edits made afterward. Todo 2.1.7 includes the Todo side of this integration; running tasks requires the separate Diane companion update.

For an isolated native development launch:

```sh
STICKY_TODO_DEV_DATA_DIR=/private/tmp/sticky-todo-diane-data npm run tauri -- dev --config src-tauri/tauri.diane-dev.conf.json
```

Browser controls can be checked without native data or an agent: run Vite on port 15173, then `python tests/check_diane_ui.py` with Python Playwright installed. `CHROME_EXECUTABLE` and `TODO_TEST_URL` override the test browser and preview URL.

Settings uses one navigation row (Storage, AI, Integrations, Updates) and a stable viewport-bounded dialog height. Longer sections scroll internally while the header and Save/Cancel controls stay in place.

## Optional Google account and cross-platform sync

The current `main` source includes **Settings → Account**, Google sign-in and optional desktop/Android sync through Firebase Authentication and a Google Cloud Run/Firestore service. Tasks remain usable offline. Account shows sync progress and a dedicated Conflicts & recovery view. Same-day conflicts are compared as readable versions, with both copies retained locally and stale choices blocked; AI keys and active timers remain on the device. See [account setup, deployment and protocol](docs/account-sync.md). A real Firebase project and deployed service origin are required for live sign-in. The account-enabled macOS build is installed locally and the matching optimized Android release APK is available; The personal Cloud Run service is deployed; see [connection steps](docs/account-sync.md#personal-deployment). Updated macOS/Android builds return from browser confirmation to the app, with a **Return to Sticky Todo** fallback button. The public v2.1.15 desktop release predates these account changes.

## Android app (Flutter)

The native phone app lives in [`mobile/`](mobile/README.md). Daily tasks have visible drag grips for reordering and icon-only actions with a horizontal dots menu. It carries task capture, nested steps, outcomes/deadlines, goals/routines, AI planning, music suggestions and Focus into a phone layout, with offline persistence and secure provider keys. See the mobile README for build instructions, feature parity, account integration and platform-specific boundaries. The Flutter Android workflow produces an installable review APK; production distribution requires your release signing key.

Live Diane companion handoff remains a known phone gap: Dear Diane's `/api/sticky-todo` protocol explicitly enforces local-only access independently of its remote bearer authentication. Android retains Copy agent prompt. The [protocol review](mobile/README.md#dear-diane-companion-protocol-review) identifies the backend work required for remote support.
