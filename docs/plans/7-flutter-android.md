# 7: Flutter Android

**Status:** completed
**Goal:** Bring the existing Sticky Todo workflow to a native phone interface while preserving desktop task semantics and independent offline use.

## Tasks
- [x] Inventory the desktop feature surface and document platform-specific boundaries.
- [x] Implement Flutter task models, dates, hierarchy, outcomes, deadlines, goals/routines and task interchange.
- [x] Implement atomic local persistence, previous-save recovery, visible retry and secure provider credentials.
- [x] Implement provider adapters, explicit suggestions, validated day planning, apply/discard/Undo and music recommendations.
- [x] Implement reload-safe Focus lifecycle, native orbital route and history retention.
- [x] Build phone navigation, generous controls, note materials, accessible editing and date interactions.
- [x] Expose the account/sync seam without requiring account startup or syncing secrets/active timers.
- [x] Add Android native file picker/export and review APK CI; require explicit production signing.
- [x] Verify domain and phone interaction tests; inspect 390×844 screenshots and 360px enlarged text.
- [x] Complete final analyzer/APK verification and record results.
- [x] Correct hosted CI SDK bootstrap to explicitly install supported packages instead of v3's removed `tools` default; validate official input syntax and workflow YAML.
- [x] Verify Dear Diane's remote API against the Todo companion contract and document the concrete local-only restriction in [7-1](7-1-diane-remote-feasibility.md).
- [ ] Perform physical Android acceptance with the user's provider configuration.

## Decisions
- Keep existing desktop code on its own platform; the new app lives under `mobile/` and shares its JSON task/finish contracts.
- Use app-private atomic JSON storage on Android, with desktop-compatible Markdown interchange; Google/Firebase transport belongs to the separate account branch.
- Android cannot access a computer's local Codex executable. Diane does have a remote API, but its separate Todo companion router explicitly rejects non-local clients/URL hosts regardless of bearer authentication. Preserve Copy agent prompt; a supported remote companion contract requires Dear Diane backend work, tracked by [7-1](7-1-diane-remote-feasibility.md).
- The native orbital scene supports the same session/route/history workflow while adapting the visual treatment to phones.
- Build and test with Flutter 3.47.8 / Dart 3.13.7 and JDK 17; Android API 24 minimum.

## Notes
- No release publication, production signing, installed-user-data migration or provider credentials are included.
- Feature matrix, setup and validation instructions live in `mobile/README.md`.

## Validation result

- Flutter 3.47.8 / Dart 3.13.7: `flutter analyze` reports no issues; all 22 normal regression/widget tests pass, plus the optional phone-capture test.
- Final publication also passes the exact `dart format --output=none --set-exit-if-changed lib test` CI gate after applying the standard formatter; analysis and all 22 normal tests were rerun successfully.
- Four 390×844 screenshots (Notes, task actions, Goals and active Focus) were inspected; 360px and 150% text interaction coverage passes.
- ARM64 debug APK builds successfully; Android manifest reports package `io.github.twomars4096.sticky_todo`, minimum API 24, target API 36 and version 2.1.15+1. APK v2 signature verifies and packaged Flutter ELF headers validate.
- No signed production distribution or physical-device/live-provider acceptance is claimed.
