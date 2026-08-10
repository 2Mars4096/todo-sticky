# 3-2: Quick Provider Switching

**Parent:** [3-kimi-moonshot-default-provider](3-kimi-moonshot-default-provider.md)
**Status:** completed
**Goal:** Let users switch between configured AI providers from the main action bar without losing provider-specific keys or model choices.

## Tasks

- [x] 1. Persist separate API base, key, and model profiles for each provider while keeping the current active settings contract compatible.
- [x] 2. Centralize provider labels, presets, and profile-switching rules for Settings and the main shell.
- [x] 3. Add a compact, accessible action-bar provider selector with configured/setup states.
- [x] 4. Open Settings on an unconfigured provider and keep the main selector synchronized after saves.
- [x] 5. Add focused profile migration/switching checks and run frontend/native verification.
- [x] 6. Update user-facing and architecture documentation.

## Decisions

- A quick switch activates an already configured provider in one action.
- Selecting an unconfigured provider opens Settings on that provider instead of activating an unusable configuration.
- Store provider profiles inside the existing local settings file; keep the top-level provider fields as the active runtime configuration.
- Show the selector in the bottom action bar beside Settings, where it is available before every AI action without competing with task capture.

## Notes

- The selector changes providers, not individual models. Each provider resumes its last saved model.
- A green status dot means the active provider is ready; an amber dot and `Set up` label identify a provider that still needs configuration.
- Verification: `npm run build:frontend`, `cargo test --manifest-path src-tauri/Cargo.toml` (9 passing tests), and 8 focused TypeScript profile-switch assertions.
