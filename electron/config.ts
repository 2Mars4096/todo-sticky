import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

export interface Machine {
  name: string
  type: string
  specs?: string
  capabilities?: string[]
}

export interface AppSettings {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom'
  apiBase: string
  apiKey: string
  model: string
  kbPath: string
  machines: Machine[]
}

const DEFAULTS: AppSettings = {
  provider: 'openai',
  apiBase: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  kbPath: '',
  machines: [],
}

export const PROVIDER_DEFAULTS: Record<string, { apiBase: string; model: string }> = {
  openai: { apiBase: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { apiBase: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  gemini: { apiBase: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
  custom: { apiBase: '', model: '' },
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function migrateFromEnv(): AppSettings {
  const apiBase = process.env.VITE_LLM_API_BASE || ''
  const apiKey = process.env.VITE_LLM_API_KEY || ''
  const model = process.env.VITE_LLM_MODEL || ''
  const kbPath = process.env.VITE_KB_PATH || ''

  let machines: Machine[] = []
  try { machines = JSON.parse(process.env.VITE_MACHINES || '[]') } catch { /* ignore */ }

  if (!apiBase && !apiKey) return DEFAULTS

  let provider: AppSettings['provider'] = 'custom'
  if (apiBase.includes('openai.com')) provider = 'openai'
  else if (apiBase.includes('anthropic.com')) provider = 'anthropic'
  else if (apiBase.includes('googleapis.com')) provider = 'gemini'

  return { provider, apiBase, apiKey, model, kbPath, machines }
}

export function loadSettings(): AppSettings {
  const configPath = getConfigPath()

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8')
      return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch { /* corrupted file, fall through */ }
  }

  return migrateFromEnv()
}

export function saveSettings(settings: AppSettings): void {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8')
}

export function hasStoredConfig(): boolean {
  return existsSync(getConfigPath())
}
