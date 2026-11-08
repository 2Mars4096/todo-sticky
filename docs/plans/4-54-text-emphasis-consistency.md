# 4-54: Consistent Text Emphasis

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make ordinary task/goal text consistently plain on Mac and phone, with deliberate emphasis for headings and actions.

## Tasks
- [x] Audit task rows, goal lists, search results and project descriptions on both clients.
- [x] Remove visual-line and length-threshold bolding; use regular content and semibold headings.
- [x] Avoid presenting long project descriptions as oversized bold titles.
- [x] Review compact/large-text screenshots and existing workflows.
- [x] Clarify that saved recovery backups are read-only originals, not pending choices.
- [x] Reinstall the final Mac build and rebuild the signed APK with sync/footer fixes included.

## Decisions
- Task/step/goal content and metadata use weight 400 regardless of length, line wrap, selection or completion. Indentation, size and completion marks retain hierarchy.
- Section/screen headings use weight 600. Primary actions and meaningful review prompts retain emphasis.
- Project text remains one unchanged regular-content field. No first-line, length or inferred-title heuristic is used. Shared CSS/body styles and Flutter body/list-tile themes carry the policy instead of per-row exceptions.

## Evidence
- Mac `::first-line` bolding changed emphasis with window width; roots also used 550 while steps were regular. Phone short tasks used 600 and paragraphs 400. Phone project screens displayed the entire goal description at headline size/700.
- Removed the paragraph-class/160-character heuristic and project first-line/title-length heuristic entirely. CSS has shared content/heading weights; Flutter shares resolved content/emphasis styles across body, list tiles, headings and primary actions. No text data is rewritten.
- WebKit/Chrome checks at 340/460px confirm regular task/project content and semibold page headings. Existing project-editing/workflow checks pass across compact/wide/enlarged layouts; phone notes/goals/project previews use real fonts and were visually reviewed.
- Saved-backup review now labels snapshots as Mac/Cloud before sync, explains their recovery purpose, and has no choice/apply controls. Pending choices use the separate item-review view.

## Delivery
- Final Mac build installed and launched with exact bundle/signature verification. All 56 task-folder files and native config remain unchanged. App/task/native/WebKit rollback backup: `/Users/lizhi/.codex-accounts/app/.tmp/sticky-todo-before-general-text-rules-install-20261108-160451`.
- Original-key Android 2.1.16+18 / 2018 delivered at `release/todo-sticky.apk`, 19,884,735 bytes (19.88 MB). Package/version, v2 signature, 16 KB alignment, ZIP integrity and prefilled service URL verify. SHA-256 `d2bf1f435bd508f8bc9658f362161e8c6a21fe7b00c52b3bd7e999b8901f3b05`.
- 26 Node suites, TypeScript, 41 native tests and 124 Flutter tests/analysis pass, plus real-font phone preview and WebKit/Chrome typography/recovery checks. Reports/source hashes are retained under ignored `output/general-text-rules-delivery/`; screenshots are under `output/playwright/text-emphasis/`. No phone installation or new public release was requested for this follow-up.
