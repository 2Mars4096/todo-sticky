# Bugs And Failed Approaches

## 2026-10-24: Remote Diane companion protocol boundary

- Dear Diane has bearer-authenticated remote APIs, but `src/diane/server/routers/sticky_todo.py` at revision `2581669` applies `Depends(local_only)` to every companion route. Non-local client/URL hosts receive 403 independently of bearer validity. A phone URL/token setting or relay deployment does not by itself make this protocol remotely supported.
- Generic `/api/v2/agent-runs` calls require separate project/execution inputs and do not expose the companion's saved defaults and immutable request receipts. Do not silently substitute that workflow or weaken the access guard. Android retains Copy agent prompt; [7-1](plans/7-1-diane-remote-feasibility.md) records the required remote companion work. The simplified desktop task row currently omits dispatch controls as documented in the desktop README.

## 2026-10-24: Android build and phone validation

- The build host provided a Java runtime without `javac`; use a full isolated JDK 17. Its default trust store lacked the host network issuer, so builds use the system Java certificate store with TLS verification enabled. The JNI dependency also requires Android platform 35 alongside app platform 36.
- Phone widget verification exposed a Solar Route label overflow at 150% text. The label now expands/wraps within its row. Optional screenshot capture must load Material Icons and run image/file operations on the real async loop; otherwise icons render as boxes or capture waits indefinitely.
- An incremental Android debug build emitted nonfatal `llvm-strip` warnings for temporary native-library files. The resulting APK built successfully, its v2 signature verified, and the packaged ARM64 Flutter library has valid ELF program/section headers. Physical execution remains part of device acceptance.
- A restored Focus duration could be valid in stored state (1–240 minutes) but outside the phone slider (5–120). The control now uses the same 1–240 range, with a widget regression covering a restored 240-minute preference.
- Android platform-specific acceptance (SAF picker, Keystore, lifecycle, IME/TalkBack and live provider access) still requires a physical device.

- 2026-10-24: Plan hid every native `Err(String)` behind the generic “Check AI assistance in Settings” message. Native string errors now reach the dialog. Test connection uses the edited form while planning loads saved settings; successful unsaved tests now explicitly say Save. Final response text can follow reasoning blocks; adapters now collect answer text instead of reading only block zero. Empty/truncated/invalid JSON responses remain errors, never task mutations. The installed provider's exact failure remains unverified without its live response.

- 2026-10-24: Carry-forward built source cleanup from its pre-request task list. A task captured while `push_task` was pending remained visible but disappeared from the saved date. Source cleanup now uses current state after destination success; edits to the moved task retain both versions with an explanation, and partial cleanup failure keeps Retry save.
- 2026-10-24: Corrupt goals fell back to an empty state and were overwritten by the mount effect. Preserve the exact original value in a separate recovery key before replacement; if that write or the initial read fails, do not overwrite the original.
- 2026-10-24: Async native file-listener registration could complete after React effect cleanup and keep stale date handlers alive. Dispose late registrations and guard callbacks.
- 2026-10-24: An unfinished moved step could be merged under a completed/stopped parent without reopening it or clearing outcome review. Match manual step insertion while leaving duplicate and completed-step inserts unchanged.
- 2026-10-24: Chromium blurs a focused button when it becomes disabled. The Suggest outcome button therefore closed its enclosing blur-committing editor as the request started. Keep it focusable with `aria-disabled` and the existing in-flight guard; the original browser suite reproduced this on the base UI too.

- 2026-10-23: Earlier-task dragging was constrained to the original source date, preventing promotion into Today. Explicit root promotion now preserves full task metadata and saves the destination before archive removal. A cross-file partial failure can leave both copies until Retry; the latest snapshot stays in memory. Step move labels retain their existing destination when the parent gains Move to today.

- 2026-10-21: GitHub CLI status/cancellation hit the anonymous API rate limit during releases; optional custom-note edits still return HTTP 401. Public workflow HTML, release asset listings, downloads and signature verification remain usable. Verify older releases with the validator/package.json from their tag, because the validator intentionally compares against its local package version.

- 2026-10-21: Native Ready revealed the WebView before React replaced the separate startup surface, allowing a different layout to flash on launch. Use a one-shot frontend-ready signal after commit/paint, plus a bounded native fallback so the prior invisible-window failure cannot recur.

## 2026-10-21: UI Refinement Worktree

- Selecting a task could start an outcome request and ordinary Tab navigation could accept it. Suggestions now require explicit intent inside the editor; cancellation and unchanged Revise retain review readiness. Date changes are staged before committing history.
- Compact idle rails consumed 92px, and fixed footer controls could overlap. Named compact Goals/Focus entries restore task width; the footer wraps and wide provider controls remain bounded. Enlarged date text wraps instead of truncating.
- Failed task writes were console-only and could lose their pending retry. The latest snapshot remains in memory with persistent Retry, and failed saves block reload/navigation. A newer queued snapshot can run after an older write fails.
- Mutating the archived template after deletion broke original-position Undo around hidden completed rows. Keep the original template and track saved content separately. Restoring an unfinished step under a newly closed parent must reopen that parent; reversing a plan must preserve work completed/edited since application.
- Outcome/action layout changes on pointerdown/blur could move Earlier tasks, Show steps or another click target before pointerup. Defer selection/editor layout settling until the pointer click completes; keyboard focus behavior stays immediate.
- Three.js already declares `cameraPosition` in ShaderMaterial programs. Duplicate declarations caused compile errors; the cloud-shadow fragment also needed its `modelMatrix` declaration. Construction, shader and context failures now use SVG fallback with recoverable session controls. Live-route geometry preallocates its buffer instead of changing GPU attribute size.
- Plan output previously applied immediately with default assumptions. Validate selected date/time/task/machine context, preview it, reject stale responses and replace only unfinished generated blocks for that date. Undo remains scoped to a loaded snapshot and is cleared on successful refresh or moving work.
- A late AI breakdown could reopen a task after Complete/Stop or append work based on an obsolete title/outcome. Capture the target fingerprint and loaded date, rejecting changed/closed targets while allowing unrelated edits. Apply, Undo and arriving breakdowns also reject mutations while the selected-day file read is pending, preventing a refresh from replacing newly written work.
- Browser geometry checks must wait for layout transitions to settle after viewport/text changes. Tests use real production assets and synthetic bridge data; forced WebGL faults verify the fallback, not native GPU compatibility.
- This Linux review environment has no Cargo/Rust compiler or installed desktop app. The new native planning-window test is source-only here. Native build/tests, physical IME, platform drag/resize and installed WebView/GPU acceptance remain pending; no real-person study was conducted.

- 2026-10-21: After v2.1.11 publication, GitHub CLI requests began returning HTTP 401, including with environment tokens removed. Public API/download endpoints remain usable for verification; the optional custom release-note edit was not applied, so generated notes remain. Git transport uses SSH independently.

- 2026-10-21: Standalone Python HTTPS verification lacked the local issuer certificate. Use the system HTTPS client with normal certificate validation; do not disable TLS verification. The OpenRouter model check succeeds through system curl.

## 2026-10-21: Review Build Toolchain

- `git worktree move` cannot cross from `/private/tmp` to the project volume. Keep the build checkout detached and create a fresh durable worktree at the same feature commit.
- The prior temporary Rust toolchain had been cleaned up. Restore an isolated toolchain and use its direct bin path; the account Cargo cache contains the required crates. Do not change the user’s default toolchain.
- Rust 1.99.1 minimal toolchain emitted nonfatal `rust-objcopy` debug-stripping warnings about a missing LLVM library; optimized app build and strict deep signature verification succeeded.
- Browser verification uses isolated fixture data; it does not establish installed macOS drag acceptance.

## 2026-10-21: Star Focus Type Checking And Lighting

- Fixed missing light-angle argument that could generate invalid atmosphere coordinates, optional-ring closure narrowing, ES2020-incompatible array indexing, and retention-limit normalization.
- Added matching Three.js type declarations and nullable texture guards. Full `tsc --noEmit` now passes; older type-check entries below describe historical failures.
- Native task dragging remains an acceptance boundary, not a newly reproduced failure; existing pointer capture implementation is retained.

## 2026-10-12: Rollover Loading Regression In 2.1.9

- The first rollover implementation awaited the full archive before displaying Today and rendered every unfinished root at once. Repeated historical date sections across weekly files inflated the user's list to 10,264 roots and created duplicate UI IDs.
- Read-only measurements: 54 files, approximately 1.7 MB; raw scan under one second but 4,400 sections across only 130 dates. Calendar source-file ownership reduces the carried list to 297 roots.
- Fix: background history with independent timeout/retry, canonical source selection, and 40-root rendering batches. Initial small browser fixtures missed this; large/delayed/stalled fixtures now cover the regression.

## 2026-10-12: Completion And Cumulative Daily Work

- Parent completion previously changed only its own checkbox; it now recursively completes editable steps. Adding/reopening unfinished steps changes a completed parent to partial.
- Date loading previously discarded debounced saves. Reload/date navigation now drains pending writes and rejects stale load responses.
- Missing or cloud-only archive files must not hide all readable backlog tasks. Today opts into partial native range extraction and shows a retry notice; ordinary agent extraction remains strict.

## 2026-10-11: Optional Integration Failure Containment

- Merge verification initially used a Cargo cache without `dotenvy`. The existing app-account cache contains it; native tests use that cache with the isolated Rust toolchain. Both native commands and independent CSS additions are retained when resolving the credential-fallback/handoff conflicts.

- Fixed unchecked Diane payloads reaching project/artifact rendering and potentially taking down task controls. Validate protocol data and persisted receipts before using them.
- Fixed failed polling overwriting unreadable saved links with an empty receipt store. Stop integration polling after parse failure and leave original bytes intact for recovery.

## 2026-10-10: Diane Integration Validation

- 2026-10-10: Discarded Keychain-sharing prototype before applying it to this repository at user request; no existing credentials migrated. Native test compilation initially used an unimported `json!` macro; qualify `serde_json::json!`. Use isolated `/private/tmp/sticky-todo-rustup` toolchain because the default Rust environment is unconfigured.

- Diane currently keeps project/profile selections in renderer storage. Calling its raw run endpoint would bypass those defaults; the companion bridge publishes the existing composer payload instead.
- Worktree dependency symlinks initially sent Vite/TypeScript caches into the source checkout. Use a worktree-local node_modules directory with dependency links and local caches. Diane requires Node 22 here.
- Playwright CLI was unavailable offline; the installed Python Playwright package provided isolated Chrome checks.
- Default cargo lacked a selected toolchain; validation used the existing `/private/tmp/sticky-todo-rustup` toolchain.
- Installed desktop round-trip and authenticated model acceptance remain pending. No existing app was restarted.

## 2026-10-05: Existing Full TypeScript Check Failures

- `npx tsc --noEmit` reports errors in `StarFocusOrbitalMap.tsx`, `StarFocusOrbitalMap3D.tsx`, and `useStarFocus.ts`: optional ring narrowing, ES2020 array `.at`, an argument-count mismatch, missing Three.js types and dependent typing errors, and retention-cap typing.
- These modules are unchanged by the inline task-entry update. The frontend Vite build succeeds; full type checking remains unresolved.

## Active Issues

- 2026-10-05: User reports installed task reorder handles do not work despite earlier browser checks. Source now uses captured pointer gestures instead of HTML drag-and-drop and explicitly focuses handles. Browser pointer/keyboard/persistence checks pass; the exact native cause and rebuilt desktop behavior remain unverified.

- 2026-08-16: The prior default-store `2026-03-09/index.md` remains a 2,648-byte `SF_DATALESS` placeholder. Resetting its request and restarting Dropbox under the correct account profile did not materialize it because the File Provider fetch job stayed detached from its invalidated extension service; the oldest local Time Machine snapshot contains the same placeholder. Recover through a signed-in Dropbox web session or another remote copy before merging this week.
- 2026-08-16: Dropbox/File Provider can report a Markdown archive as downloading indefinitely while it remains `SF_DATALESS`. The app now fails fast with a recoverable cloud-only state, but Dropbox or Finder must still materialize the remote contents before previous tasks can be read.
- 2026-08-16: The installed app could reach WebKit's completed paint state while presenting a blank white native surface. Its task archive was a zero-block `dataless` File Provider placeholder, and synchronous task loading blocked Tauri's UI thread while the provider tried to materialize it. Startup reads now run on the blocking worker pool; the unsupported transparent-window configuration was also replaced with an explicit opaque background, and a boot fallback keeps future failures visible.
- 2026-08-10: `npm install` reports five dependency advisories (`1` low, `4` high). This clipboard slice does not run `npm audit fix` because automatic dependency rewrites are outside its scope; audit and upgrade the affected dependency chains separately.
- 2026-08-10: Repository-wide `tsc --noEmit` reports pre-existing type errors in the Star Focus orbital renderers and archive-limit typing even though the documented Vite frontend build succeeds. Use focused type checks for unrelated slices until those errors are resolved.

## Resolved Issues

- 2026-10-05: Manual step capture showed only a plus icon until clicked, leaving the expected input area blank. The labeled, bordered field is now always visible on editable parents. Tray shortcuts were undiscoverable; menu labels now expose the toggle binding and Quit accelerator.

- 2026-10-03: Task editing was limited to the rendered title and a text-sized input. The content cell now handles blank-space clicks and the editor fills the space before the action group.

- 2026-09-23: An idle window could keep labeling yesterday as Today because `isToday` was only evaluated during incidental renders. The calendar now updates a local-date state on a midnight/minute timer and focus/visibility/page restoration; regression coverage verifies the selected date stays intact and Go to today targets the current date.

## Failed Approaches

- 2026-10-05: GitHub draft release asset URLs use a temporary `untagged-*` path even when `tagName` is correct. Comparing those URLs to final manifest URLs blocked 2.1.1 publication after all builds passed. Validate draft uploaded asset names against canonical final URLs, then compare actual URLs after publication. Regression coverage accepts draft URLs and rejects incorrect published URLs or renamed assets.

- 2026-10-03: GitHub changed spaces in uploaded release asset names to dots, so locally encoded manifest URLs returned 404. Normalize asset names before copying and generating URLs, then compare every updater URL against GitHub’s uploaded asset list before publication. Limit release files to installers and signatures; generic tarball matching also captured Debian package internals.

- 2026-10-03: The first universal Mac release compiled the GUI but bundling could not find `target/universal-apple-darwin/release/sticky-todo-api`. Build the companion CLI for both Mac targets and combine it with `lipo` before Tauri packages the app. Linux and Windows builds passed.

- 2026-10-03: Adding the newest updater packages pulled the JavaScript core API to 2.12 while native Tauri remained 2.10, causing bundling to reject the mismatch. Keep the root API at `~2.10.1` and native updater/process at `~2.12.0` / `~2.3.1` to avoid an unrelated runtime upgrade.
- 2026-10-03: GitHub CLI in the isolated shell could not locate the refreshed credential through its default keychain. Use the explicit login keychain and decode the standard go-keyring prefix into a subprocess environment; never print or persist the token. The authenticated API then succeeds.

- 2026-10-03: Native verification of the album prompt revision could not start: rustup has no default Cargo toolchain in the current environment. Resolved for reinstall by installing stable Rust under `/private/tmp/sticky-todo-rustup` and reusing `/Users/lizhi/.cargo` offline.

- 2026-09-23: The launcher-isolated Cargo home stalled on a crates.io index update. Reuse `/Users/lizhi/.cargo` with `CARGO_NET_OFFLINE=true` and the existing temporary Rust toolchain for this reinstall.

- 2026-09-22: App rebuild could not start because rustup had no default toolchain and only Rust 1.72.1 installed. Use a temporary `RUSTUP_HOME` with a current stable minimal toolchain and an explicit `RUSTUP_TOOLCHAIN=stable`; keep the user’s global Rust configuration unchanged.

- 2026-09-15: Local Python’s default certificate store failed TLS verification during the OpenRouter probe. Retry with `/etc/ssl/cert.pem` as the CA bundle; verification stayed enabled and the request succeeded.

- 2026-09-15: Build-cache removal with Python `shutil.rmtree` left a `.DS_Store` file and failed with directory-not-empty. Inspect the remaining entry, then retry removal of only the approved build directories; the scoped retry succeeded.
- 2026-08-19: Passing `--ask-for-approval` after `codex exec` fails because that approval flag belongs to the global CLI argument set. Place `--ask-for-approval never` and `--sandbox read-only` before the `exec` subcommand; keep exec-specific isolation flags after it.
- 2026-08-19: An app-only Tauri build inferred the sibling `sticky-todo-api` CLI as its source executable. Setting only `mainBinaryName` renamed that CLI to `todo-sticky`, so metadata and signature checks alone were insufficient; direct launch exposed the CLI usage text and the previous app was restored. Keep Cargo `default-run` and Tauri `mainBinaryName` set to `todo-sticky`, then verify bundle metadata, executable size/hash, and direct GUI launch before replacement.
- 2026-08-10: macOS `screencapture` could enumerate the Sticky Todo window but could not capture either its window ID or exact rectangle in the current automation session. Use signed-bundle, process-environment, stable-store timestamp, and parser evidence when Screen Recording is unavailable.
- 2026-08-10: The Computer Use `Sky` native pipe failed to start while inspecting the installed app, including after the required app-identifier fallback. Use storage, process, and parser evidence for diagnosis until the local bridge is available.
- 2026-08-16: The Computer Use `Sky` native pipe still fails to start in the current environment, and targeted `screencapture` still cannot create an image from the enumerated Sticky Todo window. Use the local boot-stage diagnostic plus CoreGraphics window/process evidence until those inspection paths recover.
- 2026-08-10: `cargo fmt --check` cannot run because the installed stable Rust toolchain does not include the optional `rustfmt` component. Keep touched Rust manually formatted or install that component before relying on automated formatting.
- 2026-08-02: Raw Three.js `PointsMaterial` particles can expose their square billboard shape when a star or dust mote passes close to the camera. Use a radial alpha-masked point texture with a small `alphaTest` instead.
- 2026-08-02: Showing the configured hidden window inside Tauri's `.setup(...)` callback is too early and can leave the fresh process running without a visible window. Position and show it from `RunEvent::Ready` instead.
- 2026-04-20: An over-eager Star Focus prototype was started before the design was locked. The prototype was reverted. Keep design/planning ahead of implementation for this feature track.
- 2026-04-20: Deriving Star Focus mission numbering from the retained archive length causes duplicate `vehicleCode` and `orbitIndex` values once the local archive reaches its cap. Future mission numbering should derive from the highest retained orbit index instead.

- 2026-10-10: Full `tsc --noEmit` has 16 pre-existing errors in StarFocusOrbitalMap, StarFocusOrbitalMap3D and useStarFocus. Verified identical output in the unchanged repo and credential-fallback staging tree; production Vite build passes.

## 2026-10-24: Optional account/sync implementation

- Google authentication must run in the system browser; use the proof-bound handoff rather than relying on a Google popup inside the desktop WebView. No existing Dear Diane Firebase configuration was found.
- A downloaded date tombstone becomes an empty local Markdown date. Reconciliation explicitly treats this as the same deletion, preventing repeated resurrection of empty records. Local focus-history retention must not erase cloud history.
- Persist remote goals/focus successfully before acknowledging their sync baseline. Corrupt goals must be backed up or recovered before remote application. Never treat unreadable task archives as deletions.
- FastAPI TestClient stalls inside this environment's default sandbox even for health checks; approved isolated execution completes the API test suite. This is a test-runtime constraint, not a production API timeout.
