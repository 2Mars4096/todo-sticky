# Dockit icon handoff

The Dockit mark belongs to the Ink family for pipedreams by Liberate AI. The approved suite board shows its charcoal file cradle, ivory folders and ochre tabs. Use `source.png` and the opaque `icon-1024.png` master for new exports.

## Source package

- `approved-suite-review.png` records the approved scale and colors across the suite.
- `web/` contains browser sizes and a manifest fragment.
- `android/` contains the Play Store image and legacy launcher resources.
- `ios/AppIcon.appiconset/` contains the phone, tablet and marketing slots.
- `macos/` contains the square-source ICNS and its input iconset.
- `checksums.json` records the SHA-256 digests of the files in this source package.

## Client inputs

The web client serves its browser and manifest images from `web/public/brand/pipedreams-ink/`. The backend sign-in page serves its own 32 px copy. The Shiprite plugin embeds the empty-state image in its production CSS and ships the PNG referenced by its manifest.

Tauri uses the bundle artwork in `desktop/src-tauri/icons/`. The macOS ICNS applies an inset mask, and the macOS tray uses the separate transparent template. Android reads its round, adaptive and themed launcher resources from `phone/android/app/src/main/res/`. Flutter displays the mark from `phone/assets/brand/dockit.png`.

See the [icon integration plan](../../../docs/plans/23-icon-asset-handoff.md) for platform coverage and verification.
