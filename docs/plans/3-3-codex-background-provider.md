# 3-3: Codex Background Provider

**Parent:** [3-kimi-moonshot-default-provider](3-kimi-moonshot-default-provider.md)
**Status:** completed
**Goal:** Let Sticky Todo use the user's existing Codex login for background AI features without requiring an OpenAI API key.

## Tasks

- [x] 1. Verify local Codex authentication and non-interactive execution behavior.
- [x] 2. Add Codex to provider profiles and compact quick switching.
- [x] 3. Replace API URL/key fields with executable-path and optional-model controls when Codex is selected.
- [x] 4. Add native CLI discovery, login testing, isolated generation, timeout handling, and actionable errors.
- [x] 5. Route task breakdown, day planning, and album recommendations through the shared Codex adapter.
- [x] 6. Add focused native tests and verify the compact Settings layout.
- [x] 7. Build, reinstall, activate Codex, and verify the installed app.

## Decisions

- Reuse the existing `codex login` session; Sticky Todo does not read, copy, or persist Codex credentials.
- Keep the existing provider-profile schema backward compatible by storing the executable name or path in `apiBase`; `apiKey` stays empty and `model` is optional.
- Auto-detect `codex` from `PATH` plus common Homebrew, local-bin, npm-global, and Volta locations while allowing an explicit path.
- Run every request with a closed stdin, empty temporary working directory, ephemeral session, ignored user configuration and execution rules, read-only sandbox, no approvals, no web search, and a three-minute timeout.
- Use `codex login status` for connection tests so checking setup does not consume a generation request.

## Notes

- The installed Codex CLI reports an active ChatGPT login, and an isolated live probe returned the requested sentinel response.
- Compact 460px visual QA confirms the Codex-specific Settings state and action-bar label fit the existing working-note layout.
- Verification: `npm run build:frontend` and 20 passing native library tests.
- Rebuilt and installed version 2.0.4 at `/Applications/Sticky Todo.app`; the signed bundle launches with `todo-sticky` as its main executable.
- Activated the Codex profile with its default model, preserved the prior Moonshot profile, and confirmed the installed app is running while `codex login status` reports `Logged in using ChatGPT`.
- Rollback copies are retained at `/private/tmp/Sticky Todo.previous-before-codex-provider.app` and `/private/tmp/sticky-todo-config-before-codex-provider.json`; the configuration backup is owner-readable only.
