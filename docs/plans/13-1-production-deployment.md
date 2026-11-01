# 13-1: Goal Planning Production Deployment

**Parent:** [13-goal-planning-and-mobile-drag](13-goal-planning-and-mobile-drag.md)
**Status:** completed
**Goal:** Deploy the compatible backend and deliver verified production Mac and Android builds using the existing configuration and signing key.

## Tasks
- [x] Verify incoming source, local credentials/signing availability and regression checks.
- [x] Deploy the backend and verify live schema-2 capability and authentication boundaries.
- [x] Build/install Mac with a backup, signature verification and data-preservation checks.
- [x] Build the production Android package with the original key; verify package, version and update compatibility.
- [x] Record delivery evidence and update parent tracking.

## Decisions
- User explicitly requests deployment and rebuilding after pulling ba07999.
- Preserve existing Cloud Run environment/IAM and use the dedicated Sticky Todo project/service in Singapore. Prior revision: sticky-todo-sync-00011-jbv.
- The local original Android key is available. Build production 2.1.15+9 (2009), not the separately signed preview package. Preserve the existing production APK before replacement.
- Local checks pass: 19 backend tests, 20 Node suites, TypeScript, Flutter formatting/analyzer and 86 Flutter tests. No live user notes are needed for verification.


## Delivery Evidence
- Cloud Run revision `sticky-todo-sync-00012-z9w` serves 100% of traffic. Public config verifies `goalPlanning:true`, payload schemas `[1,2]`; health passes and anonymous/invalid-token sync requests remain rejected. Environment, service account, memory/CPU, timeout, concurrency and scaling limits match the prior service. Sign-in JavaScript matches source. No user records were accessed for verification.
- Mac: optimized build and all 40 native tests pass; production paragraph/editing browser check passes at 340/460/1000px. Installed exact signed bundle at `/Applications/Sticky Todo.app`, launched, and all 56 task files/native settings remain unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-goal-schema-install-20261101-052603`.
- Android: original-key production package `io.github.twomars4096.sticky_todo`, 2.1.15+9 / versionCode 2009. Delivery: `release/todo-sticky.apk`, 19,622,447 bytes (19.62 MB), SHA-256 `de5233b8ee9d7f4af68d10220b07c17c89477c5e6a0ad92c9385c4466fb7b387`. V2 signature and 16 KB alignment pass; certificate SHA-256 remains `1940ced63b4e966de106a204f6a1e37a49559d9bc140f70bd1e27dad547d5aca`.
- Dedicated emulator update from versionCode 2007 succeeds and launches. Its synthetic notebook remains byte-identical, with tasks/goals preserved. No physical phone or actual account sign-in was needed for this verification.
- Machine-readable service, build-source hashes, APK and Mac reports live under ignored `output/goal-planning-delivery/`. Previous production APK preserved there. No release tag or public installer publication.
