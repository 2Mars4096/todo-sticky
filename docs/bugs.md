# Bugs And Failed Approaches

## Active Issues

- None recorded yet.

## Failed Approaches

- 2026-08-02: Showing the configured hidden window inside Tauri's `.setup(...)` callback is too early and can leave the fresh process running without a visible window. Position and show it from `RunEvent::Ready` instead.
- 2026-04-20: An over-eager Star Focus prototype was started before the design was locked. The prototype was reverted. Keep design/planning ahead of implementation for this feature track.
- 2026-04-20: Deriving Star Focus mission numbering from the retained archive length causes duplicate `vehicleCode` and `orbitIndex` values once the local archive reaches its cap. Future mission numbering should derive from the highest retained orbit index instead.
