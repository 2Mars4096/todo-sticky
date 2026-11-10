# Host API: diane-plugin/1

The host resolves `@diane/plugin-sdk` modules: client, records, http, host-context, input-context, panel-context, input, desktop and workflow. The UI package uses host React; no separate agent runtime or login is embedded. CSS accompanies the module. Backend compatibility release requires the shared owner-scoped record service and Universal Cell gateway. Permissions in the manifest request access; they do not grant access.

The product source is maintained in this repository's `plugin/` directory. `RECOVERY.json` records the initial recovery from the shipped packages; new candidates require an explicit pinned-host integration. Standalone apps retain their existing backend and release path.

Task execution uses only the existing projects, preparation, workflows, run, review, open and stop APIs. A run creates a session without automatically navigating away. A review is bound to its exact result version. The backend's inline prior-attempt records may supply read-only session links; they are not a complete history listing. Manual project choices remain device-local until the host supplies a shared binding API. Accepting a result is distinct from integrating Git changes; this package declares no Merge operation.

Preparation refresh: POST `/api/sticky-todo/preparations/refresh` with `{scope: pluginScope()}` returns `{queued,scope}`. The scope is the opaque current connection binding, not a filesystem path. Refresh may prepare canonical unfinished tasks but must not dispatch execution. The server rejects a mismatched scope and deduplicates unchanged content. Missing/failed refresh is quiet in the overview; the selected-task host control owns actionable status.
