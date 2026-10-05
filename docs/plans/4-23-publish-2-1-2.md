# 4-23: Publish 2.1.2

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Deliver the integrated step-input background through the signed in-app updater.

## Tasks
- [x] 1. Review the transparent-background change and bump the package/lockfile to 2.1.2.
- [x] 2. Run release checks, commit, and push the release tag.
- [x] 3. Monitor all platform builds and publication.
- [x] 4. Verify public update availability and the signed Mac package.

## Decisions
- User explicitly requested publication on 2026-10-05.
- Keep the existing input border and focus behavior; remove only its lighter fill.
- Use the existing signing key and repaired draft-asset validation workflow.

## Delivery
- Release source `39790c0`, tag `v2.1.2`.
- Frontend build, five release regression scripts, and diff hygiene pass.
- [Run 37266020439](https://github.com/2Mars4096/todo-sticky/actions/runs/37266020439) passed macOS, Windows, Linux, and automatic publication.
- Public latest.json reports 2.1.2; all updater URLs match the published release and return HTTP 200.
- Public Mac updater archive matches the uploaded SHA-256 digest and verifies against the existing app trust key; a tampered archive is rejected.
