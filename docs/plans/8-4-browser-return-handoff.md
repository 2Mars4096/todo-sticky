# 8-4: Browser return after account confirmation

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Return the user from browser confirmation to the existing Android/macOS app and complete the protected sign-in handoff.

## Tasks
- [x] Verify recent browser confirmations and inspect both native clients.
- [x] Add a token-free, fixed native return link and visible browser fallback.
- [x] Register macOS/Android callbacks that focus the existing app without changing navigation or identity.
- [x] Test browser success/failure/fallback, native URL handling and Android foreground polling.
- [x] Deploy the browser change, reinstall macOS safely and deliver the updated signed APK.

## Findings and decisions
- Recent `/v1/auth/complete` requests return 200; one subsequent exchange also returns 200. Current clients have no return-link registration and browser completion only instructs manual switching.
- `todo-sticky://account-return` only wakes the app. It carries no session, token or verifier and never signs a user in by itself. Existing proof-bound exchange and explicit sync consent remain authoritative.
- Advertise native return support only from updated Android/macOS clients. Older clients keep manual-return instructions; no arbitrary return URLs are accepted.

## Verification and delivery
- TypeScript, all 16 Node suites (including browser confirmation/failure/blocked-launch/legacy cases), 36 Rust tests, Flutter analysis/all 45 tests, and 14 backend tests pass.
- Android emulator verifies implicit browsable return keeps the same process and Account screen after opening an external browser. The foreground-polling test verifies the one-time exchange waits until resume. No real account or notebook is used.
- Mac app rebuilt and installed; Launch Services registration and an actual `open todo-sticky://account-return` bring the same process to the foreground. Strict signature/bundle hashes pass. All 56 task files/native settings unchanged. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-account-return-install-20261029-232217`.
- Final web revision `sticky-todo-sync-00008-mr2`: deployed sign-in JS/HTML match local tested files; health 200, unauthenticated sync 401. Return action stays hidden until successful confirmation.
- Deliver Android 2.1.15+4 / versionCode 2004 at `release/todo-sticky.apk`, 19.36 MB, same release key. SHA-256 `64588e776a1e7567b29d1992dd00da61667f0cb5ec7f0486e50d5b8c2f4286b4`. Original notebook preserved during emulator update.
- Start a fresh sign-in after updating: already-open older browser tabs have no native-return flag. Real Google popup confirmation on the user’s two devices remains a user acceptance step; native return is verified independently and never authenticates by itself.
