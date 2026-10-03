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

- [x] 8. Select by listening atmosphere and attention demands; describe musical qualities and mood instead of echoing task wording.

- [x] 9. Rebuild, verify, reinstall, and relaunch the atmosphere-based recommendation revision.

- [x] 10. Keep one album heading and remove the introductory summary from the sheet.

## Decisions

- Keep recommendations ephemeral in frontend memory; do not add a music-history store or mutate task Markdown.
- Reuse the active AI provider and its existing native request adapters instead of adding a music service or external catalog dependency.
- Treat the result as a temporary action-bar sheet so it overlays the working note without compressing the task column.
- Recommend full, real albums and show text-only rows with a small record motif, avoiding remote artwork, links, and extra network requests.
- Pin Cargo's default run target and the Tauri desktop bundle name to `todo-sticky` because this package also exposes the separate `sticky-todo-api` binary.

- Infer work needs before selecting music; exclude keyword, title, lyrical-topic, or geographic matching. Offer alternatives for the overall atmosphere rather than assigning an album to each task.
- Keep the JSON shape stable; `bestFor` now describes listening mood or energy, and `fit` explains audible qualities.

## Notes

- Visual QA used representative long task, album, and artist names at the app's 460px baseline width.
- `npm run build:frontend` and `cargo check --manifest-path src-tauri/Cargo.toml` pass.
- The first app-only bundle selected `sticky-todo-api`; setting only `mainBinaryName` then renamed the CLI without changing its behavior. The previous app was restored, and the final bundle must report `CFBundleExecutable = todo-sticky`, retain the desktop binary profile, and survive direct GUI launch before replacement.
- Final installation verification: the clean bundle points to the 8 MB `todo-sticky` GUI executable, survives direct launch, passes strict deep signature validation, matches the installed executable checksum, and runs from `/Applications/Sticky Todo.app` as version `2.0.4`.
- The previous working bundle remains recoverable at `/private/tmp/Sticky Todo.previous-album-recommendations.app` for this session; no task, settings, or app-state stores were moved or replaced.

- 2026-10-03: Updated curator instructions and sheet heading; frontend build and diff checks pass. The initial native check found no default Rust toolchain; the requested reinstall uses isolated stable Rust and the existing offline Cargo cache. Live provider output has not been evaluated.

- 2026-10-03: Native release build passed with isolated Rust 1.99.0 and the offline Cargo cache. Installed version 2.0.4 passes strict deep signature verification, matches the signed build checksum, and runs from `/Applications/Sticky Todo.app`. Rollback: `/private/tmp/Sticky Todo.before-20261003.app`.

- 2026-10-03: Removed the duplicate heading and summary presentation plus unused CSS. Frontend/native builds and diff checks pass; signed, checksum-verified, reinstalled, and relaunched version 2.0.4. Rollback: `/private/tmp/Sticky Todo.before-20261003-album-trim.app`.
