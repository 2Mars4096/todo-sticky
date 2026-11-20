# 23: Dockit transfer naming review

**Status:** completed

**Goal:** Verify current product labels, handoff destinations and distributions against checkpoint `5d6a8ff`.

## Tasks

- [x] Review the transfer diff, native and browser labels, backend responses, current instructions and test expectations.
- [x] Verify that account, storage, package and session identifiers retain their checkpoint values.
- [x] Build the Vite distribution, Shiprite plugin archive and compatibility wheel. Exercise editing, project selection, proposal application and session navigation with fixtures.
- [x] Verify the rebuilt Mac app and its bundled CLI.
- [x] Check phone sources and record Android and iPhone build limits separately.

## Decisions

Use Dockit for the task planner, Shiprite for its execution host and pipedreams for the shared account. Current setup instructions use the labels shown in the clients. Existing filenames, package and record IDs, auth scopes, URL schemes, Firebase origin, historical release names and source attribution retain their original spelling.

## Verification

| Client | Build | Workflow |
| --- | --- | --- |
| Web | Vite production build, plugin archive, TypeScript and production-module rendering passed. | The built frontend generated a plan for a selected machine and saved it as a task step using the synthetic native bridge. The embedded tests exercised proposal review, project choice and opening the returned Shiprite session. Live browser acceptance is pending. |
| Mac | Rebuilt Dockit.app. Ad-hoc app and helper signatures, bundle ID and return scheme passed. | All 45 Rust tests and the bundled CLI/MCP task workflow passed on a disposable notebook. Hardware capture and live Shiprite handoff were not exercised. |
| Android | The installed Flutter 3.41.9 bundles Dart 3.11.5. Dependency resolution requires Flutter 3.47 or newer and Dart 3.13 or newer. | The changed Dart strings parsed with standalone Dart 3.13.5. Phone workflow tests and an updated APK await the project toolchain. |
| iPhone | The transfer checkout has no `phone/ios` runner. | Device workflow acceptance awaits an iOS target. |

The 31 Node suites, 60 embedded-plugin tests, 19 standalone backend tests and 26 host compatibility tests passed. The package archives match their rebuilt sources. No embedded credentials or personal records were found in the reviewed diff.

The standalone backend and compatibility adapter use the existing return, meeting and session protocols. The Dockit sign-in page returns to `todo-sticky://account-return`. The embedded Open action uses the host workspace and returned session and project IDs. Native handoff uses the existing Shiprite loopback API.
