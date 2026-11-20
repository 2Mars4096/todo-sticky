# Dockit icon integration

**Status** — In progress.
**Goal** — Ship the approved Dockit artwork in each existing client and verify the packaged images.

## Tasks

- [x] Retain the [approved artwork and source package](../../assets/brand/pipedreams-ink/HANDOFF.md) with local SHA-256 checksums.
- [x] Wire the web, sign-in, plugin and desktop icons. Package the Flutter display image and Android launcher resources.
- [ ] Review the installed launcher on supported phones and verify Windows and Linux installers.

## Verification

| Client | Build and artwork | Workflow |
| --- | --- | --- |
| Web | Vite built with the default and nested base paths. Chromium decoded the three favicons, touch icon and two manifest icons. The sign-in route served the approved PNG. | Chromium rendered the branded empty state with the synthetic native bridge at both base paths. The project-planning fixtures passed. |
| Shiprite plugin | The production CSS embeds the approved PNG. The 79-file npm archive includes the PNG referenced by its manifest. | All 60 plugin tests and the production-module render check passed. |
| Mac | The ad-hoc debug Dockit.app passed signature verification with updater generation disabled for this local build. Its ICNS matches the bundle input, and the executable contains the approved tray-template pixels. | Installed-app interaction remains unverified. |
| Android | AAPT2 compiled and linked both launcher names for five densities and the API 26 and 33 adaptive variants. The Flutter dependency check requires Dart 3.13 or later and Flutter 3.47 or later. | Installed launcher, task editing and assignment checks remain pending. |
| iPhone | The source package retains the 18-slot AppIcon catalog. This branch has no iOS runner. | Device workflows remain pending. |
| Windows and Linux | The ICO has six decodable frames. The Tauri PNG inputs passed image validation. | Native installer checks remain pending. |
