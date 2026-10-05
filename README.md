# Sticky Todo

Cross-platform sticky note todo planner with AI task breakdown.

## Install

Download the latest installer from [Releases](https://github.com/2Mars4096/todo-sticky/releases):

| Platform | File |
|----------|------|
| **macOS** (Intel + Apple Silicon) | `.dmg` |
| **Windows** | `.msi` or `.exe` |
| **Linux** | `.deb` or `.AppImage` |

On first launch the app opens an optional setup panel. Choose **Start without AI** to begin immediately, or configure a provider to enable AI task breakdown and day planning:

| Field | What to enter |
|-------|---------------|
| **Provider** | Default is **Moonshot (Kimi)**. Choose **Codex (ChatGPT login)** to use the locally authenticated Codex CLI without an API key, or select OpenRouter, OpenAI, Anthropic, Gemini, or a custom OpenAI-compatible endpoint. |
| **API Base URL / Codex Executable** | API providers receive their standard endpoint. Codex uses `codex` with common install paths auto-detected; enter a full executable path if needed. |
| **Model** | Pick an API model, or leave the Codex model blank to use the CLI default. OpenRouter accepts catalog slugs such as `moonshotai/kimi-k3`; the direct Moonshot default remains `kimi-k2.6`. |
| **API Key** | Required only for API providers. Codex reuses the existing local `codex login` session and does not store another credential in Sticky Todo. |
| **KB Path** | Where task files live (`content/to-do/` inside this folder). Default: `~/Documents/Sticky Todo`. |
| **Machines** | *(Optional)* Add servers/workstations for AI scheduling. |

On macOS, the default task folder and local app-state folder stay anchored to the signed-in account, so launching Sticky Todo from an installer or automation tool cannot silently open a separate empty data store.

If macOS or Dropbox has offloaded the Markdown archive, Sticky Todo reports **Tasks are waiting in Dropbox** instead of treating the archive as empty or waiting forever. Reveal the configured `content/to-do/.../index.md` file in Finder, choose **Make available offline** or **Download now**, then use **Retry** after the file becomes local.

Click **Test Connection** to verify, then **Save & Start**. Change settings later via ⚙.

After configuring more than one provider, use the compact provider selector beside ⚙ to switch in one action. Each provider keeps its own API URL, key, and last-used model. Choosing an unconfigured provider opens Settings directly on that provider.

> macOS Gatekeeper may warn about an unsigned app. Right-click → **Open** to bypass.

## Update

Open **Settings → Updates → Check for updates**. When a newer release is available, choose **Download and install**, then **Restart now**. Windows restarts through its installer. Save changed settings and finish any focus session first. Tasks and settings stay in their existing storage.

Version 2.1.0 introduces in-app updates. Older installations need one manual upgrade to this version; later published GitHub releases can be installed from the app.

### Publish an update

Run `npm run release` from a clean `main` branch after committing the changes. This bumps the patch version and pushes its version tag. GitHub Actions builds signed installers for macOS, Windows, and Linux, validates the complete `latest.json`, and publishes the release when all builds succeed. A normal branch push does not publish an app update. If packaging fails, fix the workflow on `main`, then run `gh workflow run release.yml -f release_tag=v2.1.0` with the failed version tag; the retry builds that exact tagged source without moving the tag.

The workflow needs the repository secret `TAURI_SIGNING_PRIVATE_KEY` and, for an encrypted key, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Keep a backup of the original signing key; replacing it breaks trust for existing installations. For a local release build, set `TAURI_SIGNING_PRIVATE_KEY` to the key file path and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to its password (empty for the current key). Never commit the private key.

## Demo

<p align="center">
  <img src="demo/demo.gif" width="600" alt="Demo">
</p>

## Features

Click a task title or the empty space to its right to edit it. The editor extends up to the action buttons. Press Enter to save or Escape to cancel.

- **Tasks & subtasks** — Add a step from the plus aligned below its parent checkbox, use the branching icon for AI breakdown, and drag the six-dot handle to reorder tasks or steps within one task
- **Ready-to-use compact shell** — Task capture opens at the top, side tools stay collapsed by default, and compact panels overlay instead of squeezing the task list
- **Predictable launch placement** — Fresh launches open at the top-right of the current display with a safe screen-edge margin; after that, the app respects wherever you drag it
- **Automatic parent completion** — Mark the last unfinished subtask done to complete its parent for that day; steps from other dates do not block completion
- **Status cycle** — Toggle task status: todo → done → partial → todo
- **Space-aware task actions** — Keep each icon set together and right-aligned after the final task-text fragment when space permits, with a right-aligned fallback row for longer tasks
- **Smart carry-forward** — Move unfinished past work directly to today; moving one subtask preserves its parent on the destination date and merges later sibling moves beneath it. A single-line confirmation shows the destination
- **Date navigation** — Jump between days with fixed-position prev/next arrows and a centered calendar label; empty past/future dates offer a direct return to today. The Today marker refreshes at midnight and when you return to the app, preserving the selected day
- **Native clipboard** — Use standard Command-C and Command-V while editing; the row Copy icon exports a parent with all steps, or one selected subtask with its parent context, for Codex and other agents
- **Agent task API** — Extract, create, edit, and delete Markdown-backed tasks from reusable skills through a local JSON CLI, with revision checks for safe writes
- **View modes** — **All** shows subtasks from other dates; **Today** shows only today's subtasks
- **AI breakdown** — One-click breakdown of a task into actionable subtasks (requires a configured AI provider)
- **AI schedule** — Generate a time-blocked schedule for the day (requires a configured AI provider)
- **Codex background provider** — Run breakdowns, schedules, and album picks through the locally authenticated Codex CLI in an ephemeral read-only workspace, without adding an OpenAI API key
- **Task-aware albums** — Find four albums suited to the concentration, energy, and atmosphere of the work, in a compact list with musical reasons and listening-mood cues (requires a configured AI provider)
- **Star Focus Mission Control + Focus Mode** — Arm a task, choose a focus burn, and travel one leg at a time through an Earth → Moon → Venus → Mars → Saturn route. The compact layout puts the task and timer first; wider windows pair those controls with the interactive 3D Tracking Station. Completed sessions become a native-local travel log with `6` / `12` / `24` retention presets, while the right rail stays lightweight and always shows the next destination.
- **File sync** — Tasks stored as Markdown in `content/to-do/`; edits sync both ways
- **Always on top** — Sticky window stays visible; runs in the menu bar with a tray icon
- **Lightweight** — Built with Tauri; ~5 MB installer (no bundled browser)

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
| `npm run build` | Build distributable for current platform |
| `npm run task-api -- --help` | Show the local JSON task API used by agent skills |
| `npm run release` | Bump patch version, tag, and push (triggers CI) |

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

Step entry stays visible beneath each editable task. Type in **Add step...** and press **Enter** or click **+**; **Escape** clears the draft. The tray menu labels the visibility action **Toggle / Hide** and displays its platform shortcut alongside the Quit shortcut.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌥⌘T** / **Ctrl+Alt+T** (Windows) / **Ctrl+Shift+Alt+T** (Linux) | Show/hide window (global) |
| **⌘Q** / **Ctrl+Q** | Quit (app/menu shortcut) |
| **Enter** | Add task / submit subtask or goal / commit edit |
| **Escape** | Close Focus Mode or a compact side panel; cancel edit/subtask input |
| **Drag the six-dot handle** | Reorder a task with its steps, or a step within its parent; Escape cancels the drag |
| **Arrow Up / Arrow Down** | Move a task or subtask after clicking or tabbing to its six-dot handle |
| **Drag any window edge or corner** | Resize the frameless window; the bottom-right grip is always visible |
| **Double-click** | Edit task text |
