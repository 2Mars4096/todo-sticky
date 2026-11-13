# 21: KB Markdown document editor

**Status:** completed
**Goal:** Edit actual KB Todo documents with the shared notebook engine while preserving canonical task execution identities.

## Tasks
- [x] Confirm product ownership and existing standalone Markdown/sync format.
- [x] Implement byte-preserving document parsing/patching and task-span identities.
- [x] Reuse canonical sync identity projection with revision-guarded explicit reconciliation.
- [x] Connect configured KB document read/write through a narrow revision-checked host capability.
- [x] Add whole-document editor with task-linked actions/status and optional review adapter.
- [x] Reconcile initial linkage, stale edits, duplicate/missing IDs and interrupted sync safely.
- [x] Validate synthetic Markdown/record round trips, source composition and package gates.

## Decisions
- Product logic belongs in todo-sticky/plugin, host file access/editor implementation stays in Diane.
- Existing format is content/to-do/<week>/index.md with dated sections and sticky-todo:id/finish/goal/text metadata.
- Preserve unrelated Markdown and front matter; do not regenerate documents from task arrays.
- Original Markdown ID is not necessarily canonical record ID. Existing todo_sync projection preserves source ID/date/namespace; reuse it rather than passing original IDs directly into compat/save_day.
- Markdown controls editable content/order/status; records retain execution/session/results. Deletion does not authorize cancellation.
- Missing/colliding identities require preview or explicit conflict; never title-only merge.
- Use only synthetic KB fixtures in implementation/tests; do not mutate user's KB or deploy/install.

## Integration
- Producer checkout: /private/tmp/diane-unified-workspace-20261113/todo-product.
- Host adapter checkout: /private/tmp/diane-unified-workspace-20261113/todo-editor.
- Shared notebook/review source is in the editor-review branch; consume through its exported contracts during aggregation.
- Plan20 per-row editor is a starting point, not completion of this document workflow.

## Bounded implementation contract
- Parse full source with exact line endings, fenced-code/frontmatter exclusion and dated task spans. ID assignment is a preview; copied IDs block until explicitly removed/reassigned.
- Hosted document reconciliation reuses CanonicalTodoSync projection/apply in one owner transaction, preserving cross-date canonical IDs and unrelated records.
- Local host uses only explicit DIANE_TODO_KB_ROOT, fixed content/to-do/<week>/index.md paths and note_files revision/history guards. No project inference.
- File-first writes retain a durable local journal before replacement. Record conflict leaves an explicit pending recovery state; retry never blindly replays changed text.
- Shared notebook and review are injected components; no notebook implementation copied. Existing task execution controls attach to canonical IDs.

## Verification and bounded delivery
- 59 product UI tests; 36 product backend tests (including real host temp-file coordinator and canonical service); strict product types/build/dist/package/host-SDK checks.
- Host: 24 notebook/adapter tests, two source-composition tests using actual shared MarkdownDocumentEditor and DocumentChangeReview, strict types and Vite build. Browser visual acceptance is not claimed; build reports an existing-style manual chunk cycle requiring combined bundle review.
- UI0.1.11 and backend0.1.6 are new local artifacts under release/todo-document. No vendor archives, real KB data, installation, deployment, main merge or push touched.
- Origins: product f7e7a1f5dcac9b0433476a6982cfc30367a879de; host 516013e4; shared editor-review e13aac874afc234d4f8a0f312b586319766c283c (read only).
- Explicit bounded behavior: existing weekly files only; 500 KB document and canonical 180-change transaction bound; duplicate IDs/repeated dates and cross-document moves require manual identity review. No automatic title merge or background write loop. Canonical pull patches existing task text/status/finish/goal fields; Markdown owns date/order/hierarchy. New canonical rows are not silently inserted into a chosen document.
- File replacement and record commit are not one transaction. The local journal survives failure; Retry uses the same exact content/token. Review again archives the pending operation and requires a new explicit preview. External-editor races retain the existing note_files cooperative-lock/final-digest limitation.
- Aggregation gates: pin new UI and backend artifacts, wire shared editor/review exports via host injection, configure explicit KB root and owner connection scope, run combined synthetic visual/bundle checks. Legacy standalone whole-date serialization has not been converted to this document API; do not claim end-to-end prose preservation for concurrent writes by that older client.
