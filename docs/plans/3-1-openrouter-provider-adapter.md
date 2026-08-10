# 3-1: OpenRouter Provider Adapter

**Parent:** [3-kimi-moonshot-default-provider](3-kimi-moonshot-default-provider.md)
**Status:** completed
**Goal:** Let users configure OpenRouter as a first-class AI provider and call any OpenRouter chat model by its model slug.

## Tasks

- [x] 1. Add an OpenRouter settings preset with the canonical API base and Kimi K3 model slug.
- [x] 2. Route OpenRouter through the native OpenAI-compatible adapter with app-attribution headers.
- [x] 3. Recognize OpenRouter during legacy environment migration and preserve Kimi temperature behavior for routed Kimi models.
- [x] 4. Add focused native tests and run frontend/native verification.
- [x] 5. Update user-facing and architecture documentation.

## Decisions

- Use `https://openrouter.ai/api/v1` as the canonical API base URL.
- Use `moonshotai/kimi-k3` as the preset model while keeping the model field editable for any OpenRouter slug.
- Send `HTTP-Referer` and `X-OpenRouter-Title` for Sticky Todo attribution without adding either value to persisted user settings.
- Keep Kimi requests at temperature `1.0`, including OpenRouter slugs such as `moonshotai/kimi-k3` and `~moonshotai/kimi-latest`.

## Notes

- OpenRouter's API is OpenAI-compatible, so this slice extends the existing raw HTTP adapter rather than adding a new SDK dependency.
- The model field remains free-form; the preset suggestions are shortcuts rather than a fixed catalog.
- Verification: `npm run build:frontend` and `cargo test --manifest-path src-tauri/Cargo.toml` (7 passing tests).
- `cargo fmt --check` was unavailable because the installed stable toolchain lacks the optional `rustfmt` component; this is recorded in `docs/bugs.md`.
