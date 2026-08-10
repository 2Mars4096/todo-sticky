# Bugs And Failed Approaches

## Active Issues

- 2026-08-10: Repository-wide `tsc --noEmit` reports pre-existing type errors in the Star Focus orbital renderers and archive-limit typing even though the documented Vite frontend build succeeds. Use focused type checks for unrelated slices until those errors are resolved.

## Failed Approaches

- 2026-08-10: macOS `screencapture` could enumerate the Sticky Todo window but could not capture either its window ID or exact rectangle in the current automation session. Use signed-bundle, process-environment, stable-store timestamp, and parser evidence when Screen Recording is unavailable.
- 2026-08-10: The Computer Use `Sky` native pipe failed to start while inspecting the installed app, including after the required app-identifier fallback. Use storage, process, and parser evidence for diagnosis until the local bridge is available.
- 2026-08-10: `cargo fmt --check` cannot run because the installed stable Rust toolchain does not include the optional `rustfmt` component. Keep touched Rust manually formatted or install that component before relying on automated formatting.
- 2026-08-02: Raw Three.js `PointsMaterial` particles can expose their square billboard shape when a star or dust mote passes close to the camera. Use a radial alpha-masked point texture with a small `alphaTest` instead.
- 2026-08-02: Showing the configured hidden window inside Tauri's `.setup(...)` callback is too early and can leave the fresh process running without a visible window. Position and show it from `RunEvent::Ready` instead.
- 2026-04-20: An over-eager Star Focus prototype was started before the design was locked. The prototype was reverted. Keep design/planning ahead of implementation for this feature track.
- 2026-04-20: Deriving Star Focus mission numbering from the retained archive length causes duplicate `vehicleCode` and `orbitIndex` values once the local archive reaches its cap. Future mission numbering should derive from the highest retained orbit index instead.
