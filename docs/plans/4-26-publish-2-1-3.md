# 4-26: Publish 2.1.3

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Publish automatic update indicators and hover-revealed step entry through the signed updater.

## Tasks
- [x] 1. Review changes and bump the package and lockfile to 2.1.3.
- [x] 2. Run release checks, commit, and push the version tag.
- [x] 3. Monitor signed platform builds and automatic publication.
- [x] 4. Verify the public updater feed, download URLs, and Mac signature.

## Decisions
- User explicitly authorized publication on 2026-10-05.
- Include the new automatic-check regression suite in release CI.
- Preserve manual installation/restart and the existing updater trust key.

## Delivery
- Release source `ac72328`, tag `v2.1.3`.
- Frontend build, six release regression suites, and diff hygiene pass.
- [Run 37292860917](https://github.com/2Mars4096/todo-sticky/actions/runs/37292860917) passed Windows, Linux, universal macOS, and automatic publication.
- [v2.1.3](https://github.com/2Mars4096/todo-sticky/releases/tag/v2.1.3) is published with release notes covering automatic checks, Settings/action dots, and hover step entry.
- Public latest.json reports 2.1.3; all updater URLs match uploaded assets and return HTTP 200. Public Mac bytes match the uploaded SHA-256 digest and verify against the app trust key; tampered bytes are rejected.
