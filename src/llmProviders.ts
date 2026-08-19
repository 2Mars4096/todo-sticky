import type { AppSettings, Provider, ProviderProfile } from './types'

interface ProviderPreset {
  label: string
  shortLabel: string
  apiBase: string
  model: string
  models: string[]
}

export const PROVIDER_ORDER: Provider[] = [
  'codex',
  'moonshot',
  'openrouter',
  'openai',
  'anthropic',
  'gemini',
  'custom',
]

export const PROVIDER_PRESETS: Record<Provider, ProviderPreset> = {
  codex: {
    label: 'Codex (ChatGPT login)',
    shortLabel: 'Codex',
    apiBase: 'codex',
    model: '',
    models: [],
  },
  moonshot: {
    label: 'Moonshot (Kimi)',
    shortLabel: 'Kimi',
    apiBase: 'https://api.moonshot.ai/v1',
    model: 'kimi-k2.6',
    models: ['kimi-k2.6', 'kimi-k2.5'],
  },
  openrouter: {
    label: 'OpenRouter',
    shortLabel: 'Router',
    apiBase: 'https://openrouter.ai/api/v1',
    model: 'moonshotai/kimi-k3',
    models: [
      'moonshotai/kimi-k3',
      '~moonshotai/kimi-latest',
      'openrouter/auto',
      'openrouter/free',
    ],
  },
  openai: {
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    shortLabel: 'Claude',
    apiBase: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  },
  gemini: {
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    shortLabel: 'Custom',
    apiBase: '',
    model: '',
    models: [],
  },
}

function activeProfile(settings: AppSettings): ProviderProfile {
  return {
    apiBase: settings.apiBase,
    apiKey: settings.apiKey,
    model: settings.model,
  }
}

export function syncActiveProviderProfile(settings: AppSettings): AppSettings {
  return {
    ...settings,
    providerProfiles: {
      ...(settings.providerProfiles || {}),
      [settings.provider]: activeProfile(settings),
    },
  }
}

export function settingsForProvider(
  settings: AppSettings,
  provider: Provider,
): AppSettings {
  const synced = syncActiveProviderProfile(settings)
  const savedProfile = synced.providerProfiles[provider]
  const preset = PROVIDER_PRESETS[provider]

  return {
    ...synced,
    provider,
    apiBase: savedProfile?.apiBase ?? preset.apiBase,
    apiKey: savedProfile?.apiKey ?? '',
    model: savedProfile?.model ?? preset.model,
  }
}

export function isProviderConfigured(settings: AppSettings, provider: Provider) {
  const synced = syncActiveProviderProfile(settings)
  const profile = synced.providerProfiles[provider]

  if (provider === 'codex') {
    return Boolean(profile?.apiBase.trim())
  }

  return Boolean(
    profile?.apiBase.trim()
    && profile.apiKey.trim()
    && profile.model.trim(),
  )
}
