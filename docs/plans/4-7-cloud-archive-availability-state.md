# 4-7: Cloud Archive Availability State

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Replace indefinite task loading with an immediate, recoverable state when macOS marks the Markdown archive as cloud-only.

## Tasks

- [x] 1. Confirm Dropbox is running and File Provider still reports the archive as downloading but unavailable.
- [x] 2. Detect macOS `SF_DATALESS` archives before any blocking read or write.
- [x] 3. Show a concise cloud-availability error with a retry action instead of an infinite spinner.
- [x] 4. Verify frontend/native behavior, rebuild, install, and relaunch.
- [x] 5. Update project documentation and tracking.

## Decisions

- Treat a cloud-only archive as unavailable data, not an empty task list.
- Never create or overwrite tasks while the configured archive is cloud-only.
- Keep retry explicit and fast; Dropbox/Finder owns materialization of the file contents.

## Notes

- File Provider reports `isDownloadRequested=1`, `isDownloading=1`, and `isDownloaded=0`; the file remains `compressed,dataless` with zero local blocks.
- Dropbox itself is running, so the indefinite wait is a provider-side materialization stall rather than a stopped desktop client.
- Verification: production frontend build, 14 passing native tests including the dataless-flag test, successful app-only release bundle, signature verification, exact installed/build binary checksum match, running installed process, unchanged archive metadata, and no open file descriptor against the dataless archive after relaunch.
