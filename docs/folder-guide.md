# Folder guide

One canonical home per product surface. Run npm commands from the repository root.

| Location | Purpose / cleanup rule |
| --- | --- |
| `web/src/` | Shared original React UI used by web and desktop; no duplicate standalone JSX. |
| `desktop/src-tauri/` | Tauri native shell, native services and desktop packaging. |
| `phone/` | Flutter app with Android source; iOS is planned, not implemented. |
| `plugin/` | Product-owned embedded frontend and canonical backend release. `plugin/backend/` is the package source, not a second live service. |
| `backend/` | Original sync deployment retained for migration/rollback; new shared data authority is Shiprite canonical records. |
| `app.manifest.json` | Cross-surface product contract and identity/version metadata; no empty shared directory. |
| `src`, `src-tauri` | Compatibility symlinks used by test fixtures and Tauri CLI/release discovery. Keep until those callers migrate. |
| `desktop/package.json`, `desktop/dist` | Symlinks used by native version/frontend asset resolution. Root package.json and dist remain authoritative. |
| `scripts/`, `tests/` | Build, release, demo and verification tools. Keep. See script map below. |
| `docs/`, `demo/` | Project records and published demonstration assets. Keep. |
| `content/` | Local task files, including a history-recovery source. Never treat as build output. |
| `todo-sticky-latest.apk` | Current signed Android delivery. Replace only after verifying package, version and signer. Ignored by Git. |
| `release/` | Local packaging staging area. Superseded packages were moved to Trash on November 20; see Plan 9 for recovery. Ignored by Git. |
| `output/account-sync/` | Downloaded artifacts and deployment/verification evidence. Keep while delivery work is active. |
| `output/playwright/` | Disposable local browser intermediates; old screenshots, recordings and logs have been removed. Retained fixture source is not a build artifact. |
| `node_modules/`, `backend/.venv/` | Installed dependencies. Retained so local development still works. Recreate with the documented install steps if removed. |
| `dist/` | Generated frontend build; retained for preview. Recreate with `npm run build:frontend`. |
| `src-tauri/target/` | Rust build output including the current native bundle. August rollback bundles were moved to Trash on November 20. Review build outputs individually before cleanup. |
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

Shared identity, data and quota cutover is tracked in [the shared-app plan](plans/17-diane-shared-apps.md) and [the canonical sync plan](plans/17-1-canonical-sync.md).

## Consolidation policy

Completed follow-ups share their existing parent/implementation plan with stable anchors; active plans stay separate. The Star Focus design lock remains small and separate from implementation history. Update an existing document before adding one. Historical release evidence and changelog entries remain available.

Keep Cargo lock files and build completion markers even when empty. The [folder cleanup plan](plans/9-folder-cleanup.md) records previous removals and their verification.

The November 20 package cleanup moved obsolete installers to a checksum-verified Trash recovery folder recorded in [Plan 9](plans/9-folder-cleanup.md). Historical receipts and account-sync setup notes retain their original paths and describe past deliveries. Use the root APK for the current Android installer.
