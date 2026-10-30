# 12: Paragraph-Friendly Tasks

**Status:** completed
**Goal:** Make existing task/subtask capture, editing and storage paragraph-friendly on Mac and Android, review minimal copy, and reinstall verified builds.

## Tasks
- [x] 1. Inspect desktop/phone capture, display and Markdown round trips.
- [x] 2. Add growing multiline desktop inputs and phone newline capture; retain task hierarchy.
- [x] 3. Preserve paragraph text in both Markdown codecs.
- [x] 4. Verify paragraph persistence, editing, layout and self-explanatory UI on both clients.
- [x] 5. Back up and reinstall Mac; deliver signed Android update (no device attached).

## Decisions
- Keep existing task/subtask model, dates, focus and sync contract.
- Enter inserts a paragraph line; desktop Cmd/Ctrl+Enter and explicit Add/Save commit. Existing edit blur-save and Escape cancellation remain.
- Optional escaped `sticky-todo:text` JSON metadata preserves multiline text, including checklist-like prose, with a first-line Markdown preview. Both clients decode it; old single-line records remain unchanged.
- Keep accessible names, actionable errors and consequential warnings. Remove redundant capture/suggestion/outcome copy within task flows.

## Review and verification
- Browser: paragraph capture/edit/save/step creation, preserved whitespace and no horizontal overflow at 340/460/1000px; existing task interaction suite passes.
- Phone: full suite passes 64 tests including optional visual captures; paragraph create/edit/reload, Markdown nesting, sync acceptance and keyboard + 150% text checks pass. Analyzer clean. Screenshots: `output/playwright/paragraphs/`.
- Native: 37 tests cover Markdown/API round trips; 19 Node suites and 16 backend tests pass. Backend revision `sticky-todo-sync-00011-jbv` serves all traffic and health responds successfully.
- Deployment uses the existing authenticated `user-review` cloud configuration. No account permissions or record schemas changed; live user sync was not exercised.
- No physical Android device is attached. Deliver the signed update APK; physical-device installation remains unavailable.

## Delivery
- Mac: final signed bundle installed at `/Applications/Sticky Todo.app` and running; source/installed hashes match. All 56 task files and native settings unchanged after launch. Installed CLI creates/extracts multiline task and nested-step text correctly in a disposable archive. Backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-paragraph-install-20261031-014548`.
- Android: `release/todo-sticky.apk`, version 2.1.15+8 / code 2008, 19,491,291 bytes. SHA-256 `c650093154dc819ccc5d071636393c3d4a25e8de68e89e620d32fea2d05bb1e4`; signature matches the previous release certificate. Physical phone installation requires a connected device or opening this APK on the phone.
- Receipts: `output/paragraph-delivery/{macos-verification,apk-verification}.json`. Previous APK preserved alongside them. No public app release or task-data migration.
