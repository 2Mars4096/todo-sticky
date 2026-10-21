# 4-41-1: Finish Ghost Suggestions

**Parent:** [4-41-finish-promises](4-41-finish-promises.md)
**Status:** completed
**Goal:** Make defining enough easier with reversible grey suggestions and minimal date controls.

## Tasks
- [x] Replace blank Done when editor with What would be enough and contextual AI ghost text.
- [x] Tab accepts; typing overrides; clearing restores the cached suggestion; Escape cancels. Never persist unaccepted suggestions or overwrite typed text when AI responds.
- [x] Keep one editor open and save dates without a separate Save/Cancel row; scope/stop actions appear only for overdue commitments or review.
- [x] Verify type checking, native tests and isolated interaction checks.
- [x] Set and verify the installed OpenRouter profile to deepseek/deepseek-v4.1-flash.
- [x] Build and reinstall locally with a rollback backup.

## Decisions
- Request one short suggestion when the user opens the finish editor, using the configured provider; ordinary task capture never waits for AI.
- Cache only within the task component; keep suggestions outside persisted task metadata until accepted.
- Provider errors leave manual editing available. No Use this/Edit buttons.

## Verification
- Full TypeScript checking, 27 native tests and both finish-workflow browser suites pass. Verified async suggestions cannot overwrite typing, Tab acceptance, clear/reappear, Escape, explicit deletion and date auto-save at 350px.
- OpenRouter unversioned `deepseek/deepseek-v4.1-flash` verified against its model page and a successful short synthetic API request. Active and saved OpenRouter profiles now match.
- Reinstalled and launched the optimized bundle; exact hashes and strict signature pass, all 56 task-file hashes unchanged.
- Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-ghost-e9ml2_rf`. No public release or merge into main.
