# 11: Batched Source Publication

**Status:** completed
**Goal:** Commit the reviewed account/workflow changes in coherent batches and push main without local artifacts or credentials.

## Tasks
- [x] Inspect changes, remote baseline and artifact exclusions.
- [x] Verify desktop, backend and Android checks and scan candidate source files for credentials/large artifacts.
- [x] Commit account/native transport, desktop workflows, Android parity, Goals material and shared documentation separately.
- [x] Push main and verify remote HEAD.

## Decisions
- The user explicitly requests committing in batches and pushing. Work starts on main, equal to origin/main at a36c560.
- Exclude local browser sessions and all output/delivery verification, including synthetic notebook copies and APKs. Preserve them on disk; source, tests and concise delivery records are versioned.
- Local checks: 19 Node suites, TypeScript, 15 backend tests, Flutter formatting/analyzer and 60 Flutter tests pass. No release tag or backend deployment is requested.

## Publication Receipt

- `97eae7c0` — fix: finish account sign-in and restore native app handoff
- `cc81923d` — feat: add desktop workflow review and recoverable sync controls
- `b58a0090` — feat: bring workflow tools and reliable planning to Android
- `af40c0db` — fix: apply selected note material to Goals and Routines
- `bf57d4e6` — docs: record reviewed releases and exclude local review artifacts

All five source batches were pushed to origin/main; remote HEAD verified as `bf57d4e6` before this documentation-only receipt. Working tree was clean, and the committed tree contains no output, browser sessions, APKs or keystores.
