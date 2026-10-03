# 4-19: GitHub In-App Updates

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** in-progress
**Goal:** Let users check for, install, and restart into signed GitHub releases from Settings.

## Tasks
- [x] 1. Add the official updater and process plugins with scoped permissions.
- [x] 2. Add compact Settings controls for checking, availability, progress, errors, and restart.
- [x] 3. Wait for pending task/state writes and require saved settings before installation.
- [x] 4. Configure a persistent signing key and GitHub release artifacts plus latest.json.
- [x] 5. Verify update lifecycle and release configuration; build and install the initial updater-enabled version.
- [ ] 6. Publish and verify the first signed release after GitHub authentication is restored.

## Decisions
- Updates are checked on demand in Settings; installation and restart are explicitly initiated by the user.
- Use published stable GitHub Releases and signature verification; never embed GitHub credentials in the app.
- Keep signing material outside the repository and upload only the private signing key to the repository's Actions secret.
- Build platform artifacts in parallel; create one manifest and publish a draft only after every build and validation succeeds.
- Preserve tasks and settings; block installation while settings are unsaved or a focus session is active.

## Notes
- Existing release workflow builds installers on version tags but lacks updater signatures and manifests.
- GitHub SSH pushes work; the GitHub CLI API login currently returns 401. User login is needed for secret setup and release administration.

- The signing key is `/Users/lizhi/.tauri/todo-sticky-updater.key` (outside the repo). The user explicitly approved upload to the Actions secret; upload was verified.
- GitHub API access is restored using the explicit user login keychain. The repository is public.

- Local checks pass: updater lifecycle, pending-write flush/retry, release manifest validation, task completion, calendar rollover, frontend build, native check, and signed macOS packaging. The real archive signature verifies; a one-byte alteration is rejected.

- Browser verification at 340px and 460px passes for check/install/restart controls, progress, busy form locking, unsaved-settings/focus guards, and horizontal containment.

- Installed and relaunched updater-enabled version 2.1.0. Signature and signed-build checksum match; rollback is `/private/tmp/Sticky Todo.before-2.1.0.app`. Code is pushed as `a89605a`; public release-tag approval is pending.
