# Sticky Todo

macOS sticky note todo planner with AI task breakdown.

## Install

1. Download the latest `.dmg` from [Releases](https://github.com/2Mars4096/todo-sticky/releases)
2. Open the `.dmg` and drag **Sticky Todo** to Applications
3. Launch the app — a first-run settings panel will appear:

| Field | What to enter |
|-------|---------------|
| **Provider** | Choose **OpenAI**, **Anthropic (Claude)**, **Google Gemini**, or **Custom** (any OpenAI-compatible endpoint). Base URL and model suggestions auto-fill. |
| **API Base URL** | Pre-filled for standard providers. Edit if you use a proxy, Azure, OpenRouter, etc. |
| **Model** | Pick from suggestions or type any model name (e.g. `gpt-4o`, `claude-sonnet-4-20250514`, `gemini-2.0-flash`). |
| **API Key** | Paste your key. Stored locally in `~/Library/Application Support/Sticky Todo/config.json` — never sent anywhere except your chosen API. |
| **KB Path** | Where task files live (`content/to-do/` inside this folder). Default: `~/Documents/Sticky Todo`. Use 📁 to browse. |
| **Machines** | *(Optional)* Add servers/workstations for AI scheduling — name, type, specs, capabilities. |

4. Click **Test Connection** to verify, then **Get Started**

You can change any setting later via the gear icon (⚙) in the bottom-right corner.

> macOS Gatekeeper may warn about an unsigned app. Right-click the app → **Open** to bypass.

## Development

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy .env for dev-mode AI config
cp .env.example .env

# 3. Start the app
npm start
```

The app will open as an Electron window. Vite runs on port 5173; Electron loads the UI from it.

## Demo

<p align="center">
  <img src="demo/demo.gif" width="600" alt="Demo">
</p>

## Features

- **Tasks & subtasks** — Add tasks, break them into subtasks manually or with AI
- **Status cycle** — Toggle task status: todo → done → partial → todo
- **Push to tomorrow** — Move unfinished tasks to the next day
- **Date navigation** — Jump between days with prev/next arrows or calendar picker
- **View modes** — **All** shows subtasks from other dates; **Today** shows only today’s subtasks
- **AI breakdown** — One-click breakdown of a task into actionable subtasks (requires LLM API)
- **AI schedule** — Generate a time-blocked schedule for the day (requires LLM API)
- **File sync** — Tasks stored as Markdown in `content/to-do/`; edits sync both ways
- **Always on top** — Sticky window stays visible; runs in menu bar with tray icon

## Configuration

**Packaged app:** All settings are managed in-app via the gear icon (⚙). Settings are stored in `~/Library/Application Support/Sticky Todo/config.json`.

| Setting | Description |
|---------|-------------|
| Provider | OpenAI, Anthropic (Claude), Google Gemini, or Custom (OpenAI-compatible) |
| API Base URL | Auto-filled per provider; editable for proxies or custom endpoints |
| Model | Model name with suggestions per provider |
| API Key | Your API key (stored locally, never sent anywhere except your chosen API) |
| KB Path | Where tasks are stored (`content/to-do/` inside this folder) |
| Machines | Servers/workstations for AI scheduling |

**Dev mode:** You can also use a `.env` file (see `.env.example`). The app checks `config.json` first, then falls back to `.env`.

AI features (breakdown, schedule) are optional; the app works without them.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌥⌘T** (Option+Command+T) | Show/hide window (global) |
| **Enter** | Add task / submit subtask / commit edit |
| **Escape** | Cancel edit or subtask input |
| **Double-click** | Edit task text |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start full app (Vite + Electron) — **use this to run the app** |
| `npm run dev` | Same as `npm start` |
| `npm run dev:web` | Web-only mode (browser at http://localhost:5173) |
| `npm run build` | Build `.dmg` + `.zip` locally |
| `npm run release` | Bump patch version, tag, and push (triggers CI release) |
| `npm run preview` | Preview production build in browser |
| `npm run seed-demo` | Seed demo tasks for recording |

## Releasing

Releases are automated via GitHub Actions. To publish a new version:

```bash
npm run release        # bumps patch (1.0.0 → 1.0.1), creates tag, pushes
# or manually:
npm version minor      # 1.0.0 → 1.1.0
git push --follow-tags
```

The workflow builds a macOS `.dmg` and `.zip`, then uploads them as a **draft** GitHub Release. Go to the [Releases page](https://github.com/2Mars4096/todo-sticky/releases) to review and publish.

## Requirements

- Node.js 18+
- macOS (for native app; web mode works on any OS)
