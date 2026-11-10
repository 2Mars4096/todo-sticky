# 3: Kimi Moonshot Default Provider

**Status:** completed
**Goal:** Make Moonshot Kimi the default AI provider while keeping other configured providers working.

## Tasks
- [x] 1. Add Moonshot/Kimi as a first-class settings preset.
- [x] 2. Update default app settings and environment examples to use `kimi-k2.6`.
- [x] 3. Send temperature `1.0` for Kimi/Moonshot OpenAI-compatible requests.
- [x] 4. Document the provider-default change.

## Decisions
- Use `https://api.moonshot.ai/v1` as the canonical API base URL.
- Treat Kimi as OpenAI-compatible in the native request layer and only specialize its temperature.

## Notes
- Existing saved desktop settings still take precedence over code defaults and `.env` migration.

## Completed follow-ups

Historical implementation and verification records; the current behavior is described in architecture and README.

<a id="3-1-openrouter-provider-adapter"></a>

## 3-1: OpenRouter Provider Adapter

**Goal:** Let users configure OpenRouter as a first-class AI provider and call any OpenRouter chat model by its model slug.

### Tasks

- [x] 1. Add an OpenRouter settings preset with the canonical API base and Kimi K3 model slug.
- [x] 2. Route OpenRouter through the native OpenAI-compatible adapter with app-attribution headers.
- [x] 3. Recognize OpenRouter during legacy environment migration and preserve Kimi temperature behavior for routed Kimi models.
- [x] 4. Add focused native tests and run frontend/native verification.
- [x] 5. Update user-facing and architecture documentation.

### Decisions

- Use `https://openrouter.ai/api/v1` as the canonical API base URL.
- Use `moonshotai/kimi-k3` as the preset model while keeping the model field editable for any OpenRouter slug.
- Send `HTTP-Referer` and `X-OpenRouter-Title` for Sticky Todo attribution without adding either value to persisted user settings.
- Keep Kimi requests at temperature `1.0`, including OpenRouter slugs such as `moonshotai/kimi-k3` and `~moonshotai/kimi-latest`.

### Notes

- OpenRouter's API is OpenAI-compatible, so this slice extends the existing raw HTTP adapter rather than adding a new SDK dependency.
- The model field remains free-form; the preset suggestions are shortcuts rather than a fixed catalog.
- Verification: `npm run build:frontend` and `cargo test --manifest-path src-tauri/Cargo.toml` (7 passing tests).
- `cargo fmt --check` was unavailable because the installed stable toolchain lacks the optional `rustfmt` component; this is recorded in `docs/bugs.md`.

<a id="3-2-quick-provider-switching"></a>

## 3-2: Quick Provider Switching

**Goal:** Let users switch between configured AI providers from the main action bar without losing provider-specific keys or model choices.

### Tasks

- [x] 1. Persist separate API base, key, and model profiles for each provider while keeping the current active settings contract compatible.
- [x] 2. Centralize provider labels, presets, and profile-switching rules for Settings and the main shell.
- [x] 3. Add a compact, accessible action-bar provider selector with configured/setup states.
- [x] 4. Open Settings on an unconfigured provider and keep the main selector synchronized after saves.
- [x] 5. Add focused profile migration/switching checks and run frontend/native verification.
- [x] 6. Update user-facing and architecture documentation.

### Decisions

- A quick switch activates an already configured provider in one action.
- Selecting an unconfigured provider opens Settings on that provider instead of activating an unusable configuration.
- Store provider profiles inside the existing local settings file; keep the top-level provider fields as the active runtime configuration.
- Show the selector in the bottom action bar beside Settings, where it is available before every AI action without competing with task capture.

### Notes

- The selector changes providers, not individual models. Each provider resumes its last saved model.
- A green status dot means the active provider is ready; an amber dot and `Set up` label identify a provider that still needs configuration.
- Verification: `npm run build:frontend`, `cargo test --manifest-path src-tauri/Cargo.toml` (9 passing tests), and 8 focused TypeScript profile-switch assertions.

- 2026-09-15: Set the installed app’s active OpenRouter model and saved profile to `deepseek/deepseek-v4.1-flash`, retaining the existing key; a minimal API probe returned `OK`.

<a id="3-3-codex-background-provider"></a>

## 3-3: Codex Background Provider

**Goal:** Let Sticky Todo use the user's existing Codex login for background AI features without requiring an OpenAI API key.

### Tasks

- [x] 1. Verify local Codex authentication and non-interactive execution behavior.
- [x] 2. Add Codex to provider profiles and compact quick switching.
- [x] 3. Replace API URL/key fields with executable-path and optional-model controls when Codex is selected.
- [x] 4. Add native CLI discovery, login testing, isolated generation, timeout handling, and actionable errors.
- [x] 5. Route task breakdown, day planning, and album recommendations through the shared Codex adapter.
- [x] 6. Add focused native tests and verify the compact Settings layout.
- [x] 7. Build, reinstall, activate Codex, and verify the installed app.

### Decisions

- Reuse the existing `codex login` session; Sticky Todo does not read, copy, or persist Codex credentials.
- Keep the existing provider-profile schema backward compatible by storing the executable name or path in `apiBase`; `apiKey` stays empty and `model` is optional.
- Auto-detect `codex` from `PATH` plus common Homebrew, local-bin, npm-global, and Volta locations while allowing an explicit path.
- Run every request with a closed stdin, empty temporary working directory, ephemeral session, ignored user configuration and execution rules, read-only sandbox, no approvals, no web search, and a three-minute timeout.
- Use `codex login status` for connection tests so checking setup does not consume a generation request.

### Notes

- The installed Codex CLI reports an active ChatGPT login, and an isolated live probe returned the requested sentinel response.
- Compact 460px visual QA confirms the Codex-specific Settings state and action-bar label fit the existing working-note layout.
- Verification: `npm run build:frontend` and 20 passing native library tests.
- Rebuilt and installed version 2.0.4 at `/Applications/Sticky Todo.app`; the signed bundle launches with `todo-sticky` as its main executable.
- Activated the Codex profile with its default model, preserved the prior Moonshot profile, and confirmed the installed app is running while `codex login status` reports `Logged in using ChatGPT`.
- Rollback copies are retained at `/private/tmp/Sticky Todo.previous-before-codex-provider.app` and `/private/tmp/sticky-todo-config-before-codex-provider.json`; the configuration backup is owner-readable only.

<a id="3-4-diane-credential-fallback"></a>

## 3-4: Diane credential fallback

**Goal:** Read matching Diane credentials first, then use Todo's own credentials without modifying either source.

### Tasks
- [x] Inspect both apps' existing provider settings and environment handling.
- [x] Read Diane's paths-only discovery file, with legacy graphs marker fallback.
- [x] Resolve matching standard-provider keys natively for each request; keep models and fallback keys local.
- [x] Add a default-on preference, available-source feedback, test-connection support and quick-switch configured state.
- [x] Test missing/corrupt paths, provider/endpoint isolation and source preservation; compile frontend/native changes.
- [ ] Verify the newly installed apps together after installation.

### Decisions
- Latest user direction replaces a shared Keychain store/cloud login with Diane-first lookup and Todo fallback.
- No Keychain access, copied credentials, changed .env files, background Diane process, or cross-device sync.
- Supported shared sources: OpenRouter, OpenAI, Moonshot; other/custom providers retain Todo configuration.
- A missing, unreadable or invalid Diane source falls back to Todo. API authentication failures do not retry with another account.

- Final verification: 24 native tests pass, including advertised-path precedence and key refresh without restart. Settings checkbox styling follows existing compact form controls.
