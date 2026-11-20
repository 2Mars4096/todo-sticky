# 22: Task from screenshot

**Status:** in-progress  
**Goal:** Turn a selected screen region into an editable task and steps on Mac.

## Tasks
- [x] Update Flameshot and create the GitHub fork.
- [x] Capture a region, recognize text locally and review a structured draft.
- [x] Build, verify signatures and install both Mac applications.
- [x] Align the camera with the quick-add field and Add button. Check keyboard activation, draft retention, review, cancel and save.
- [x] Publish and install the styled [Flameshot fork](https://github.com/2Mars4096/flameshot/tree/codex/sticky-todo-capture) at 63a1e50.
- [x] Bundle the editor and settings window, honor the existing Flameshot profile and enable annotation, Save, Copy and Accept.
- [x] Verify the installed camera launches the nested helper and Return sends recognized on-screen text into the editable Todo review. Discard the verification draft.
- [ ] Verify automated region-only drag on the two-display Mac. The native automation surface could address the overlay with the keyboard but failed to drag it.

## Decisions
- Use the Flameshot 15 CLI and macOS Vision. Save through the ordinary dated task bundle operation.

## Verification

All 31 Node suites and TypeScript passed. The compiled Vision bridge recognized a generated title and two steps. The three composer controls measured 38 px high at widths 340, 460 and 800. The actual Qt controls were rendered on a test surface. A live fixed-region capture returned PNG bytes and OCR text, but the text did not match the fixture on this two-display Mac. The simulated drag did not complete reliably.

The embedded fork at bcfeb16 reads the original INI. All five configured values matched and the INI checksum was identical before and after installation. Both app signatures, the embedded config check, TypeScript and all 31 Node suites passed.

## Resident editor and macOS permissions

- [x] Start the regular hotkey listener, keep copy/save independent, and add a visible Todo action. The user confirmed the shortcut opens capture.
- [x] Route camera and settings to the resident editor; startup, settings and OCR do not request screen access from Todo.
- [x] Supersede the standalone grant flow with an internal helper and per-capture system selection.
- [ ] Verify a user-selected display returns to the annotation editor on this Mac.

- [x] Correct the post-Share screenshot denial using the picker-authorized SCStream.

## Local signing continuity

- [x] Sign and install the app and nested helper using a dedicated non-exportable local key.
- [x] Configure local builds to reuse the same certificate and bundle identifiers.

- [x] Verified the normal Tauri build against the installed requirements and tested mutual compatibility with changed app and helper hashes.
