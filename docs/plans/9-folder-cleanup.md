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
