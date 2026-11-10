# Todo compatibility backend

The Python modules under `src/diane/plugins/` were recovered byte-for-byte from the pinned `diane_todo_plugin-0.1.4` wheel. `../RECOVERY.json` records its checksum, historical producer reference and every module checksum. The producer commit could not be retrieved from GitHub; this recovery does not recreate that Git history.

These modules extend the Diane host package. They do not run as a standalone API and intentionally rely on the host's existing account, storage and runtime services. No backend behavior or version was changed in this revision.

Build from this directory with `python -m pip wheel . --no-deps --no-build-isolation --wheel-dir dist`. Installing a rebuilt wheel into Diane is a separate release step. Generated wheel archives and build metadata stay out of Git.
