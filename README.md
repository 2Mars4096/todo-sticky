# Sticky Todo

macOS sticky note todo planner with AI task breakdown.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config (optional, for AI features)
cp .env.example .env
# Edit .env and add your LLM API key if you want AI task breakdown

# 3. Start the app
npm start
# or: npm run dev
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

## Environment (.env)

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `VITE_LLM_API_BASE` | OpenAI-compatible API endpoint (e.g. `https://api.openai.com/v1`) |
| `VITE_LLM_API_KEY` | Your API key |
| `VITE_LLM_MODEL` | Model name (e.g. `gpt-4o`, `claude-sonnet-4-20250514`) |
| `VITE_KB_PATH` | Absolute path to your knowledge base root (default: `./`). Tasks live in `content/to-do/`. |
| `VITE_MACHINES` | JSON array of machines for AI scheduling. Each object: `name`, `type`, `specs`, `capabilities`. See `.env.example` for format. |

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
| `npm run build` | Build distributable `.dmg` for macOS |
| `npm run preview` | Preview production build in browser |
| `npm run seed-demo` | Seed demo tasks for recording |

## Requirements

- Node.js 18+
- macOS (for native app; web mode works on any OS)
