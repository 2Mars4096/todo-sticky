# Dockit icon handoff

The owner selected the Ink family for pipedreams by Liberate AI. These files were prepared on November 20, 2026.

## Artwork

- source.png is the standalone ImageGen raster derived from the approved suite board. Retain it as the export source.
- icon-1024.png is an opaque square master sized for platform processing.
- approved-suite-review.png records the approved relative shapes, colors and optical scale. Standalone generation can introduce small texture and proportion differences; compare against this reference during integration.
- Web sizes and a manifest fragment live in web/.
- ios/AppIcon.appiconset includes phone, tablet and marketing sizes with Contents.json.
- android/res contains legacy launcher sizes. android/play-store-512.png is the store image.
- macos/AppIcon.iconset and AppIcon.icns provide Mac bundle inputs.

The warm-ivory field fills the square. Apply the platform mask and padding during integration. The Mac ICNS is a square-source conversion and still needs a native masked appearance review.

## Existing integration locations

Web: confirm the standalone web entry and its public copy pipeline before linking the staged web files.
Android: phone/android/app/src/main/res/mipmap-*/ic_launcher.png.
iOS: phone/ios/Runner/Assets.xcassets/AppIcon.appiconset currently references Dockit.svg.
Mac: desktop/src-tauri/icons contains the active icon files. desktop/src-tauri/tauri.conf.json lists the bundle icons. Its tray icon has iconAsTemplate enabled and needs a dedicated monochrome symbol. A second src-tauri configuration exists at repo root; confirm the build command before editing it.

## Remaining release work

1. Integrate these files into the selected targets and update their icon references. These are staged source assets.
2. Prepare adaptive foreground/background and monochrome Android layers, with a circular safe-area check.
3. Prepare a white-on-transparent notification small icon and a template Mac tray symbol. The full-color square launcher image is unsuitable for these roles.
4. Verify browser favicons at 16 and 32 pixels, desktop launcher appearance, iOS asset-catalog compilation and Android launcher masks.
5. Rebuild and review on the target devices before release.

Shiprite has a plain hull without a checkmark. Zethea uses pale purple and lilac, with the reduced visual size shown on the approved board. Preserve these choices.

## Placement

Project package: /Volumes/data/Dropbox/Projects/todo-sticky/assets/brand/pipedreams-ink
Staged web files: /Volumes/data/Dropbox/Projects/todo-sticky/web/public/brand/pipedreams-ink

The authoritative suite index is /Volumes/data/Dropbox/Projects/pipedreams/brand/icons/final/HANDOFF.md.
