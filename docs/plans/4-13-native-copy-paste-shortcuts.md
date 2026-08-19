# 4-13: Native Copy And Paste Shortcuts

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Use standard macOS copy and paste behavior in editable text without adding clipboard buttons to the sticky-note interface.

## Tasks

- [x] 1. Remove the visible task Copy and composer Paste controls.
- [x] 2. Add native Edit menu responders for Command-C and Command-V.
- [x] 3. Keep deterministic agent-prompt export while removing general clipboard-read permission.
- [x] 4. Verify frontend and native builds, reinstall the app, and update project records.

## Decisions

- Clipboard behavior follows the focused editable field: click a task to edit it, then use the normal selection and Command-C / Command-V flow.
- Do not add replacement icons, buttons, shortcut hints, or other layout chrome.
- Keep the Prompt action because it generates a structured agent brief rather than duplicating ordinary copy behavior.
- Retain only clipboard write permission for Prompt export; normal text paste is handled by the macOS first responder.

## Notes

- This follow-up supersedes the visible Copy/Paste controls introduced in plan `4-5`; its prompt-export behavior remains active.
- Verification: `npm run build:frontend` and 20 passing native library tests.
- Rebuilt and reinstalled version 2.0.4 at `/Applications/Sticky Todo.app`; the installed executable checksum matches the signed release bundle.
- Runtime verification confirms the native Edit menu exposes enabled Copy and Paste commands with the standard `C` and `V` Command-key equivalents while the task composer is focused.
- The prior installation remains available at `/private/tmp/Sticky Todo.previous-before-native-clipboard.app`.
