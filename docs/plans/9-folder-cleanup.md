# 9: Folder cleanup

**Status:** completed
**Goal:** Remove disposable local clutter and explain retained folders without losing code, configuration, data or delivery evidence.

## Tasks
- [x] 1. Inventory root/hidden directories, scripts, Git state and linked checkouts.
- [x] 2. Remove only reproducible compiler/bytecode caches, selected Finder metadata and the empty editor directory.
- [x] 3. Preserve unmerged checkout, recovery data, installed dependencies, native binaries, bundles, rollback copies and current deployment/APK work.
- [x] 4. Ignore local worktrees and document the folder/script map.
- [x] 5. Verify tracked-source preservation and documentation changes.

## Decisions
- Keep `.worktrees/today-first-planning`: its clean branch contains an unmerged commit, `8aee543`.
- Retain conventional file names and paths used by package scripts, CI and tooling.
- Preserve pre-existing uncommitted account/deployment/APK changes.
- Acquire existing Cargo profile locks before cache deletion; no application behavior changed.

## Notes
- Removed approximately 11.03 GiB of allocated cache files. `git diff --check` passes; linked checkout remains clean and protected paths remain present.
- See [folder guide](../folder-guide.md) for retention and regeneration rules.
- Full application tests are unnecessary for cache/documentation-only changes; subsequent native builds regenerate caches.

## 2026-11-10 consolidation

- [x] Inventory all 558 tracked paths by role, references, exact-content duplicates and plan status; inspect local root directories separately.
- [x] Merge 79 completed micro-plans into 10 existing feature/implementation records with stable anchors; preserve active plans and the Star Focus design lock.
- [x] Merge plugin module documentation into its package README; remove unused entry/build aliases, empty shared scaffold and unused Tauri mobile icon exports.
- [x] Use canonical phone paths in CI/docs; remove redundant ignore rules and obsolete TypeScript include; point Vite alias directly at web source.
- [x] Remove disposable browser snapshots/logs and selected Finder metadata; preserve all local data, delivered artifacts, dependencies and unmerged worktree.
- [x] Verify regression suites, frontend/plugin builds, native configuration, phone checks and document links.

### Retention decisions

- Keep desktop/src-tauri: conventional Tauri project layout; keep root src-tauri for CLI discovery/release tooling and src for existing test fixtures. Desktop package/dist symlinks resolve native version and frontend assets.
- Keep Android Kotlin/resource and Python namespace nesting: required by platform/package contracts.
- Keep standalone and embedded UI modules separate: the plugin ships independently with React 19/host services; standalone uses React 18/Tauri. Identical pure modules are audited but merging package ownership would change the release contract.
- Keep tests/fixtures and tests/helpers: shared test data/loaders. Keep demo GIF/MP4 pairs: README playback and downloadable demonstrations are distinct uses.
- Keep PRODUCT/DESIGN, live docs, recovery plans, provenance and licenses: they carry different contracts. Reuse existing cleanup plan/folder guide instead of adding another report.
- The team-leader CLI workers were blocked by network access, then automatic approval review rejected external source transmission. Local audit continued; no worker findings are claimed.

### Verification

- 558 tracked paths reduced to 438 (120 removed, no new tracked files). All substantive lines in the 79 merged plans are preserved; all 79 explicit anchors and actual local Markdown link targets resolve (AGENTS template placeholders excluded).
- All 30 Node suites and 42 Rust library tests pass; TypeScript and standalone Vite production build pass. Embedded plugin build passes.
- Flutter analysis is clean; 138 tests pass with one existing skip, using the pinned SDK and localhost-enabled runner.
- Native configured icons, version file and dist/index.html resolve. No broken retained symlinks or deleted-path references in executable code/config; git diff --check passes.
- Starting Kotlin/account/pubspec and Diane handoff edits remain unchanged. Existing changelog entries and phone README additions are retained. The staged root APK, release/output evidence, task data and unmerged worktree are untouched.

## Second pass — disposable local artifacts

- [x] Reinspect current tree after intervening plugin/login/APK changes; preserve those edits and the latest APK.
- [x] Remove 404 disposable local files (63.2 MiB) and 20 empty directories: screenshots, UI dumps, intermediate recordings, logs, Finder metadata, one exact duplicate APK and an orphan checksum.
- [x] Remove retired scripts/seed-demo.js and npm command; isolated record-demos is the supported workflow.
- [x] Verify retained APK hashes, protected source hashes, package scripts, documentation references and diff hygiene.
- Unique APK backups, synthetic fixture source and verification/notebook JSON remain; same file size alone is not proof of duplication. No app logic or UI changes.

## Empty-file follow-up

- [x] Check tracked files and generated trees: no empty tracked source files.
- [x] Remove obsolete backend diane/plugins directory chain, stale build/egg-info output (including blank dependency_links.txt), and 17 empty phone build logs.
- [x] Preserve Cargo lock files, build markers, dependency packages and actual backend source under src/diane/plugins; source hashes unchanged.
