# Todo compatibility backend

The Python modules under `src/diane/plugins/` were recovered byte-for-byte from the pinned `diane_todo_plugin-0.1.4` wheel. `../RECOVERY.json` records its checksum, historical producer reference and every module checksum. The producer commit could not be retrieved from GitHub; this recovery does not recreate that Git history.

These modules extend the Diane host package. They do not run as a standalone API and intentionally rely on the host's existing account, storage and runtime services. Version 0.1.5 adds `todo_context.py` and adapts AI suggestions to supply bounded, owner-scoped canonical source material to Diane's Universal Cell profiles. Source revisions/task trees are rechecked before delivering a suggestion; usage and execution metadata remain in the existing receipt. Sync modules keep their existing behavior.

Build from this directory with `python -m pip wheel . --no-deps --no-build-isolation --wheel-dir dist`. Installing a rebuilt wheel into Diane is a separate release step. Generated wheel archives and build metadata stay out of Git.

Version0.1.6 adds product-owned `todo_document.py`: lossless source parsing/patching and canonical owner-transaction reconciliation. It requires the paired host filesystem adapter; it never reads arbitrary local paths or dispatches work. Run synthetic tests with `DIANE_HOST_SOURCE=/path/to/diane python -m pytest plugin/backend/tests` from the producer root.
