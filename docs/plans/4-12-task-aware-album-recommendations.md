# 4-12: Task-Aware Album Recommendations

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Turn the current task list into a useful album queue without crowding or visually separating the result from the sticky-note workflow.

## Tasks

- [x] 1. Add one compact album action beside the existing AI day-planning control.
- [x] 2. Send only current task text, statuses, and current-day steps through the configured AI provider.
- [x] 3. Return a structured four-album soundtrack with concise fit and best-use cues.
- [x] 4. Display results in a dismissible paper-toned sheet with loading, regenerate, Escape, and compact-width behavior.
- [x] 5. Verify the frontend and native builds plus the rendered 460px layout.
- [x] 6. Update user, architecture, API, todo, and changelog documentation.
- [x] 7. Build, verify, install, and relaunch the macOS application bundle.

## Decisions

- Keep recommendations ephemeral in frontend memory; do not add a music-history store or mutate task Markdown.
- Reuse the active AI provider and its existing native request adapters instead of adding a music service or external catalog dependency.
- Treat the result as a temporary action-bar sheet so it overlays the working note without compressing the task column.
- Recommend full, real albums and show text-only rows with a small record motif, avoiding remote artwork, links, and extra network requests.
- Pin Cargo's default run target and the Tauri desktop bundle name to `todo-sticky` because this package also exposes the separate `sticky-todo-api` binary.

## Notes

- Visual QA used representative long task, album, and artist names at the app's 460px baseline width.
- `npm run build:frontend` and `cargo check --manifest-path src-tauri/Cargo.toml` pass.
- The first app-only bundle selected `sticky-todo-api`; setting only `mainBinaryName` then renamed the CLI without changing its behavior. The previous app was restored, and the final bundle must report `CFBundleExecutable = todo-sticky`, retain the desktop binary profile, and survive direct GUI launch before replacement.
- Final installation verification: the clean bundle points to the 8 MB `todo-sticky` GUI executable, survives direct launch, passes strict deep signature validation, matches the installed executable checksum, and runs from `/Applications/Sticky Todo.app` as version `2.0.4`.
- The previous working bundle remains recoverable at `/private/tmp/Sticky Todo.previous-album-recommendations.app` for this session; no task, settings, or app-state stores were moved or replaced.
