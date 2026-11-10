# Todo plugin for Diane

This directory owns the embedded Todo interface and its compatibility backend. Diane consumes a versioned package and supplies account, record, project and execution services through `@diane/plugin-sdk/*`. The standalone React 18/Tauri app and phone client keep their existing build and data paths; the plugin has its own React 19 development environment.

## Task execution

The selected task uses one compact project/action row. **Run** explicitly starts work and keeps Todo open. **Open** returns to the saved Diane session. **Review** presents the versioned result and the existing accept/request-changes actions. Session links remain available for completed tasks and previous attempts returned by the host.

Automatic preparation is separate from execution. A manual project correction wins over a late suggestion and remains account/task scoped. The current host stores that correction on this device; a shared cross-device binding and a complete paginated execution history need a host API extension. Ordinary task editing and completion do not depend on these controls.

There is no Merge button in this release. The current host does not isolate the whole Todo run or expose a reviewed Git-merge receipt. **Accept & complete** accepts a result and completes the task; it does not merge code. Runtime permissions and interactive agent approvals remain in Diane.

## Development

Use Node 22 or later. From the repository root:

```bash
npm --prefix plugin ci
npm --prefix plugin run check
```

The combined gate checks strict source types, behavior tests, the production bundle, a render of the generated module without a global React object, declared external imports, and package contents. It uses a test-only SDK adapter; host runtime implementations are never bundled into the plugin.

An existing Diane checkout can verify the actual SDK exports:

```bash
npm --prefix plugin run check:host -- /path/to/dear-diane/editor
```

After checks pass, build the UI archive from `plugin/` with `npm pack --ignore-scripts`. Update Diane's pinned archive, lockfile and release checksum receipt in a separate integration commit. A package build is not an installed-app or live-backend acceptance result.

## Source recovery

The published repository did not contain the `plugin/` directory referenced by Diane's releases. The initial UI source was recovered from the verified `@diane-app/todo-plugin@0.1.6` archive and the backend modules from `diane-todo-plugin@0.1.4`. Their recorded producer commits were unavailable on GitHub. `RECOVERY.json` retains the exact artifact checksums and member hashes; it is a historical baseline, not a claim that edited files still have those hashes. `src/SOURCE.json` retains the earlier port's source attribution, with the original machine-local path removed.

The original MIT notice remains in `src/LICENSE.todo-sticky`. See `backend/README.md` for the unchanged compatibility modules and their independent wheel build. Source recovery does not recreate the unavailable producer Git history or deploy either application.
