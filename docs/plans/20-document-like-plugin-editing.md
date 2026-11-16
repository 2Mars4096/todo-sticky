# 20: Document-like plugin editing

**Status:** completed
**Goal:** Make embedded task and step text directly editable with predictable cancellation and stable controls.

## Tasks
- [x] Review existing editor behavior and document/task editor references.
- [x] Open task and step text with one click, preserving the pointed character where browser caret APIs are available.
- [x] Preserve drag-selection for copying and keyboard Enter/Space entry.
- [x] Add visible Save/Cancel; keep blur inside the editor from saving before Cancel.
- [x] Retain selected-task controls during editing, paragraph newlines, IME handling and empty-text protection.
- [x] Run plugin gate and real-browser save/cancel and narrow/wide layout checks.

## Decisions
- Use Notion as a reference for direct text editing and Todoist for keyboard task access; this is a feature-specific design judgment, not an overall product ranking.
- Keep existing plain-text task schema and revision-guarded persistence. Enter inserts a newline; Cmd/Ctrl+Enter saves; Escape cancels. Leaving the editor commits through the existing save path.
- Essential action labels and accessible field names stay visible/available; no explanatory panel or new editor library.
- Historical steps remain read-only. This pass changes embedded task/step editing, not standalone apps, rich text or collaborative cursors.

## Validation
- All 56 tests in 10 suites, strict types, build, generated-module render and package checks pass. Existing stale revision/save-failure tests remain passing.
- Synthetic browser fixture exercises real one-click editing, Save/Cancel and six-paragraph drafts at 360/800px; no horizontal overflow. Screenshots visually reviewed in `output/playwright/doc-edit/`.
- Fixture uses production source/styles with test SDK adapters; it does not establish installed Diane or live backend acceptance. Package version/install unchanged; coordinated host delivery remains follow-up.

## References
- https://www.notion.com/help/writing-and-editing-basics
- https://www.notion.com/help/keyboard-shortcuts
- https://www.todoist.com/help/todoist/features/use-keyboard-shortcuts-in-todoist-Wyovn2

## Requested Diane installation
- [x] Rebuilt/reinstalled Diane0.1.9 with Todo UI0.1.16, preserving newer shared-document features. All65 product tests, actual-host SDK, production build/budgets and release-pin checks pass; signature/installed ASAR match, backend health passes and all13,461 stored JSON records unchanged. Rollback: `/Applications/.Diane-previous-f9657284-95b5-41ac-ba93-4fd54289f104.app`.
- Integrated product source: `/private/tmp/diane-unified-workspace-20261113/todo-product`; host: sibling `integration`. Release archive and checksum are pinned in the host. Receipt: `output/diane-plugin-install/receipt.json`.
