# 8: Google account and cross-platform sync

**Status:** in-progress
**Goal:** Add optional Google sign-in and recoverable desktop/Android synchronization through the user's Firebase/Google Cloud project.

## Tasks

- [x] Inspect Dear Diane's current backend and phone authentication before reusing assumptions.
- [x] Implement Firebase system-browser sign-in with a proof-bound one-time handoff.
- [x] Add Cloud Run/Firestore per-user records, strict allowlists, revisions, idempotent retries and tombstones.
- [x] Integrate the desktop Account UI, optional enablement, local binding, automatic sync, reviewable conflicts and recovery export.
- [x] Preserve desktop Markdown authority with native content comparison and preimage backup before download application.
- [x] Validate authentication/isolation/schema/conflict behavior, client reconciliation, TypeScript, production build and native tests.
- [x] Merge the Flutter Android app and integrate Account & sync settings, system-browser Google login, secure REST session renewal, owner binding and foreground sync.
- [x] Add phone conflict choices and recovery export using the shared versioned record contract and durable local persistence.
- [x] Complete the integrated Flutter account analyzer, test and APK verification run and record results.
- [ ] Deploy with the user's actual Firebase project/configuration and verify Google login and physical two-device sync.

## Decisions

- Accounts/sync is an opt-in branch and never gates local capture, storage, AI or Diane controls.
- Existing Dear Diane uses configurable bearer-token backend access; no Firebase or Google Cloud account deployment was found at its main revision `2581669`.
- Completed focus history may sync after explicit account opt-in, extending the prior local-only design; active sessions and credentials remain local.
- Conflicts are per date or goals record. Both versions remain reviewable; user choices are saved in exportable recovery history before overwrite.
- Android uses the same proof-bound browser handoff as desktop and Firebase REST custom-token, account lookup and refresh endpoints. The Web app configuration comes from the backend; no `google-services.json`, native Android OAuth client or SHA certificate registration is required for this flow.
- The phone service URL is configured in Settings or an optional `SYNC_SERVER_URL` Dart define. Account tokens use secure storage, and automatic phone synchronization runs while the app is in the foreground.
- The runtime authenticates through ADC and IAM signing, with no service-account key committed. No cloud resources are created by this implementation session.

## Notes

- Setup, protocol, security boundary and acceptance steps: [account-sync.md](../account-sync.md).
- Desktop/backend integrated verification passed: 15 Node suites, 34 Rust tests, 14 Python backend tests, TypeScript/frontend build and the compact Account-panel browser check. Flutter analysis, 44 tests and the ARM64 debug APK build/signature checks pass; phone Account UI is verified at 360 px and 150% text. Live deployment and real Google authentication remain unverified.
- A sandboxed ASGI TestClient stalls in this build environment; the isolated test suite runs successfully with approved local-process escalation.
