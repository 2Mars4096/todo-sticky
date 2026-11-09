# Folder guide

One canonical home per product surface. Legacy paths are symlinks while established build commands migrate.

| Location | Purpose / cleanup rule |
| --- | --- |
| `web/src/` | Shared original React UI used by web and desktop; no duplicate standalone JSX. |
| `desktop/src-tauri/` | Tauri native shell, native services and desktop packaging. |
| `phone/` | Flutter app; Android and iOS are separately verified targets. |
| `plugin/` | Product-owned embedded frontend and canonical backend release. `plugin/backend/` is the package source, not a second live service. |
| `backend/` | Original sync deployment retained for migration/rollback; new shared data authority is Diane canonical records. |
| `shared/`, `app.manifest.json` | Cross-surface product contract and identity/version metadata. |
| `src`, `src-tauri`, `mobile`, `index.html` | Compatibility symlinks to canonical homes; no parallel implementations. Remove only after callers are updated and verified. |
| `scripts/`, `tests/` | Build, release, demo and verification tools. Keep. See script map below. |
| `docs/`, `demo/` | Project records and published demonstration assets. Keep. |
| `content/` | Local task files, including a history-recovery source. Never treat as build output. |
| `release/` | Delivered Android APK. Keep until deliberately replaced. Ignored by Git. |
| `output/account-sync/` | Downloaded artifacts and deployment/verification evidence. Keep while delivery work is active. |
| `output/playwright/` | Local screenshots and recordings. Retained as review evidence; disposable once no longer needed. |
| `node_modules/`, `backend/.venv/` | Installed dependencies. Retained so local development still works. Recreate with the documented install steps if removed. |
| `dist/` | Generated frontend build; retained for preview. Recreate with `npm run build:frontend`. |
| `src-tauri/target/` | Rust build output. Compiler caches are reproducible, but this folder also contains release bundles and historical `rollback/` copies: do not delete it wholesale. |
| `src-tauri/gen/` | Generated Tauri schemas. Leave tool-managed. |
| `.git/` | Repository history and branch metadata. Never manually clean. |
| `.github/` | Automated build/release workflows. Keep. |
| `.worktrees/` | Linked Git checkouts. `today-first-planning` contains an unmerged commit (`8aee543`); preserve until reviewed. Use Git worktree commands for removal. |
| `.env`, `backend/env.yaml` | Private local configuration. Keep locally and out of Git. |
| `.env.example`, `.gitignore`, `backend/.dockerignore`, `backend/.gcloudignore` | Shared configuration templates and inclusion/exclusion rules. Keep. |
| `mobile/.metadata`, nested `.gitignore` files | Flutter project metadata and generated-file exclusions. Keep. |
| `.DS_Store`, `__pycache__/`, empty `.cursor/` | Finder metadata, Python bytecode, or an unused editor directory; safe to remove. May regenerate. |

## Script map

| Script | Used for |
| --- | --- |
| `scripts/tauri-build.js` | `npm run build` desktop packaging wrapper. |
| `scripts/run-tests.cjs` | `npm test` suite runner. |
| `scripts/seed-demo.js` | `npm run seed-demo`; modifies demo task data, so it is not a cleanup tool. |
| `scripts/record-demos.cjs` | Reproducible README demonstrations; see `demo/README.md`. |
| `scripts/prepare-update-release.cjs` | Release workflow updater manifest preparation. |
| `scripts/validate-update-manifest.cjs` | Release workflow manifest validation. |
| `scripts/validate-release-assets.cjs` | Release workflow uploaded-asset verification. |
| `backend/deploy.sh` | Cloud backend deployment. |

`.cjs` means CommonJS JavaScript; `.js`, `.py`, and `.sh` identify JavaScript, Python, and shell scripts. Numbered files in `docs/plans/` are linked project history, not temporary scripts.

On 2026-10-29, cleanup removed only Rust compiler-cache subdirectories (`build`, `deps`, `incremental`, `.fingerprint` under debug/release), backend Python bytecode, selected Finder metadata and the empty `.cursor/`. Native executables, release bundles, rollback copies, dependencies, private configuration, task data and all linked checkout contents were preserved. The next native build must regenerate its compiler caches and will take longer.

The independent-app layout is documented here rather than in a parallel layout guide. Shared identity/data/quota cutover is tracked in [17](plans/17-diane-shared-apps.md) and [17-1](plans/17-1-canonical-sync.md). Standalone UI remains unchanged.
