# 23. Dockit transfer review

**Status** — in progress

**Goal** — Preserve the existing Dockit clients and verify proposal editing and assignment separately on each platform.

## Tasks

- [x] Retain the Mac Markdown notebook, phone app-private notebook and Shiprite plugin workflows.
- [x] Review the new browser notebook, phone and web workspace assignment clients, iPhone project and Firebase Hosting configuration.
- [x] Check assignment identity across TypeScript and Dart. Guard outbound notebook data against an account mismatch and protect browser task edits against stale writes.
- [ ] Verify the browser UI can create and reopen a proposal with steps and assign it in a signed-in editor workspace.
- [ ] Build with Flutter 3.47.8 and install on an iPhone and an Android device. On each, verify offline edits, sign-in, assignment retry, task return links and notebook preservation.
- [ ] Verify server-side membership and assignee authorization, assignment receipts, workspace quota attribution and hosted sign-in against a matching service release.

## Verification on November 20

| Client | Build checks | Workflow checks |
| --- | --- | --- |
| Web | Strict TypeScript and Vite production build passed. | A synthetic notebook test kept a newer synced task after stale writes. Membership pagination and the assignment path and body passed. Browser launch was unavailable, so rendered editing, reload and signed-in dispatch await acceptance. |
| iPhone | Swift delegates type-checked against the iPhoneOS SDK and the cached Flutter framework. The project, plists, XML and Podfile parsed. Asset compilation could not finish without a simulator runtime. A signed app and device install remain open. | A Dart fixture checked the proposal, nested step, recipient and deterministic assignment ID shared with web. The picker, custom scheme and sign-in await device testing. HTTPS Universal Links are pending. |
| Android | The manifest parsed. Gradle could not start its file-lock socket in the review environment. An APK for this revision remains open. | The shared Dart assignment fixture passed. Installed editing, app-link verification, authenticated assignment and upgrade continuity await a device run. |
| Mac | The native Mac debug executable and shared frontend compiled. All 45 Rust library tests passed. | Existing task, sync, project and integration regressions ran with fixtures. Installed capture, account handoff and bundle upgrade await a separate acceptance run. |

The local Flutter SDK is 3.41.9 with Dart 3.11.5. The assignment fixture used the repository's cached phone dependencies. Static analysis of the isolated compatibility copy reported zero errors. Its widget-test attempt used compatibility adjustments for that SDK. The test runner could not bind its loopback socket.

## Decisions

Each workspace assignment sends the explicitly selected task and steps. The retry identity includes the issuing account, workspace, task date and ID, and recipient. Review permission failures and edited-task retries with the matching backend before release. Review browser goals, focus state and project journals for multi-tab editing before claiming concurrent editing support for those stores.

The Firebase project remains `dear-diane-202610`. Hosting configuration selects the Dockit site and serves the Vite output. Domain association files and service-side CORS and sign-in configuration require separate verification. The existing package IDs, technical service names, auth scopes, native schemes, record namespaces and notebook filenames retain their previous meaning.
