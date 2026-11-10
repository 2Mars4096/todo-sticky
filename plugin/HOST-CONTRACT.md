# Host API: diane-plugin/1 (staged)

The host resolves `@diane/plugin-sdk` modules: client, records, http, host-context, input-context, panel-context, input, desktop and workflow. The UI package uses host React; no separate agent runtime or login is embedded. CSS accompanies the module. Backend compatibility release requires the shared owner-scoped record service and Universal Cell gateway. Permissions in the manifest request access; they do not grant access.

The source move and host consumption are pending approval/integration. Standalone apps continue to use their existing backend until verified migration and cutover.

Preparation refresh: POST `/api/sticky-todo/preparations/refresh` with `{scope: pluginScope()}` returns `{queued,scope}`. The scope is the opaque current connection binding, not a filesystem path. Refresh may prepare canonical unfinished tasks but must not dispatch execution. The server rejects a mismatched scope and deduplicates unchanged content. Missing/failed refresh is quiet in the overview; the selected-task host control owns actionable status.
