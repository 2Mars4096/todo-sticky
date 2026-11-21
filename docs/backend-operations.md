# Dockit backend operations

## Ownership and endpoints

Dockit owns the Python compatibility wheel in `plugin/backend/`. Shiprite runs the shared API and worker in `dear-diane-202610`, Singapore. The broker is `https://dear-diane-202610-api.web.app`. Dockit uses the `todo` connected-app ID and the `/api/plugins/todo/` endpoints for owner-scoped tasks. The public web client uses Firebase Hosting target `dockit` on site `pipedreams-dockit`. The original standalone sync service source remains in `backend/` for self-hosting and legacy protocol tests. [Sync and owner-mapping contract](plans/17-1-canonical-sync.md)

## Inspect

Use discovery and service metadata to inspect the shared host without reading notebook records.

```sh
curl -fsS 'https://dear-diane-202610-api.web.app/api/connected-apps/config?appId=todo'
gcloud run services list --project=dear-diane-202610 --region=asia-southeast1 --format='table(metadata.name,status.url)'
gcloud run services describe diane-api --project=dear-diane-202610 --region=asia-southeast1 --format='table(status.traffic.revisionName,status.traffic.percent)'
gcloud run services describe diane-worker --project=dear-diane-202610 --region=asia-southeast1 --format='table(status.traffic.revisionName,status.traffic.percent)'
```

## Release and rollback

Run `npm test` at the root, `backend/.venv/bin/python -m unittest discover -s backend/tests` for standalone sync, and `plugin/backend/tests` against the Shiprite host dependencies. Build the plugin wheel using the [package instructions](../plugin/backend/README.md). Shiprite owns pinning, staged deployment and rollback of compatible API/worker images. Record both prior digests, traffic and Hosting release before promotion. Verify synthetic task sync, authorization and revision conflicts before passing traffic. Restore the previous compatible pair and Hosting release when rolling back. Keep owner mappings, notebook revisions and the saved service selection.

The web client builds with `npm run build:frontend`. Its Firebase release from the repository root targets `--project dear-diane-202610 --only hosting:dockit`. Independent installs use `backend/deploy.sh PROJECT_ID REGION` with their own configuration.

## Costs and retirement

The suite infrastructure owner tracks Cloud Run, Firestore, retained images and shared provider usage. Review billing reports by project, service and date. The former personal sync project `sticky-todo-20261028` (507920948662) was already `DELETE_REQUESTED` on November 22, 2026. Its historical `sticky-todo-sync` service used `/v1/health`; older installations may still carry its origin. Preserve their local notebooks and sync baselines when investigating an account handoff. [Original deployments and protocol](account-sync.md)
