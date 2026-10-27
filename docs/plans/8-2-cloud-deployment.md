# 8-2: Google Cloud account-sync deployment

**Parent:** [8-google-account-sync](8-google-account-sync.md)
**Status:** in-progress
**Goal:** Deploy an independent Firebase/Cloud Run sync service using the billing account already linked to user-review.

## Tasks
- [x] Inspect user-review deployment patterns and billing association without modifying its services.
- [x] Create `sticky-todo-20261028` and enable Firebase APIs.
- [ ] Attach billing: Google rejects the sixth billed project with a billing-project quota error; user chose to wait for a quota increase.
- [x] Add Firebase, Web app, Google sign-in and Firestore deny-all direct client rules.
- [ ] Configure handoff TTL after billing is available.
- [ ] Deploy backend with dedicated least-privilege runtime identity.
- [ ] Verify live public configuration, authentication boundaries and synthetic account sync.
- [ ] Configure desktop and document Android service URL and Google sign-in steps.

## Decisions
- 2026-10-28: User deferred cloud deployment until the billing-project quota is increased. Local desktop installation and Android delivery are complete. No quota request submission is claimed; resume by checking billing capacity, then finish the remaining deployment tasks.
- User explicitly authorized a new project, billing linkage, deployment and Google accounts on 2026-10-28.
- Use Singapore (`asia-southeast1`), matching user-review’s current regional deployment.
- Keep user-review resources and user data unchanged. No actual notes upload before explicit account opt-in.

## Verified resources
- Project number `507920948662`; Firebase Web app `1:507920948662:web:91dd1025f99bb80103b517`. Google provider enabled and OAuth client present; support address is the authenticated project owner.
- Firestore `(default)` is Native/Standard in `asia-southeast1`, free tier. Rule release `cloud.firestore` uses ruleset `755e27eb-2b29-41d2-a56b-68e44bd90b8d`, denying all direct clients. No user notes uploaded.
- Billing remains disabled; no backend service URL exists yet.
