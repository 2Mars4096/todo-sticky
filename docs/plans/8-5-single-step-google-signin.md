# 8-5: Complete Google sign-in without a second confirmation

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Finish the protected app handoff immediately after the user chooses a Google account, matching the working reference flows.

## Tasks
- [x] Compare user-review and current Dear Diane authentication source.
- [x] Reproduce the extra post-Google confirmation in a real isolated browser.
- [x] Remove the extra click, preserve explicit Google selection and sync opt-in, and handle retries/cancellation clearly.
- [x] Verify the full page sequence and deploy the hosted fix without requiring another app reinstall.

## Findings
- user-review `dashboard/auth.js:mountGoogleButton` saves the session and calls `afterSignIn` immediately after `signInWithPopup` resolves.
- Current Dear Diane Android `CompanionFirebaseAuth.kt` uses Credential Manager followed by Firebase `signInWithCredential`; its success callback immediately completes the app operation. Its Mac flow uses phone-approved pairing, not this browser flow.
- Todo instead stops after `signInWithPopup`, changes the button to `Connect this account`, and waits for another click before sending `/v1/auth/complete`. The previous native-return fix intentionally retained that gate, so its tests did not cover the user's expected single-click flow.
- Retain the user's initial Continue with Google action, forced account chooser, verified backend identity, proof-bound handoff and separate explicit sync opt-in. No sign-in starts on page load or from a cached browser session.

## Browser evidence
- Before: one Continue with Google click with synthetic Google success leaves `Connect this account` visible and sends zero completion requests.
- After: the same click sends exactly one completion request, hides the finished sign-in button and renders completion/return state.
- A new fragment in the reused tab previously retained the old page state; a hash-change reload now starts a fresh request and submits its new session/challenge. No tokens enter URLs.
- Real isolated Chrome exercises the rendered page, with Google identity and the handoff endpoint mocked; this is not a claim of signing into the user’s real account. Node coverage adds cancellation, retry without repeating Google selection, rejected-account reselection, duplicate-click suppression and cleanup that cannot block return.

## Delivery
- Deployed revision `sticky-todo-sync-00009-zz6`. Live JS/HTML match tested source and are served with `Cache-Control: no-store`; anonymous sync remains 401.
- All 16 Node suites pass; targeted coverage additionally verifies same-tab reset. The production-hosted page also completes after one click in isolated Chrome with synthetic Google/backend responses. Browser evidence: `output/playwright/account-single-step.png`. No real identity, credentials, sync state or user notes changed.
- No native app rebuild is needed. Existing pending browser tabs retain loaded JavaScript, so cancel pending sign-in, close those tabs and start a fresh app sign-in once. The updated page handles future reused-tab requests.
