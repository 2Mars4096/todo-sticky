# 4-6: Blank Launch Recovery

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Prevent silent white-window launches and capture enough local evidence to identify frontend boot failures without touching task data.

## Tasks

- [x] 1. Confirm the installed process, bundle resources, native data files, and markdown archive are healthy.
- [x] 2. Rule out the task clipboard/handoff slice with a pre-feature release build.
- [x] 3. Add a visible boot surface, module-load recovery, and React render boundary.
- [x] 4. Build, install, relaunch, and inspect the captured boot result.
- [x] 5. Fix the exposed root cause and complete regression verification.
- [x] 6. Update project documentation and tracking.

## Decisions

- Keep launch diagnostics inside WebKit local storage; never write task content, API keys, or app settings into diagnostics.
- Show a compact recovery message instead of leaving users with an unexplained white window.
- Preserve the existing markdown archive and native app-state files throughout diagnosis.

## Notes

- Both the installed build and a clean build from the pre-clipboard Git revision remain alive with a blank WebView, so the clipboard plugin is not the cause.
- The installed bundle signature and resources verify, native configuration and Star Focus JSON are valid, the WebKit local-storage database passes integrity checks, and the task archive remains present.
- The guarded build reached `render-complete` with no module, promise, or React error while the native surface remained blank. Tauri's local config schema identified the mismatch: macOS transparency was requested without the required private-API mode. The recovery build uses an opaque sticky-paper window/WebView background instead.
- The markdown archive itself is a macOS File Provider placeholder (`compressed,dataless`, zero blocks). Startup task loading now runs on a blocking worker instead of Tauri's UI thread, and the frontend shows a loading state with task creation disabled until the archive is available.
- Verification: production frontend build, 13 passing native tests, app-only release bundle, ad-hoc signature verification, exact installed launch, `render-complete` boot diagnostic, opaque on-screen CoreGraphics window, unchanged archive metadata, and File Provider evidence that download is requested but not completed.
- A read-only materialization attempt transferred zero bytes for more than one minute. Finder now reveals the archive so Dropbox's `Make available offline` / `Download now` action can resolve the external provider stall.
