import { useState, useEffect } from 'react'
import type { AppSettings, Provider } from '../types'
import { api } from '../api'
import {
  PROVIDER_ORDER,
  PROVIDER_PRESETS,
  settingsForProvider,
  syncActiveProviderProfile,
} from '../llmProviders'

const EMPTY_SETTINGS: AppSettings = {
  provider: 'moonshot',
  apiBase: 'https://api.moonshot.ai/v1',
  apiKey: '',
  model: 'kimi-k2.6',
  providerProfiles: {},
  kbPath: '',
  machines: [],
}

interface Props {
  onClose: () => void
  onSaved?: (settings: AppSettings) => void
  firstRun?: boolean
  initialProvider?: Provider
}

export function SettingsPanel({ onClose, onSaved, firstRun, initialProvider }: Props) {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    api.getSettings().then(s => {
      if (!s) return
      setSettings(initialProvider ? settingsForProvider(s, initialProvider) : s)
    })
  }, [initialProvider])

  const update = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setTestResult(null)
  }

  const handleProviderChange = (provider: Provider) => {
    setSettings(prev => settingsForProvider(prev, provider))
    setDirty(true)
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const settingsToSave = syncActiveProviderProfile(settings)
      await api.saveSettings(settingsToSave)
      setSettings(settingsToSave)
      setDirty(false)
      onSaved?.(settingsToSave)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testConnection({
        provider: settings.provider,
        apiBase: settings.apiBase,
        apiKey: settings.apiKey,
        model: settings.model,
      })
      setTestResult(result)
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSelectFolder = async () => {
    const folder = await api.selectFolder()
    if (folder) update({ kbPath: folder })
  }

  const addMachine = () => {
    update({
      machines: [...settings.machines, { name: '', type: 'server', specs: '', capabilities: [] }],
    })
  }

  const updateMachine = (i: number, patch: Partial<AppSettings['machines'][0]>) => {
    const machines = [...settings.machines]
    machines[i] = { ...machines[i], ...patch }
    update({ machines })
  }

  const removeMachine = (i: number) => {
    update({ machines: settings.machines.filter((_, idx) => idx !== i) })
  }

  const preset = PROVIDER_PRESETS[settings.provider] || PROVIDER_PRESETS.custom
  const isOpenRouter = settings.provider === 'openrouter'
    || settings.apiBase.toLowerCase().includes('openrouter.ai')

  return (
    <div className="settings-overlay" onClick={firstRun ? undefined : onClose}>
      <div className="settings-panel settings-wide" onClick={e => e.stopPropagation()}>

        <h3>{firstRun ? 'Welcome to Sticky Todo' : 'Settings'}</h3>
        {firstRun && (
          <p className="settings-subtitle">
            AI is optional. Start without a key, or connect a provider for task breakdown and day planning.
          </p>
        )}

        <div className="settings-scroll">
          {/* --- AI Provider --- */}
          <div className="settings-section">
            <div className="section-title">AI Provider</div>

            <label>Provider</label>
            <select
              value={settings.provider}
              onChange={e => handleProviderChange(e.target.value as Provider)}
            >
              {PROVIDER_ORDER.map(provider => (
                <option key={provider} value={provider}>
                  {PROVIDER_PRESETS[provider].label}
                </option>
              ))}
            </select>

            <label>API Base URL</label>
            <input
              value={settings.apiBase}
              onChange={e => update({ apiBase: e.target.value })}
              placeholder={preset.apiBase || 'https://api.example.com/v1'}
            />

            <label>Model</label>
            <input
              value={settings.model}
              onChange={e => update({ model: e.target.value })}
              placeholder={preset.model || 'model-name'}
              list="model-suggestions"
            />
            {preset.models.length > 0 && (
              <datalist id="model-suggestions">
                {preset.models.map(m => <option key={m} value={m} />)}
              </datalist>
            )}
            <p className="hint">
              {isOpenRouter
                ? <>Use any OpenRouter model slug, such as <code>moonshotai/kimi-k3</code>. AI features only run after you add an API key.</>
                : <>Default model is <code>{preset.model || 'custom'}</code>. AI features only run after you add an API key.</>}
            </p>

            <label>API Key</label>
            <div className="input-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={e => update({ apiKey: e.target.value })}
                placeholder={isOpenRouter ? 'sk-or-v1-...' : 'sk-...'}
              />
              <button
                className="input-row-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? '◉' : '○'}
              </button>
            </div>

            <div className="test-row">
              <button
                onClick={handleTest}
                disabled={testing || !settings.apiKey || !settings.apiBase}
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              {testResult && (
                <span className={`test-result ${testResult.ok ? 'ok' : 'fail'}`}>
                  {testResult.ok ? '✓ Connected' : `✗ ${testResult.message}`}
                </span>
              )}
            </div>
          </div>

          {/* --- Knowledge Base --- */}
          <div className="settings-section">
            <div className="section-title">Storage</div>

            <label>Knowledge Base Path</label>
            <div className="input-row">
              <input
                value={settings.kbPath}
                onChange={e => update({ kbPath: e.target.value })}
                placeholder="Default: ~/Documents/Sticky Todo"
              />
              <button className="input-row-btn" onClick={handleSelectFolder} title="Browse…" aria-label="Choose storage folder">
                📁
              </button>
            </div>
            <p className="hint">
              Leave this blank to use <code>~/Documents/Sticky Todo</code>. Tasks are stored in <code>content/to-do/</code> inside that folder.
            </p>
          </div>

          {/* --- Machines --- */}
          <div className="settings-section">
            <div className="section-title">Machines</div>
            <p className="hint">
              Define machines for AI scheduling — servers, workstations, etc.
            </p>

            {settings.machines.map((m, i) => (
              <div key={i} className="machine-card">
                <div className="machine-card-row">
                  <input
                    value={m.name}
                    onChange={e => updateMachine(i, { name: e.target.value })}
                    placeholder="Name"
                    className="machine-name"
                  />
                  <select
                    value={m.type}
                    onChange={e => updateMachine(i, { type: e.target.value })}
                    className="machine-type-sel"
                  >
                    <option value="server">Server</option>
                    <option value="workstation">Workstation</option>
                  </select>
                  <button className="machine-rm" onClick={() => removeMachine(i)} title="Remove" aria-label={`Remove machine ${m.name || i + 1}`}>✕</button>
                </div>
                <input
                  value={m.specs || ''}
                  onChange={e => updateMachine(i, { specs: e.target.value })}
                  placeholder="Specs — e.g. A100 80GB, 256GB RAM"
                />
                <input
                  value={(m.capabilities || []).join(', ')}
                  onChange={e =>
                    updateMachine(i, {
                      capabilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Capabilities — comma-separated"
                />
              </div>
            ))}

            <button className="add-machine" onClick={addMachine}>+ Add Machine</button>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="btn-row">
          {!firstRun && <button onClick={onClose}>Cancel</button>}
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : firstRun ? settings.apiKey ? 'Save & Start' : 'Start without AI' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
