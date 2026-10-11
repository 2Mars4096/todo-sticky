import { useState, useEffect } from 'react'
import type { AppSettings, Provider } from '../types'
import { api } from '../api'
import { dianeRequest, type DianeProjects } from '../diane'
import { AppUpdates } from './AppUpdates'
import { updateIsBusy } from '../appUpdates'
import type { useAppUpdates } from '../hooks/useAppUpdates'
import {
  PROVIDER_ORDER,
  PROVIDER_PRESETS,
  isProviderConfigured,
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
  appUpdates: ReturnType<typeof useAppUpdates>
  updateBlockedReason?: string
  onClose: () => void
  onSaved?: (settings: AppSettings) => void
  firstRun?: boolean
  initialProvider?: Provider
}

export function SettingsPanel({ onClose, onSaved, firstRun, initialProvider, appUpdates, updateBlockedReason }: Props) {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS)
  const [dianeDestination, setDianeDestination] = useState('')
  const [dianeAvailable, setDianeAvailable] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [dirty, setDirty] = useState(false)
  const updating = updateIsBusy(appUpdates.state.phase)

  useEffect(() => {
    api.getSettings().then(s => {
      if (!s) return
      setSettings(initialProvider ? settingsForProvider(s, initialProvider) : s)
    })
  }, [initialProvider])

  useEffect(() => {
    let disposed = false
    const refresh = () => api.dianeCredentialStatus(settings.provider, settings.apiBase)
      .then(available => { if (!disposed) setDianeAvailable(available) })
      .catch(() => { if (!disposed) setDianeAvailable(false) })
    setDianeAvailable(false)
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { disposed = true; window.removeEventListener('focus', refresh) }
  }, [settings.provider, settings.apiBase])

  useEffect(() => {
    if (!settings.connectDiane) return
    let disposed = false
    setDianeDestination('Checking Dear Diane on this computer…')
    void dianeRequest<DianeProjects>('projects').then(data => {
      const project = data.projects.find(item => item.id === data.active_project_id)
      if (!disposed) setDianeDestination(project?.root ? `Project: ${project.name} · ${project.root}` : 'Connected. Select a project folder in Dear Diane.')
    }).catch(() => { if (!disposed) setDianeDestination('Not connected. Open Dear Diane on this computer.') })
    return () => { disposed = true }
  }, [settings.connectDiane])

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
    } catch {
      setTestResult({ ok: false, message: "Could not save settings. Try again." })
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
        preferDianeCredentials: settings.preferDianeCredentials !== false,
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
  const isCodex = settings.provider === 'codex'
  const isOpenRouter = settings.provider === 'openrouter'
    || settings.apiBase.toLowerCase().includes('openrouter.ai')

  return (
    <div className="settings-overlay" onClick={firstRun || updating ? undefined : onClose}>
      <div className="settings-panel settings-wide" onClick={e => e.stopPropagation()}>

        <h3>{firstRun ? 'Welcome to Sticky Todo' : 'Settings'}</h3>
        {firstRun && (
          <p className="settings-subtitle">
            AI is optional. Use your Codex login, connect an API provider, or start without AI.
          </p>
        )}

        <div className="settings-scroll">
          <div className="settings-section">
            <div className="section-title">Diane</div>
            <label className="diane-credentials-choice"><input type="checkbox" checked={settings.connectDiane === true} disabled={saving || updating} onChange={e => update({ connectDiane: e.target.checked })} /> Connect to Dear Diane on this computer</label>
            <p className="hint">{settings.connectDiane ? dianeDestination : 'Off. Diane task controls are hidden.'}</p>
          </div>
          {!firstRun && (
            <AppUpdates
              currentVersion={appUpdates.currentVersion}
              state={appUpdates.state}
              blockedReason={dirty ? 'Save your settings before updating.' : saving || testing ? 'Wait for the current operation to finish.' : updateBlockedReason}
              onCheck={appUpdates.check}
              onInstall={appUpdates.install}
              onRestart={appUpdates.restart}
            />
          )}
          <fieldset className="settings-fields" disabled={updating}>
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

            <label>{isCodex ? 'Codex Executable' : 'API Base URL'}</label>
            <input
              value={settings.apiBase}
              onChange={e => update({ apiBase: e.target.value })}
              placeholder={isCodex ? 'codex or full executable path' : preset.apiBase || 'https://api.example.com/v1'}
            />

            <label>{isCodex ? 'Model (Optional)' : 'Model'}</label>
            <input
              value={settings.model}
              onChange={e => update({ model: e.target.value })}
              placeholder={isCodex ? 'Use Codex default' : preset.model || 'model-name'}
              list="model-suggestions"
            />
            {preset.models.length > 0 && (
              <datalist id="model-suggestions">
                {preset.models.map(m => <option key={m} value={m} />)}
              </datalist>
            )}
            <p className="hint">
              {isCodex
                ? <>Uses the existing Codex CLI login in a read-only, ephemeral background run. Leave the model blank to use the Codex default.</>
                : isOpenRouter
                ? <>Use any OpenRouter model slug, such as <code>moonshotai/kimi-k3</code>. AI features only run after you add an API key.</>
                : <>Default model is <code>{preset.model || 'custom'}</code>. AI features only run after you add an API key.</>}
            </p>

            {!isCodex && (
              <>
                <label className="diane-credentials-choice"><input type="checkbox" checked={settings.preferDianeCredentials !== false} onChange={e => update({ preferDianeCredentials: e.target.checked })} /> Use Diane credentials when available</label>
                <p className="hint">{settings.preferDianeCredentials === false ? 'Using Todo’s own key.' : dianeAvailable ? 'Diane key available on this computer. Diane does not need to be open.' : 'No matching Diane key found. Todo will use its own key.'}</p>
                <label>Todo API key (fallback)</label>
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
              </>
            )}

            <div className="test-row">
              <button
                onClick={handleTest}
                disabled={testing || !settings.apiBase || (!isCodex && !settings.apiKey && !(settings.preferDianeCredentials !== false && dianeAvailable))}
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
          </fieldset>
        </div>

        {/* --- Footer --- */}
        <div className="btn-row">
          {!firstRun && <button onClick={onClose} disabled={updating}>Cancel</button>}
          <button className="primary" onClick={handleSave} disabled={saving || updating}>
            {saving
              ? 'Saving…'
              : firstRun
                ? isProviderConfigured(settings, settings.provider) ? 'Save & Start' : 'Start without AI'
                : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
