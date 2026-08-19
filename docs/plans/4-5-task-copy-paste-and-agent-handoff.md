# 4-5: Task Copy, Paste, And Agent Handoff

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Let users move an individual task or step through the clipboard and turn it into a ready-to-run agent prompt from the task row.

## Tasks

- [x] 1. Define a portable task checklist format, parser, and execution-prompt template.
- [x] 2. Add native text clipboard read/write support with least-privilege permissions.
- [x] 3. Add direct `Copy` and `Prompt` actions to tasks and subtasks with accessible feedback.
- [x] 4. Add a `Paste` action beside New Task that recreates a task and its steps as unchecked work.
- [x] 5. Verify formatting, parsing, compact layout, frontend/native builds, and the installed app.
- [x] 6. Update product documentation and project tracking.

## Decisions

- Copy one item from its own row; avoid a selection mode until multi-item handoff is explicitly needed.
- Use portable Markdown checklist text for normal copy, including only the selected task's current-day steps.
- Paste resets task and step status to unchecked so duplication never silently creates completed work.
- Generate agent prompts locally from a fixed execution template; exporting a prompt does not call an AI provider.
- Keep clipboard access limited to plain-text read and write commands.

## Notes

- The visible Copy/Paste controls from this slice were later replaced by native focused-field shortcuts in [4-13-native-copy-paste-shortcuts](4-13-native-copy-paste-shortcuts.md); prompt export remains active.
- The row already wraps its action strip at compact widths, so named actions can remain discoverable without squeezing task text.
- Compact Playwright QA at `460x640` showed the old `430px` action-wrap threshold ignored the width consumed by collapsed rails; the structural breakpoint now wraps task actions at `520px`.
- Verification: checklist round-trip and prompt-template smoke checks, `npm run build:frontend`, 13 passing native tests, compact Playwright task/subtask inspection, release app build, signature verification, exact installed-bundle comparison, and an unchanged task-archive checksum after relaunch.
- Repository-wide `tsc --noEmit` still reports only the pre-existing Star Focus renderer/archive-limit errors recorded in `docs/bugs.md`; no new task-handoff type errors appeared.
- Installed rollback: `/private/tmp/sticky-todo-install.JrnmRc/Sticky Todo.app`.
