# 4-50: Planning Diagnostics And Provider Responses

**Parent:** [4-ready-shell-and-ux-path-pass](4-ready-shell-and-ux-path-pass.md)
**Status:** completed
**Goal:** Make failed AI planning actionable while preserving the existing preview and task-safety contract.

## Tasks

- [x] Trace generation from ScheduleView through the native provider and validation.
- [x] Preserve native string errors instead of replacing them with a settings warning.
- [x] Clarify that testing a settings draft does not save it; prevent editing that draft during its test.
- [x] Reject empty/truncated responses, extract final text after reasoning blocks, and report invalid JSON clearly.
- [x] Bound HTTP requests and avoid putting Gemini keys in error URLs.
- [x] Make connection-test previews safe for multibyte text.
- [x] Run frontend, browser and native regression checks.

## Decisions

- Keep the selected provider, endpoint and model unchanged. Do not auto-fallback to a different paid provider.
- A successful connection probe establishes basic reachability/login, not validity of a longer structured plan.
- Generation remains a proposal. Failed requests never write tasks; validation, stale-context guards, Apply/Discard and Undo remain intact.
- No live user credentials or task archive were available in this checkout. The exact upstream failure behind the installed app's generic warning cannot be inferred from that warning alone.

## Notes

- Tauri serializes a Rust `Err(String)` as a string rejection. ScheduleView previously only displayed `Error.message`, so every native failure appeared as an AI settings problem.
- Settings tests the unsaved form; `llm_schedule` reloads persisted settings. The test result now explicitly requests Save when the form is dirty.
- Anthropic/Gemini replies may contain reasoning before answer text. Reading block zero could turn a successful request into an empty reply.
- HTTP requests have a 15-second connect and 180-second overall timeout. No retries incur unrequested extra calls.
- Validation: existing 12 Node suites plus the new AI-error regression, TypeScript, production frontend build, `check-plan-errors.cjs` against production assets, and all 30 Rust library tests pass. Browser/native tests use synthetic inputs; no live AI request or installed desktop update was performed.
