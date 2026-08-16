# Bugs And Failed Approaches

## Active Issues

- 2026-08-16: The prior default-store `2026-03-09/index.md` remains a 2,648-byte `SF_DATALESS` placeholder. Resetting its request and restarting Dropbox under the correct account profile did not materialize it because the File Provider fetch job stayed detached from its invalidated extension service; the oldest local Time Machine snapshot contains the same placeholder. Recover through a signed-in Dropbox web session or another remote copy before merging this week.
- 2026-08-16: Dropbox/File Provider can report a Markdown archive as downloading indefinitely while it remains `SF_DATALESS`. The app now fails fast with a recoverable cloud-only state, but Dropbox or Finder must still materialize the remote contents before previous tasks can be read.
- 2026-08-16: The installed app could reach WebKit's completed paint state while presenting a blank white native surface. Its task archive was a zero-block `dataless` File Provider placeholder, and synchronous task loading blocked Tauri's UI thread while the provider tried to materialize it. Startup reads now run on the blocking worker pool; the unsupported transparent-window configuration was also replaced with an explicit opaque background, and a boot fallback keeps future failures visible.
- 2026-08-10: `npm install` reports five dependency advisories (`1` low, `4` high). This clipboard slice does not run `npm audit fix` because automatic dependency rewrites are outside its scope; audit and upgrade the affected dependency chains separately.
- 2026-08-10: Repository-wide `tsc --noEmit` reports pre-existing type errors in the Star Focus orbital renderers and archive-limit typing even though the documented Vite frontend build succeeds. Use focused type checks for unrelated slices until those errors are resolved.

## Failed Approaches

- 2026-08-10: macOS `screencapture` could enumerate the Sticky Todo window but could not capture either its window ID or exact rectangle in the current automation session. Use signed-bundle, process-environment, stable-store timestamp, and parser evidence when Screen Recording is unavailable.
- 2026-08-10: The Computer Use `Sky` native pipe failed to start while inspecting the installed app, including after the required app-identifier fallback. Use storage, process, and parser evidence for diagnosis until the local bridge is available.
- 2026-08-16: The Computer Use `Sky` native pipe still fails to start in the current environment, and targeted `screencapture` still cannot create an image from the enumerated Sticky Todo window. Use the local boot-stage diagnostic plus CoreGraphics window/process evidence until those inspection paths recover.
- 2026-08-10: `cargo fmt --check` cannot run because the installed stable Rust toolchain does not include the optional `rustfmt` component. Keep touched Rust manually formatted or install that component before relying on automated formatting.
- 2026-08-02: Raw Three.js `PointsMaterial` particles can expose their square billboard shape when a star or dust mote passes close to the camera. Use a radial alpha-masked point texture with a small `alphaTest` instead.
- 2026-08-02: Showing the configured hidden window inside Tauri's `.setup(...)` callback is too early and can leave the fresh process running without a visible window. Position and show it from `RunEvent::Ready` instead.
- 2026-04-20: An over-eager Star Focus prototype was started before the design was locked. The prototype was reverted. Keep design/planning ahead of implementation for this feature track.
- 2026-04-20: Deriving Star Focus mission numbering from the retained archive length causes duplicate `vehicleCode` and `orbitIndex` values once the local archive reaches its cap. Future mission numbering should derive from the highest retained orbit index instead.
