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
