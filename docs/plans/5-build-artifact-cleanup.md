# 5: Build Artifact Cleanup

**Status:** completed
**Goal:** Recover disk space by removing regenerable Rust build output.

## Tasks
- [x] 1. Measure storage and distinguish build output from recovery data.
- [x] 2. Remove the user-approved `src-tauri/target/debug` and `src-tauri/target/release` directories.
- [x] 3. Verify both directories are absent and measure remaining repository size.

## Decisions
- Preserve rollback bundles, dependencies, source, and task recovery material.

## Notes
- Repository decreased from approximately 8.9 GiB to 214 MiB; removed approximately 8.7 GiB.
- Future Rust builds regenerate these directories and will take longer initially.

## 2026-11-11: Actions artifact storage

- [x] Remove 11 stored Actions artifacts at the user's request.
- [x] Stop routine uploads on main and clean artifacts after listed workflows complete on any branch.

Routine CI builds and tests do not upload retained build artifacts. A default-branch cleanup workflow deletes artifacts from the listed completed workflows, including runs on older branches. It reads only GitHub metadata, never checks out triggering code, and deletes only artifacts for the completed run. Source code, workflow run logs, dependency caches and GitHub Releases are unaffected. Release jobs still exchange temporary installers until the complete release workflow finishes; cleanup then deletes them. New release artifacts also have a one-day expiry fallback. Re-running a publish-only job after cleanup requires rebuilding its artifacts.

Validation: YAML parsing and structural comparison confirm that only upload steps were removed from routine CI; existing build/test steps and triggers remain unchanged. Cleanup shell passes bash -n. Full application builds were not rerun for this storage-only change.
