# 8-2: Google Cloud account-sync deployment

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** completed
**Goal:** Deploy an independent Firebase/Cloud Run sync service using the dedicated todo-sticky billing account.

## Tasks
- [x] Inspect user-review deployment patterns and billing association without modifying its services.
- [x] Create `sticky-todo-20261028` and enable Firebase APIs.
- [x] Attach dedicated billing account `015B3A-85967C-6290E9` (Google display name `todo-sticky`); billing is enabled.
- [x] Add Firebase, Web app, Google sign-in and Firestore deny-all direct client rules.
- [x] Configure handoff TTL; `stickyLoginSessions.expiresAt` is ACTIVE.
- [x] Deploy Singapore backend with dedicated least-privilege runtime identity.
- [x] Verify live public configuration, authentication boundaries and synthetic account sync (27 checks).
- [x] Document the service URL and desktop/Android Google sign-in steps; real user sign-in and sync enablement remain explicit under parent plan 8.

## Decisions
- 2026-10-29: User supplied a new open billing account named `todo-sticky`; resume the previously authorized deployment with that account, leaving user-review and Drive billing untouched.
- 2026-10-28: User deferred cloud deployment until the billing-project quota is increased. Local desktop installation and Android delivery are complete. No quota request submission is claimed; resume by checking billing capacity, then finish the remaining deployment tasks.
- User explicitly authorized a new project, billing linkage, deployment and Google accounts on 2026-10-28.
- Use Singapore (`asia-southeast1`), matching user-review’s current regional deployment.
- Keep user-review resources and user data unchanged. No actual notes upload before explicit account opt-in.

## Verified resources
- Project number `507920948662`; Firebase Web app `1:507920948662:web:91dd1025f99bb80103b517`. Google provider enabled and OAuth client present; support address is the authenticated project owner.
- Firestore `(default)` is Native/Standard in `asia-southeast1`, free tier. Rule release `cloud.firestore` uses ruleset `755e27eb-2b29-41d2-a56b-68e44bd90b8d`, denying all direct clients. No user notes uploaded.
- Billing enabled on 2026-10-29. Primary origin: `https://sticky-todo-sync-507920948662.asia-southeast1.run.app`. Public application routes and all 27 live synthetic checks pass.

## Deployment verification — 2026-10-29
- Final revision `sticky-todo-sync-00006-tfl` serves 100% of traffic. Locked backend dependencies and all 14 local backend tests pass.
- 27 live checks pass: public health/config, anonymous/invalid-token rejection, pending/proof-bound/single-use handoff and runtime IAM signing, real Firebase custom-token exchange, authenticated writes, idempotency, conflicts, account isolation, goals, pagination, payload restrictions, tombstones and denied direct Firestore access.
- Synthetic handoffs were seeded administratively for disposable users; this does not claim a real Google browser login. Temporary account allowance was removed, both disposable users and all their records/handoffs deleted, and owner-only access reverified. No real notes read or uploaded.
- `/healthz` alone was intercepted by Google’s frontend; `/v1/health` and application routes work. The diagnostic Taiwan service was removed. Firebase Hosting retains a rewrite to the primary Singapore service.
- Local diagnostic report: `output/account-sync/live-verification.json` (ignored). Existing installed apps can connect by entering the canonical URL; no rebuild is required.
