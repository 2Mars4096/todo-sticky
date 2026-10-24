# Google accounts and cross-platform sync

This feature is on `feature/google-account-sync`. It adds optional Google accounts and synchronization to the Tauri desktop app and the Flutter Android app under `mobile/`. The service must be deployed and configured before live sign-in works; this branch does not contain a deployed service URL or a Firebase project belonging to the user.

## What was reused from Dear Diane

The current `2Mars4096/dear-diane` main revision inspected was `2581669`. Its Android app connects to a configurable backend using a bearer access token and a native phone-settings bridge (`mobile/lib/main.dart`), with an optional WireGuard connection. It does not implement Firebase Google login or provide a confirmed Google Cloud account/sync deployment. This implementation keeps the same separation between a phone client and a remote service, with Firebase handling identity. It does not share Diane's execution credentials or change Diane.

## User flow

1. Open desktop **Settings → Account** or Android **Settings → Account & sync**. Enter the deployed HTTPS Cloud Run service origin and choose **Connect service**. Desktop builds can prefill it with `VITE_SYNC_SERVER_URL`; Android builds use the optional `--dart-define=SYNC_SERVER_URL=https://YOUR_SERVICE_HOST`.
2. **Continue with Google** opens the operating system browser. Pick a Google account, then confirm **Connect this account**. Return to the app within five minutes to finish the handoff. No app deep link is required.
3. Enable desktop **Sync this task folder** or Android **Sync this notebook**. Signing in alone does not upload existing notes. The first link asks for a choice when existing local and cloud versions differ.
4. Both clients sync after edits and on app resume, with a periodic retry while open. **Sync now** provides an explicit retry. Android sync runs while the app is in the foreground; it is not a background delivery service. Desktop additionally retries on its online event.
5. If the same day's data changed on two devices, the Account screen shows previews of both versions. Choose the device or account version. Before applying a choice, the app stores both complete copies in recovery history. Desktop **Export conflict recovery history** downloads JSON; Android **Export conflict recovery copies** opens the native save picker. Desktop pulls also save the previous Markdown file under `.sticky-sync-backups` in the task folder.
6. Pausing sync or signing out keeps local notes available. Sign-out disables sync and clears the app's saved sign-in session. Local data remains bound to its original Firebase project and account; another account cannot upload those notes. Use a separate empty app data profile for a different owner.

Desktop briefly prevents editing while it applies downloaded data and reloads the local view; active focus sessions and unfinished AI/planning operations delay its sync. Android defers sync while a text editor is active and rechecks the current local record immediately before applying a download. Failed local saves block sync on both platforms. Network failures leave local work available, with errors and retry controls in Account settings.

## What synchronizes

| Data | Behavior |
| --- | --- |
| Tasks and nested steps | One record per calendar date, preserving IDs, order, statuses, Outcome, Due and deadline history. Completed tasks remain in the record. |
| Goals and routines | One record containing target and recurring arrays. Routine resets are ordinary changes. |
| Completed focus sessions | One record per mission ID. Separate device completions coexist. Local history pruning does not delete the cloud archive. |
| Active timer, selection and window state | Device-local. |
| AI provider keys, Diane tokens and machine/task-folder paths | Device-local; rejected by the cloud payload allowlist. |
| Paper/glass appearance and provider choices | Device-local. |

Task conflicts are intentionally **per date**, not a claim of automatic task-level merging. Independent edits to two different dates merge without a choice; simultaneous edits within one date require review. Tombstones stay in the cloud so an offline device cannot silently revive deleted data. An empty local date matches a downloaded date tombstone. Missing/unavailable desktop archives stop sync; they are never inferred to be deletions. Android also refuses to sync a notebook whose local load or save has failed.

## Architecture

- Desktop uses Firebase Auth's client session and refresh lifecycle. Firebase's IndexedDB persistence keeps the desktop session; task baselines contain no tokens. Android exchanges the browser handoff through Firebase's REST custom-token endpoint, reads the authenticated user through `accounts:lookup`, and renews ID tokens through the Secure Token endpoint. Its ID/refresh tokens live in the existing `flutter_secure_storage` credential store, separately from notes, sync metadata and recovery exports.
- Google OAuth runs in the system browser, avoiding embedded-WebView login restrictions. The app generates a 256-bit verifier and sends only its SHA-256 challenge in the sign-in URL fragment. The browser verifies Google identity, explicitly confirms the account and creates a five-minute handoff. Only the originating verifier can exchange it, once, for a Firebase custom token. No token is put in the URL or normal access logs.
- Cloud Run verifies Firebase ID tokens, including revocation and verified email, on every data request. It derives user IDs from verified claims. The optional `ALLOWED_EMAILS` setting restricts a personal deployment.
- Firestore stores `stickyUsers/{uid}/records/{key}`. Transactions enforce expected revisions and immediately repeated mutation IDs return the original result. A stale write returns HTTP 409 with the current record; it never overwrites silently.
- Each client persists its last acknowledged payload/revision per server and account, with the desktop task folder also part of the scope. Three-way comparison distinguishes local-only edits, cloud-only edits and conflicts. Pending mutation IDs survive retry. Baselines advance after a successful server acknowledgement or durable local application. Server timestamps are descriptive; device clocks do not decide winners.
- Markdown remains the desktop task store. Downloads compare the exact original task tree, back up the existing weekly file, then write through the current native file layer. Concurrent local changes cause a retry instead of replacement.
- Android keeps its app-private notebook and sync metadata in the existing atomic JSON store. The controller consumes `StickyStore.syncRecords()` and `applySyncRecord()`, so capture and editing remain available independently of account initialization or service availability.
- Direct Firestore client access is denied by `backend/firestore.rules`; the Cloud Run service uses its dedicated service account. Cloud Run's public HTTP entry is necessary for Firebase-authenticated clients; the application's token verification protects data endpoints. Only health, public Firebase config, the login page and proof-bound exchange are public.

## Provision your existing Google/Firebase project

Use the Firebase project you want to own this app's data. The following are setup commands, not actions already performed by this branch.

1. In Firebase Authentication, enable **Google** as a sign-in provider and choose a support email. Register a **Web app** and copy its public configuration. Create the default **Firestore Native mode** database in the intended region. This implementation uses the same Web app configuration for the browser handoff, desktop client and Android REST adapter; all values must refer to the same Firebase project.
2. Enable the required Google services and create a dedicated runtime identity:

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com iamcredentials.googleapis.com --project YOUR_PROJECT
gcloud iam service-accounts create sticky-sync --project YOUR_PROJECT
gcloud projects add-iam-policy-binding YOUR_PROJECT --member serviceAccount:sticky-sync@YOUR_PROJECT.iam.gserviceaccount.com --role roles/datastore.user
gcloud projects add-iam-policy-binding YOUR_PROJECT --member serviceAccount:sticky-sync@YOUR_PROJECT.iam.gserviceaccount.com --role roles/firebaseauth.viewer
gcloud iam service-accounts add-iam-policy-binding sticky-sync@YOUR_PROJECT.iam.gserviceaccount.com --project YOUR_PROJECT --member serviceAccount:sticky-sync@YOUR_PROJECT.iam.gserviceaccount.com --role roles/iam.serviceAccountTokenCreator
```

The deployer's Cloud Build/source-deployment permissions are separate from this runtime identity; use Google's [source-deployment instructions](https://cloud.google.com/run/docs/deploying-source-code) for your project. The runtime uses Application Default Credentials, so no downloaded service-account key is needed.

3. Copy `backend/env.example.yaml` to `backend/env.yaml`. Fill the project ID, Firebase web config and service-account ID. For a personal service set `ALLOWED_EMAILS` to your Google email. `backend/env.yaml` is ignored by Git.
4. Deploy from the repository root:

```sh
bash backend/deploy.sh YOUR_PROJECT YOUR_REGION
```

5. Add the deployed Cloud Run hostname (without `https://`) under **Firebase Authentication → Settings → Authorized domains**. Keep the project's Firebase auth domain in that list and keep `FIREBASE_AUTH_DOMAIN` set to the Web app's Firebase auth domain, usually `YOUR_PROJECT.firebaseapp.com`. The Cloud Run service does not implement Firebase Hosting's `/__/auth/handler`; its hostname must not simply replace that auth domain. If the Web OAuth consent configuration limits access to test users, include the intended Google account there.
6. Check the Firebase Web API key's restrictions. Its API allowlist must include **Identity Toolkit API** (`identitytoolkit.googleapis.com`) and **Token Service API** (`securetoken.googleapis.com`). Application restrictions must support the hosted browser and direct desktop/phone requests: HTTP-referrer-only or Android-package-only restrictions do not fit this shared Web/REST configuration. Keep this key scoped to the required Firebase APIs, separate from AI-provider keys. Firebase authentication and backend authorization protect user data; the public key identifies the project.
7. Install the deny-by-default Firestore rules from `backend/firestore.rules` using your Firebase project's normal deployment workflow. If the same database serves other apps, merge the two Sticky Todo collection rules into the existing rules instead of replacing unrelated permissions.
8. Enable automatic expiry of login handoffs:

```sh
gcloud firestore fields ttls update expiresAt --collection-group stickyLoginSessions --database '(default)' --enable-ttl --project YOUR_PROJECT
```

The code enforces the five-minute expiry independently of Firestore's later TTL cleanup. Do not enable TTL on task records or tombstones.

9. Enter the service origin in Account settings on both devices. Sign in, enable sync, create a test task and verify it on the other device. Test offline edits, restart, token renewal after expiry, a deliberate same-day conflict and recovery export, sign-out and a rejected different account before relying on live sync.

### Android setup

This browser handoff does **not** require `google-services.json`, FlutterFire setup, an Android Firebase app registration, SHA certificate fingerprints or a native Google OAuth client. Google login runs on the hosted Web page; the phone reads the Firebase public Web configuration from `/v1/config` and uses the documented Firebase Auth REST endpoints after the handoff. Native Google sign-in would require its own Android setup if introduced later.

Enter the HTTPS service URL in **Settings → Account & sync**, or prefill a build from `mobile/`:

```sh
flutter build apk --debug --dart-define=SYNC_SERVER_URL=https://YOUR_SERVICE_HOST
```

The URL is optional at build time. Without it, the app starts as a local notebook and the service can be configured later. Android's release manifest blocks cleartext HTTP; use an HTTPS service that the phone can reach. No Firebase token or service-account credential belongs in a Dart define or APK source. Android packaging, signing and the rest of the phone feature setup are described in [mobile/README.md](../mobile/README.md).

## API contract, version 1

All data calls use `Authorization: Bearer <Firebase ID token>`. A Firebase custom token must first be exchanged by Firebase Auth; it is not a valid bearer token for the data API.

| Request | Response |
| --- | --- |
| `GET /v1/config` | `{firebase:{apiKey,authDomain,projectId,appId},schemaVersion:1}`; public client config only. |
| `POST /v1/auth/complete` | Google ID token plus `{sessionId,challenge}`; creates the one-time handoff. |
| `POST /v1/auth/exchange` | `{sessionId,verifier}` → 202 `{pending:true}`, or `{customToken}`; consumed/expired links return 410. |
| `GET /v1/sync?after=<key>&pageSize=200` | `{records:[...],nextCursor:string|null,schemaVersion:1}`. Continue until cursor is null. |
| `PUT /v1/sync/{key}` | `{expectedRevision,mutationId,deleted,payload}` → saved record; 409 `{error:'conflict',current:record|null}`. |

A record has `{key,revision,deleted,payload,updatedAt,mutationId}`. Keys are `day:YYYY-MM-DD`, `goals` or `focus:<missionId>`. Day payloads are `{date,tasks:[{id,text,status,subtasks,finish?}]}`. IDs are 1–128 ASCII letters/digits/underscore/hyphen and unique per day; both platforms retain stable IDs. Deletes have `deleted:true,payload:null`. Unknown fields are rejected. Each record is limited to 600 KB and 2,000 tasks/goals; a task tree is at most 12 levels deep. HTTP bodies are limited to 700 KB while streaming.

## Verification and remaining live acceptance

```sh
npm ci
npx tsc --noEmit
npm test
node tests/cloud-sync.cjs
npm run build:frontend
cargo test --manifest-path src-tauri/Cargo.toml --lib
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

The API tests exercise real FastAPI routes with an injected verifier/store: authentication rejection, user isolation, revision conflicts, idempotent retries, tombstone protection, pagination, schema/secret rejection, payload limits, email allowlisting and the proof-bound login route. Native tests verify stale downloads cannot overwrite local changes and backup creation. They do not claim live Google login or a live Firestore transaction round-trip. A production Firebase project, authorized domain, runtime IAM and the physical two-device acceptance above are still required.

The Flutter account controller and screen are implemented, including secure session restoration/renewal, account binding, foreground reconciliation, conflict resolution and recovery export. The combined phone app passes 44 tests, including 20 account/protocol regressions and two Account-screen checks at 360 px with 150% text. Analysis is clean, the ARM64 debug APK builds, and its v2 signature verifies. The auth tests use the documented Google response shapes and exercise cancellation, secure-store write races, numeric project-number refresh responses, offline retries, account isolation, malformed downloads and conflict recovery. From `mobile/`, the verification commands are:

```sh
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Neither mocked transport tests nor a successful APK build replace the live Firebase sign-in, refresh and physical two-device acceptance. No Google Cloud resources have been deployed or Firebase console settings changed during this implementation.

### References

- [Firebase Google authentication](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase custom authentication tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Verify Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) and [check revocation](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Custom-token REST response contract](https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithCustomToken)
- [Firebase API keys and required API restrictions](https://firebase.google.com/docs/projects/api-keys)
- [Cloud Run service identity and ADC](https://cloud.google.com/run/docs/securing/service-identity)
- [Firestore TTL policies](https://firebase.google.com/docs/firestore/ttl)
