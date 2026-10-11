# 3-4: Diane credential fallback

**Parent:** [3-kimi-moonshot-default-provider](3-kimi-moonshot-default-provider.md)
**Status:** completed
**Goal:** Read matching Diane credentials first, then use Todo's own credentials without modifying either source.

## Tasks
- [x] Inspect both apps' existing provider settings and environment handling.
- [x] Read Diane's paths-only discovery file, with legacy graphs marker fallback.
- [x] Resolve matching standard-provider keys natively for each request; keep models and fallback keys local.
- [x] Add a default-on preference, available-source feedback, test-connection support and quick-switch configured state.
- [x] Test missing/corrupt paths, provider/endpoint isolation and source preservation; compile frontend/native changes.
- [ ] Verify the newly installed apps together after installation.

## Decisions
- Latest user direction replaces a shared Keychain store/cloud login with Diane-first lookup and Todo fallback.
- No Keychain access, copied credentials, changed .env files, background Diane process, or cross-device sync.
- Supported shared sources: OpenRouter, OpenAI, Moonshot; other/custom providers retain Todo configuration.
- A missing, unreadable or invalid Diane source falls back to Todo. API authentication failures do not retry with another account.

- Final verification: 24 native tests pass, including advertised-path precedence and key refresh without restart. Settings checkbox styling follows existing compact form controls.
