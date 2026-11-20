# 23. Dockit icon asset handoff

**Status:** in-progress
**Goal:** Integrate the approved Dockit Ink artwork and verify each client’s packaged icons.

## Tasks

- [x] Copy the standalone source and approved suite reference into assets/brand/pipedreams-ink.
- [x] Prepare web PNGs, iOS catalog, Android launcher sizes and Mac icon inputs.
- [x] Stage web files in web/public/brand/pipedreams-ink.
- [x] Document the existing integration locations and pending release checks in [HANDOFF.md](../../assets/brand/pipedreams-ink/HANDOFF.md).
- [x] Connect browser tab, touch, manifest, share, startup, empty-state and sign-in artwork. Package the plugin empty-state icon and declare the product and plugin icon paths.
- [x] Replace desktop bundle and installer inputs. macOS reads a dedicated template from its Tauri config and has no runtime icon override.
- [x] Wire Flutter header, empty state and app info. Runner uses the approved phone/tablet catalog. Android uses density-specific legacy and round images, API 26 adaptive layers and API 33 monochrome layers.
- [ ] Verify the installed phone launchers and Windows/Linux installers on native targets.

## Verification

| Client | Checked locally |
| --- | --- |
| Web | Chromium rendered the empty state and decoded the tab, touch and manifest images at both root and nested hosting paths. Adding a local task removed the empty-state mark and the saved task survived reload. The 512 px share and maskable image retains the full mark inside the 80% safe circle. The sign-in route serves the approved image. |
| Plugin | All 60 tests passed. The production CSS embeds the PNG, and the npm archive contains the manifest’s logo. The host owns its panel registry artwork. |
| macOS | Built debug and release apps using ad-hoc signing. Both signatures, Info.plist icon references, packaged ICNS and embedded tray pixels passed verification. The DMG staging directory also received the correct ICNS, but the disk-image device was unavailable. |
| Windows / Linux | Decoded all six ICO frames and checked the Tauri PNG, installer and store inputs. Native installer builds remain pending. |
| Android | AAPT2 compiled and linked both launcher names, all five legacy densities and the API 26/33 XML variants. The foreground and monochrome fit a 63.92 dp circle on a 108 dp layer. Dockit has no notification producer. |
| iOS | Verified target membership and all 18 catalog slots. Xcode emitted the 120 px iPhone and 152 px iPad icons and bundle icon keys. Full asset compilation requires access to the simulator service. The app build also needs a CocoaPods index entry unavailable offline. |

The local Flutter SDK is 3.41.9 and this checkout requires 3.47 or later. An isolated compatibility check packaged the Flutter display asset. Gradle could not open its lock socket, and the older Flutter SDK lacks the app’s reorder API. Physical phone and installed launcher checks remain pending.

The approved package and web exports remain in their original locations. Build tools consume the wired files directly. The macOS bundle adds an inset continuous-corner mask, while its template and Android themed layer derive their alpha from the charcoal and amber artwork.
