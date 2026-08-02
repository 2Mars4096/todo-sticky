# 4-1: Top-Right Launch Placement

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make Sticky Todo appear immediately in a predictable top-right position when the app launches.

## Tasks

- [x] 1. Position the native window against the current display work area with a safe edge margin.
- [x] 2. Show and focus the window after native startup instead of leaving the fresh launch hidden in the tray.
- [x] 3. Keep placement launch-only so users can move the window without later show/hide actions snapping it back.
- [x] 4. Verify the native calculation, rebuild the macOS app, replace the installed bundle, and inspect the relaunched process.
- [x] 5. Update architecture, README, todo, and changelog tracking.

## Decisions

- Use the current monitor when available and fall back to the primary monitor.
- Use the monitor work area so the app clears the macOS menu bar and Dock.
- Apply a 16 logical-pixel margin, scaled to the monitor's physical-pixel density.

## Notes

- The existing `visible: false` configuration remains useful for avoiding an unpositioned first frame; native startup now positions the window before showing it.
- Tauri must place and show the window from `RunEvent::Ready`; doing it inside `.setup(...)` occurs too early and leaves the fresh process hidden.
- Verification: `cargo +stable test --manifest-path src-tauri/Cargo.toml` (2 placement tests), `npm run build:frontend`, and `npm run build -- --bundles app`.
- The rebuilt bundle was locally ad-hoc sealed, copied over `/Applications/Sticky Todo.app`, byte-compared with the build output, signature-checked, and relaunched.
