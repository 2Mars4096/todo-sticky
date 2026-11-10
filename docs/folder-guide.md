# Folder guide

One canonical home per product surface. Run npm commands from the repository root.

| Location | Purpose / cleanup rule |
| --- | --- |
| `web/src/` | Shared original React UI used by web and desktop; no duplicate standalone JSX. |
| `desktop/src-tauri/` | Tauri native shell, native services and desktop packaging. |
| `phone/` | Flutter app with Android source; iOS is planned, not implemented. |
| `plugin/` | Product-owned embedded frontend and canonical backend release. `plugin/backend/` is the package source, not a second live service. |
| `backend/` | Original sync deployment retained for migration/rollback; new shared data authority is Diane canonical records. |
| `app.manifest.json` | Cross-surface product contract and identity/version metadata; no empty shared directory. |
| `src`, `src-tauri` | Compatibility symlinks used by test fixtures and Tauri CLI/release discovery. Keep until those callers migrate. |
| `desktop/package.json`, `desktop/dist` | Symlinks used by native version/frontend asset resolution. Root package.json and dist remain authoritative. |
| `scripts/`, `tests/` | Build, release, demo and verification tools. Keep. See script map below. |
| `docs/`, `demo/` | Project records and published demonstration assets. Keep. |
| `content/` | Local task files, including a history-recovery source. Never treat as build output. |
| `release/` | Delivered Android APK. Keep until deliberately replaced. Ignored by Git. |
| `output/account-sync/` | Downloaded artifacts and deployment/verification evidence. Keep while delivery work is active. |
| `output/playwright/` | Disposable local browser intermediates; old screenshots, recordings and logs have been removed. Retained fixture source is not a build artifact. |
| `node_modules/`, `backend/.venv/` | Installed dependencies. Retained so local development still works. Recreate with the documented install steps if removed. |
| `dist/` | Generated frontend build; retained for preview. Recreate with `npm run build:frontend`. |
| `src-tauri/target/` | Rust build output. Compiler caches are reproducible, but this folder also contains release bundles and historical `rollback/` copies: do not delete it wholesale. |
| `src-tauri/gen/` | Generated Tauri schemas. Leave tool-managed. |
| `.git/` | Repository history and branch metadata. Never manually clean. |
| `.github/` | Automated build/release workflows. Keep. |
| `.worktrees/` | Linked Git checkouts. `today-first-planning` contains an unmerged commit (`8aee543`); preserve until reviewed. Use Git worktree commands for removal. |
| `.env`, `backend/env.yaml` | Private local configuration. Keep locally and out of Git. |
| `.env.example`, `.gitignore`, `backend/.dockerignore`, `backend/.gcloudignore` | Shared configuration templates and inclusion/exclusion rules. Keep. |
| `phone/.metadata`, nested `.gitignore` files | Flutter project metadata and generated-file exclusions. Keep. |
| `.DS_Store`, `__pycache__/`, `.playwright-cli/` | Finder metadata, Python bytecode and temporary browser snapshots/logs; disposable and ignored. May regenerate. |

## Script map

| Script | Used for |
| --- | --- |
| `plugin/build.mjs` | `npm --prefix plugin run build`; canonical embedded UI bundler. |
| `scripts/tauri-build.js` | `npm run build` desktop packaging wrapper. |
| `scripts/run-tests.cjs` | `npm test` suite runner. |
| `scripts/record-demos.cjs` | Reproducible README demonstrations; see `demo/README.md`. |
| `scripts/prepare-update-release.cjs` | Release workflow updater manifest preparation. |
| `scripts/validate-update-manifest.cjs` | Release workflow manifest validation. |
| `scripts/validate-release-assets.cjs` | Release workflow uploaded-asset verification. |
| `backend/deploy.sh` | Cloud backend deployment. |

`.cjs` means CommonJS JavaScript; `.js`, `.py`, and `.sh` identify JavaScript, Python, and shell scripts. Numbered files in `docs/plans/` are linked project history, not temporary scripts.

On 2026-10-29, cleanup removed only Rust compiler-cache subdirectories (`build`, `deps`, `incremental`, `.fingerprint` under debug/release), backend Python bytecode, selected Finder metadata and the empty `.cursor/`. Native executables, release bundles, rollback copies, dependencies, private configuration, task data and all linked checkout contents were preserved. The next native build must regenerate its compiler caches and will take longer.

The independent-app layout is documented here rather than in a parallel layout guide. Shared identity/data/quota cutover is tracked in [17](plans/17-diane-shared-apps.md) and [17-1](plans/17-1-canonical-sync.md). Standalone UI remains unchanged.

## Consolidation policy

Completed follow-ups share their existing parent/implementation plan with stable anchors; active plans stay separate. The Star Focus design lock remains small and separate from implementation history. Update an existing document before adding one. Historical release evidence and changelog entries remain available.

The November 10 audit covered all 558 tracked paths (source, tests, scripts, configuration, docs and assets), including exact duplicate checks. Removed 79 merged plan files, unused Tauri Android/iOS icon exports (Flutter retains its own icons), four obsolete symlinks, a plugin build forwarding script and the redundant plugin source README. Removed the empty shared scaffold and temporary browser logs/snapshots. No dependency tree, task archive, private configuration, output delivery evidence, release artifact or linked worktree was deleted. Native platform/package directory nesting remains intentional.

The second November 10 pass removes obsolete screenshots, UI XML dumps, intermediate WebM recordings, logs, one checksum-verified duplicate APK, empty review directories and an orphan APK checksum. Verification JSON, notebook snapshots, unique APK backups and the current root APK remain. The old seed-demo script/command was removed; scripts/record-demos.cjs is the sole showcase generator and uses isolated synthetic data.

Empty files are not automatically disposable: Cargo lock files and build completion markers are tool-managed. Stale plugin/backend/build and egg-info output, the obsolete backend/diane namespace directories and empty phone build logs were removed; actual backend source lives under plugin/backend/src/diane/plugins.
