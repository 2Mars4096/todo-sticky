# 4-19: GitHub In-App Updates

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Let users check for, install, and restart into signed GitHub releases from Settings.

## Tasks
- [x] 1. Add the official updater and process plugins with scoped permissions.
- [x] 2. Add compact Settings controls for checking, availability, progress, errors, and restart.
- [x] 3. Wait for pending task/state writes and require saved settings before installation.
- [x] 4. Configure a persistent signing key and GitHub release artifacts plus latest.json.
- [x] 5. Verify update lifecycle and release configuration; build and install the initial updater-enabled version.
- [x] 6. Publish and verify the first signed release.

## Decisions
- Updates are checked on demand in Settings; installation and restart are explicitly initiated by the user.
- Use published stable GitHub Releases and signature verification; never embed GitHub credentials in the app.
- Keep signing material outside the repository and upload only the private signing key to the repository's Actions secret.
- Build platform artifacts in parallel; create one manifest and publish a draft only after every build and validation succeeds.
- Preserve tasks and settings; block installation while settings are unsaved or a focus session is active.

## Notes
- The release workflow now signs updater archives and generates a complete manifest before publication.

- The signing key is `/Users/lizhi/.tauri/todo-sticky-updater.key` (outside the repo). The user explicitly approved upload to the Actions secret; upload was verified.
- GitHub API access is restored using the explicit user login keychain. The repository is public.

- Local checks pass: updater lifecycle, pending-write flush/retry, release manifest validation, task completion, calendar rollover, frontend build, native check, and signed macOS packaging. The real archive signature verifies; a one-byte alteration is rejected.

- Browser verification at 340px and 460px passes for check/install/restart controls, progress, busy form locking, unsaved-settings/focus guards, and horizontal containment.

- Installed and relaunched updater-enabled version 2.1.0. Signature and signed-build checksum match; rollback is `/private/tmp/Sticky Todo.before-2.1.0.app`. Code is pushed as `a89605a`; the user approved publication and tag `v2.1.0` was pushed.

- Initial release run `37101371972`: Linux and Windows passed; universal Mac packaging failed because the companion CLI had no universal binary. The workflow now builds it with `lipo` and supports retrying the unchanged release tag.

- The direct companion-CLI build first generates frontend assets required by the native context; failed jobs now retain dependency caches for retries.

- Public download verification caught GitHub changing spaces in asset names to dots. The manifest was repaired using actual GitHub asset URLs; future releases normalize names and verify uploaded URLs before publication.

- Published [v2.1.0](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.0); [retry run 37101963767](https://github.com/2Mars4096/todo-sticky/actions/runs/37101963767) passed all three builds and publication.
- Verified the public manifest and every platform archive against the app trust key; altered archives were rejected. The native Tauri updater downloaded and verified the 9,892,545-byte Mac archive. Both Mac executables contain Intel and Apple Silicon slices, and the bundle passes strict signature verification.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="4-22-publish-2-1-1"></a>

## 4-22: Publish 2.1.1

**Goal:** Publish the task-input, reorder, and tray-menu fixes through the signed in-app updater.

### Tasks
- [x] 1. Review the changes and bump the package and lockfile to 2.1.1.
- [x] 2. Run release regression checks and commit the release source.
- [x] 3. Push main and v2.1.1, monitor all platform builds, and publish.
- [x] 4. Verify the public update manifest, downloadable archives, and signatures.

### Decisions
- User explicitly authorized publication on 2026-10-05.
- Use the existing signed multi-platform release workflow and unchanged updater trust key.
- Preserve the desktop verification limitation: real mouse and keyboard browser checks pass, but installed macOS interactions have not been inspected.

### Validation
- Frontend production build, five release regression scripts, all 21 native library tests, and diff hygiene pass.

### Delivery
- Release source: `59619b9`; tag `v2.1.1`.
- All three platform builds passed in [run 37260710431](https://github.com/2Mars4096/todo-sticky/actions/runs/37260710431). The publication job failed because draft asset URLs use `untagged-*` paths; the workflow now validates draft names and checks final URLs after publication, with regression coverage.
- Published the already-built draft after validating uploaded digests and updater signatures for every platform. [v2.1.1](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.1) is the latest stable release.
- macOS bundle version and strict code signature pass; both GUI and task API contain Intel and Apple Silicon slices. Installed user app is left for the in-app updater.

- Public latest.json reports 2.1.1 and all updater download URLs return HTTP 200. Public macOS bytes verify against the installed trust key. Windows/Linux CI artifacts verify cryptographically and match GitHub uploaded SHA-256 digests; a redundant full Linux public download was stopped after slow transfer, and public URL access was checked separately.

<a id="4-23-publish-2-1-2"></a>

## 4-23: Publish 2.1.2

**Goal:** Deliver the integrated step-input background through the signed in-app updater.

### Tasks
- [x] 1. Review the transparent-background change and bump the package/lockfile to 2.1.2.
- [x] 2. Run release checks, commit, and push the release tag.
- [x] 3. Monitor all platform builds and publication.
- [x] 4. Verify public update availability and the signed Mac package.

### Decisions
- User explicitly requested publication on 2026-10-05.
- Keep the existing input border and focus behavior; remove only its lighter fill.
- Use the existing signing key and repaired draft-asset validation workflow.

### Delivery
- Release source `39790c0`, tag `v2.1.2`.
- Frontend build, five release regression scripts, and diff hygiene pass.
- [Run 37266020439](https://github.com/2Mars4096/todo-sticky/actions/runs/37266020439) passed macOS, Windows, Linux, and automatic publication.
- Public latest.json reports 2.1.2; all updater URLs match the published release and return HTTP 200.
- Public Mac updater archive matches the uploaded SHA-256 digest and verifies against the existing app trust key; a tampered archive is rejected.

<a id="4-26-publish-2-1-3"></a>

## 4-26: Publish 2.1.3

**Goal:** Publish automatic update indicators and hover-revealed step entry through the signed updater.

### Tasks
- [x] 1. Review changes and bump the package and lockfile to 2.1.3.
- [x] 2. Run release checks, commit, and push the version tag.
- [x] 3. Monitor signed platform builds and automatic publication.
- [x] 4. Verify the public updater feed, download URLs, and Mac signature.

### Decisions
- User explicitly authorized publication on 2026-10-05.
- Include the new automatic-check regression suite in release CI.
- Preserve manual installation/restart and the existing updater trust key.

### Delivery
- Release source `ac72328`, tag `v2.1.3`.
- Frontend build, six release regression suites, and diff hygiene pass.
- [Run 37292860917](https://github.com/2Mars4096/todo-sticky/actions/runs/37292860917) passed Windows, Linux, universal macOS, and automatic publication.
- [v2.1.3](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.3) is published with release notes covering automatic checks, Settings/action dots, and hover step entry.
- Public latest.json reports 2.1.3; all updater URLs match uploaded assets and return HTTP 200. Public Mac bytes match the uploaded SHA-256 digest and verify against the app trust key; tampered bytes are rejected.

<a id="4-28-publish-2-1-4"></a>

## 4-28: Publish 2.1.4

**Goal:** Publish hover-revealed top-level task entry through the signed updater.

### Tasks
- [x] 1. Apply the requested hover behavior and bump the version to 2.1.4.
- [x] 2. Run the frontend build and six release regression suites.
- [x] 3. Commit, tag, and push the release source.
- [x] 4. Monitor platform builds and verify published updater assets.

### Decisions
- User authorized publication, then clarified that the empty field should appear on hover.
- Preserve keyboard focus, visible drafts, and touch-device access, matching step entry.

### Delivery
- Release source `d324ceb`, tag `v2.1.4`.
- [Release workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37335803756) passed all three platform builds and publication.
- [v2.1.4](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.4) published on 2026-10-06 (Hong Kong).
- Public updater feed reports 2.1.4 and covers all four targets. Published asset matching and HTTP download checks pass.

<a id="4-29-publish-2-1-5"></a>

## 4-29: Publish 2.1.5

**Goal:** Publish the root-entry alignment correction.

### Tasks
- [x] 1. Remove the leading plus and align the input to the root checkbox column.
- [x] 2. Verify frontend build, six release suites, and diff hygiene; bump to 2.1.5.
- [x] 3. Push the release tag and monitor signed platform builds.
- [x] 4. Verify public updater manifest and download URLs.

### Decisions
- User explicitly authorized republication on 2026-10-08.
- Preserve hover/focus reveal, visible drafts, touch access, and Enter submission.

### Delivery
- Release source `2d018ab`, tag `v2.1.5`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37737069107) passed macOS, Windows, Linux, and publication.
- [v2.1.5](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.5) is public. Updater manifest covers all four targets; asset matching and all download URL checks pass.

<a id="4-30-publish-2-1-6"></a>

## 4-30: Publish 2.1.6

**Goal:** Publish automatic update checks every 15 minutes.

### Tasks
- [x] 1. Bump to 2.1.6 and verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push the release tag; monitor signed builds.
- [x] 3. Verify published updater manifest and download URLs.

### Decisions
- User explicitly authorized publication.
- Startup checks, manual installation, and restart behavior remain unchanged.

### Delivery
- Release source `2a10146`, tag `v2.1.6`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/37744287877) passed all three platform builds and publication.
- [v2.1.6](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.6) is public. Updater manifest covers all four targets; asset matching and all download URL checks pass.

<a id="4-31-publish-2-1-7"></a>

## 4-31: Publish 2.1.7

**Goal:** Publish standalone-safe Todo with optional Diane handoff and credential fallback.

### Tasks
- [x] 1. Bump to 2.1.7 and verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push the release tag; monitor signed builds.
- [x] 3. Verify published updater manifest and download URLs.

### Decisions
- User explicitly authorized publication.
- Todo works independently of Diane. Handoff requires the separate Diane companion update; its deployment and installed-app acceptance remain pending.
- Merged source passed 24 native tests and disconnected/malformed/stalled browser checks; existing Star Focus TypeScript errors remain.

### Delivery
- Release source `b62dc29`, tag `v2.1.7`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38128569236) passed macOS universal, Windows, Linux, and publication.
- [v2.1.7](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.7) is public. Latest updater manifest covers all four targets; uploaded asset matching and all updater download URLs pass.
- Local GitHub CLI credentials were invalid for custom release-note editing; workflow publication succeeded using its own credentials, and verification used public endpoints.

<a id="4-32-publish-2-1-8"></a>

## 4-32: Publish 2.1.8

**Goal:** Publish the default-off local Diane connection setting and grey unavailable controls.

### Tasks
- [x] 1. Verify frontend build, six release suites, and diff hygiene.
- [x] 2. Commit and push v2.1.8; monitor signed platform builds.
- [x] 3. Verify public updater manifest, assets, and download URLs.

### Decisions
- User explicitly requested publication.
- Native tests (24) and browser lifecycle/disabled-mode checks passed before release preparation.
- Diane companion deployment remains separate; Todo works independently.

### Delivery
- Release source `902333e`, tag `v2.1.8`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38135848396) passed all three platform builds and publication.
- [v2.1.8](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.8) is public. Latest updater manifest covers all four targets; asset matching and all updater download URLs pass.

<a id="4-34-publish-2-1-9"></a>

## 4-34: Publish 2.1.9

**Goal:** Publish parent completion cascade and cumulative daily rollover.

### Tasks
- [x] 1. Verify frontend build, seven release suites, and diff hygiene.
- [x] 2. Commit and push v2.1.9; monitor signed platform builds.
- [x] 3. Verify public updater manifest, assets, and download URLs.

### Decisions
- User explicitly requested publication.
- Native check, 25 native tests, and browser layout/persistence checks passed during implementation.
- Local installed app and user task data are unchanged by publication.

### Delivery
- Source commit `075a5c7`, tag `v2.1.9`, pushed to `origin/main`.
- [Release workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38223808117) passed all three platform builds and publication.
- [v2.1.9](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.9) is public and latest. The updater manifest covers all four targets; asset matching, all updater download URLs, and matching signature files pass.

<a id="4-36-publish-2-1-10"></a>

## 4-36: Publish 2.1.10

**Goal:** Replace 2.1.9 as the latest release with the corrected task-loading behavior.

### Tasks
- [x] 1. Verify frontend build, eight release suites, native check, and diff hygiene.
- [x] 2. Commit and push v2.1.10 to the existing GitHub destination; monitor signed builds.
- [x] 3. Verify the latest updater manifest, public assets, and download URLs.

### Decisions
- User requested republishing the fixed build. Increment the patch so installed 2.1.9 clients detect it through the updater.
- Preserve the previous public release for rollback rather than silently changing binaries under its tag.
- Native tests (26) and delayed/stalled/large-backlog browser checks pass.

### Delivery
- Source `fcc03df`, tag `v2.1.10`, pushed to `origin/main`.
- [Workflow](https://github.com/2Mars4096/todo-sticky/actions/runs/38226797593) passed all three platform builds and publication.
- [v2.1.10](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.10) is public and latest. Updater manifest, asset URLs, downloads, and matching signature files verify for all four targets.

<a id="4-43-publish-2-1-11"></a>

## 4-43: Publish 2.1.11

**Goal:** Merge and release finish promises, consistent inline metadata, compact goals and reliability fixes.

### Tasks
- [x] Verify UI flows, TypeScript and release regression suites; preserve remote main.
- [x] Merge the review branch into main and bump to 2.1.11.
- [x] Build and install locally with backup and data checks.
- [x] Push main/tag and monitor signed platform builds.
- [x] Verify public release assets and updater manifest.

### Decisions
- User explicitly authorized merge, push and release.
- Keep prior releases; publish a new patch with the existing signed CI workflow.

### Local delivery
- Version 2.1.11 installed and running with the editor-edge and compact-goals refinements. Strict signature and exact bundle checks pass; all 56 task-file hashes unchanged.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-2-1-11-vn4h7wxy/Sticky Todo.app`.
- Release source/tag: `5e93c9b`, `v2.1.11`. Workflow: https://github.com/2Mars4096/todo-sticky/actions/runs/39574639756

### Public delivery
- [v2.1.11](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.11) is public and latest. All three platform builds and publication succeeded.
- Public manifest and asset URLs verify for four updater targets. Downloaded all three unique updater packages; each signature matches the manifest and verifies cryptographically against the configured Ed25519 public key.
- Optional custom release-note editing returned HTTP 401 after publication; generated release notes remain. Public endpoint verification succeeded independently.

<a id="4-45-publish-2-1-12"></a>

## 4-45: Publish 2.1.12

**Goal:** Publish the reviewed UI refinements as the latest signed update.

### Tasks
- [x] Integrate and locally verify the reviewed feature and cleanup changes.
- [x] Choose 2.1.12 so existing 2.1.11 installs can detect the update.
- [x] Push main and version tag; monitor all platform builds.
- [x] Verify public release assets, updater manifest and signatures.

### Decisions
- User authorized push and release, with replacing today's release as an alternative. Publish a new patch and make it latest; preserve the immutable 2.1.11 tag/assets.
- Use the existing signed macOS/Windows/Linux CI pipeline; no signing-key changes.
- Installed local app already contains the reviewed code and remains labeled 2.1.11 until updated from the new release.

### Delivery
- Source `44268b4`; workflow `39594245626` succeeded on all platforms and published 2.1.12.
- Public manifest/asset links validate for all four targets; all three downloaded packages pass Ed25519 signature verification.
- User requested subsequent checkbox and spacing refinements during publication; final latest target is now 2.1.14.

<a id="4-46-checkbox-and-release-2-1-13"></a>

## 4-46: Checkbox Alignment And Release 2.1.13

**Goal:** Align checkbox visuals to task text and publish the intermediate checkbox update; final spacing/public verification is tracked in 4-47.

### Tasks
- [x] Match visible square size to title font and center on the first line, preserving 24px click targets.
- [x] Verify task/step geometry at 340px and 460px, completion via the outer target, TypeScript and production frontend build.
- [x] Commit/push main and v2.1.13; all signed platform builds and publication succeeded.
- [x] Supersede this intermediate release with approved 2.1.14; final manifest/assets/package signatures and latest pointer verified under 4-47.

### Decisions
- User requested the checkbox refinement during 2.1.12's build, followed by regenerated releases, commit and push.
- Keep in-flight/published tags immutable; release the requested follow-up as 2.1.13.
- Preserve concurrent demo/README work; scope this commit to checkbox, version and its tracking records.

### Progress
- Source/tag `7ba1c9a` / `v2.1.13`; workflow `39596361020` succeeded.
- Local 2.1.13 was installed and launched with matching bundle/signature and 56 unchanged task files; backup `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-2-1-13-_5ml2hr3`.
- The user requested equal horizontal spacing after this install; final latest verification moves to [4-47](4-19-github-in-app-updates.md#4-47-equal-task-spacing-and-release-2-1-14).

<a id="4-47-equal-task-spacing-and-release-2-1-14"></a>

## 4-47: Equal Task Spacing And Release 2.1.14

**Goal:** Make visible drag dots, checkbox and text equally spaced and publish the final reviewed interface.

### Tasks
- [x] Measure and correct visible gaps; retain 24px click/drag targets and align composers.
- [x] Verify equal task/step gaps and first-line alignment at compact/default widths; verify completion from the outer hit target.
- [x] Build/install locally and commit/push main/tag.
- [x] Finish signed platform release builds.
- [x] Verify latest public release, all updater targets and signatures.

### Decisions
- The user requested tighter equal spacing while 2.1.13 was building; publish the final follow-up as 2.1.14 without moving existing tags.
- Task gaps are 8px; 13px step squares yield symmetric 8.5px gaps inside the same 24px controls.
- Preserve concurrent documentation/demo changes outside this release scope.

### Progress
- User approved the installed spacing (“now good please release”). Source/tag `a2f3b16` / `v2.1.14`; workflow `39597263611` succeeded.
- Local 2.1.14 installed and launched with verified bundle/signature and 56 unchanged task-file hashes. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-2-1-14-pocyp4sh`.

### Public delivery
- [v2.1.14](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.14) is public and latest. All macOS/Windows/Linux builds and publication pass.
- Four updater targets and public asset links validate; all three unique downloaded packages match their signature files and verify with the configured Ed25519 public key.
- Optional custom release-note editing returned HTTP 401; generated notes remain. Public verification is independent of CLI authentication.

<a id="4-49-publish-2-1-15"></a>

## 4-49: Publish 2.1.15

**Goal:** Publish the approved earlier-task promotion and note materials from main, preserving unrelated work and pruning merged branches.

### Tasks
- [x] 1. Back up unrelated demo edits and fast-forward main to the approved preview.
- [x] 2. Prune clean merged worktrees/branches and obsolete worktree registrations.
- [x] 3. Verify release inputs, bump to 2.1.15, and push main/tag.
- [x] 4. Complete macOS, Windows and Linux builds and publish the signed updater manifest.
- [x] 5. Verify public downloads/signatures and restore unrelated demo work.

### Decisions
- User explicitly approved merge, pruning and release after testing the local 2.1.14 preview.
- No application logic changes beyond the tested `7e6ff6d`; README now describes released features.
- Uncommitted demo work stays outside this release. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/todo-main-before-2-1-15-_8i6xyll`; preservation stash `93bc231affff04122d6be61d01eb8e6ca2ea01e1`.
- The installed preview already contains the approved functionality; this publication advances the version available through Updates.

### Verification
- TypeScript, all 12 Node suites and production frontend build pass on main. Application bundles match the reviewed frontend hashes; no app code changes after approval.
- Pruned both clean merged worktrees, four stale registrations and five merged local branches. Preview screenshots retained under `output/playwright/accepted-materials-preview`.
- Workflow `39907854781` succeeded for macOS universal, Windows and Linux, then published v2.1.15 as latest. Public manifest and release asset URLs validate for four updater targets; all three unique downloaded update packages and their trusted comments pass Ed25519 verification with the configured public key.
- Restored all 19 preexisting uncommitted files. Asset hashes and every prior added documentation line verify against the backup; documentation-only conflicts retain both changes. One merged remote UI branch was also removed. Main is the sole remaining local/remote branch and worktree.

- Optional custom release-note editing returned HTTP 401; generated release notes remain. Publication and signature verification are complete.

<a id="4-52-publish-2-1-16"></a>

## 4-52: Publish 2.1.16

**Goal:** Commit/push the reviewed sync changes and publish signed desktop updates from the exact version tag.

### Tasks
- [x] Confirm origin/main matches local main and 2.1.16 is the next patch version.
- [x] Complete [smart merge and stable conflict review](16-sync-efficiency.md#16-2-smart-merge-and-stable-review), including local delivery.
- [x] Review staged source, run required checks and commit changes.
- [x] Bump desktop to 2.1.16 and push main/version tag through the existing release command.
- [x] Monitor macOS universal, Windows and Linux builds and complete publication.
- [x] Verify public updater manifest, downloads and signatures; record final delivery.

### Decisions
- User explicitly requests commit, push and release after the merge/review corrections.
- Git SSH works; GitHub CLI credentials return 401. Tag pushes can trigger the existing workflow; public endpoints can monitor publication without changing credentials.
- Exclude local notebooks, credentials, build outputs and rollback copies from Git.

### Progress
- Source `47d2271`, version commit/tag `df8c0c2` pushed to origin/main. Release workflow `42438376556`; Android CI `42438376474`. Existing GitHub CLI credential is invalid; SSH push and public monitoring work.
- Local Mac 2.1.16 installed with data preserved; original-key Android 2.1.16+16 delivered. Implementation, UI and delivery checks are recorded in plan 16-2.
- Android CI `42438376474` completed successfully, including its hosted analysis/tests and ARM64 review build. All desktop matrices passed their test gates and are building signed installers.

### Publication verification
- [v2.1.16](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.16) published as latest at `2026-11-08T02:42:01Z`, with 14 assets. Release workflow `42438376556` succeeded for macOS universal, Windows, Linux and publication. Android CI `42438376474` and documentation-push CI `42438928103` succeeded.
- Public `latest.json` matches version 2.1.16 and covers Darwin ARM64/Intel, Linux x86_64 and Windows x86_64. All three unique update packages download successfully at the declared asset sizes and pass Ed25519 signature/key-identity and trusted-comment verification against the app's configured updater key.
- Downloaded Mac app reports 2.1.16; both GUI and task API binaries contain `arm64` and `x86_64`. Strict/deep bundle signature verification passes. Verification reports and downloaded packages remain under ignored `output/merge-review-delivery/`.
- Source commit `47d2271`, release/tag commit `df8c0c2` and local-delivery record `ef1ac50` are pushed. Later commits only record delivery/publication; the release tag is unchanged. No credentials, notebooks, rollback copies or build outputs were committed.
