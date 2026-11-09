import { NOTE_MATERIALS, type NoteMaterial } from '../noteMaterial'
import { AccountPanel, type CloudAccount } from './AccountPanel'
import { useState, useEffect, useId, useRef } from 'react'
import type { AppSettings, Provider } from '../types'
import { api } from '../api'
import { dianeRequest, type DianeProjects } from '../diane'
import { AppUpdates } from './AppUpdates'
import { updateIsBusy } from '../appUpdates'
import type { useAppUpdates } from '../hooks/useAppUpdates'
import { useDialogFocus } from '../hooks/useDialogFocus'
import '../styles/settings-navigation.css'
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

type SettingsSection = 'style' | 'tasks' | 'ai' | 'integrations' | 'updates' | 'account'
const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'tasks', label: 'Storage' },
  { id: 'style', label: 'Style' },
  { id: 'ai', label: 'AI' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'account', label: 'Account' },
  { id: 'updates', label: 'Updates' },
]

interface Props {
  account?: CloudAccount
  initialAccount?: boolean
  noteMaterial?: NoteMaterial
  onNoteMaterial?: (material: NoteMaterial) => void
  materialSaveError?: boolean
  appUpdates: ReturnType<typeof useAppUpdates>
  updateBlockedReason?: string
  onClose: () => void
  onSaved?: (settings: AppSettings) => void
  onBeforeSave?: () => Promise<void>
  firstRun?: boolean
  initialProvider?: Provider
}

export function SettingsPanel({ account, initialAccount = false, noteMaterial = 'paper', onNoteMaterial, materialSaveError, onClose, onSaved, onBeforeSave, firstRun, initialProvider, appUpdates, updateBlockedReason }: Props) {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS)
  const [section, setSection] = useState<SettingsSection>(initialAccount ? 'account' : initialProvider ? 'ai' : 'tasks')
  const [dianeDestination, setDianeDestination] = useState('')
  const [dianeAvailable, setDianeAvailable] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [dirty, setDirty] = useState(false)
  const updating = updateIsBusy(appUpdates.state.phase)
  const id = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const requestClose = () => { if (!updating && !saving) onClose() }
  const dialogRef = useDialogFocus(requestClose, { initialFocusRef: closeButtonRef })

  useEffect(() => {
    let disposed = false
    setLoading(true)
    setLoadFailed(false)
    setSettingsError(null)
    api.getSettings().then(s => {
      if (disposed) return
      if (!s) throw new Error('Settings unavailable')
      setSettings(initialProvider ? settingsForProvider(s, initialProvider) : s)
      setDirty(Boolean(initialProvider && initialProvider !== s.provider))
    }).catch(() => {
      if (!disposed) {
        setLoadFailed(true)
        setSettingsError('Could not load settings. Try again before making changes.')
      }
    }).finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [initialProvider, loadAttempt])

  useEffect(() => {
    if (loading || loadFailed) return
    let disposed = false
    const refresh = () => api.dianeCredentialStatus(settings.provider, settings.apiBase)
      .then(available => { if (!disposed) setDianeAvailable(available) })
      .catch(() => { if (!disposed) setDianeAvailable(false) })
    setDianeAvailable(false)
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { disposed = true; window.removeEventListener('focus', refresh) }
  }, [settings.provider, settings.apiBase, loading, loadFailed])

  useEffect(() => {
    if (!settings.connectDiane || loading || loadFailed) return
    let disposed = false
    setDianeDestination('Checking Dear Diane on this computer…')
    void dianeRequest<DianeProjects>('projects').then(data => {
      const project = data.projects.find(item => item.id === data.active_project_id)
      if (!disposed) setDianeDestination(project?.root ? 'Project: ' + project.name + ' · ' + project.root : 'Connected. Select a project folder in Dear Diane.')
    }).catch(() => { if (!disposed) setDianeDestination('Not connected. Open Dear Diane on this computer.') })
    return () => { disposed = true }
  }, [settings.connectDiane, loading, loadFailed])

  const update = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSettingsError(null)
    setTestResult(null)
  }

  const handleProviderChange = (provider: Provider) => {
    setSettings(prev => settingsForProvider(prev, provider))
    setDirty(true)
    setShowKey(false)
    setTestResult(null)
  }

  const handleSave = async () => {
    if (loading || loadFailed || updating || saving) return
    setSaving(true)
    setSettingsError(null)
    try {
      await onBeforeSave?.()
      const settingsToSave = syncActiveProviderProfile(settings)
      await api.saveSettings(settingsToSave)
      setSettings(settingsToSave)
      setDirty(false)
      onSaved?.(settingsToSave)
      onClose()
    } catch {
      setSettingsError('Could not save settings. Your changes are still here; try again.')
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
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : String(error) })
    } finally {
      setTesting(false)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const folder = await api.selectFolder()
      if (folder) update({ kbPath: folder })
    } catch {
      setSettingsError('Could not open the folder chooser. You can enter the folder path instead.')
    }
  }

  const updateMachine = (index: number, patch: Partial<AppSettings['machines'][0]>) => {
    const machines = [...settings.machines]
    machines[index] = { ...machines[index], ...patch }
    update({ machines })
  }

  const preset = PROVIDER_PRESETS[settings.provider] || PROVIDER_PRESETS.custom
  const isCodex = settings.provider === 'codex'
  const isOpenRouter = settings.provider === 'openrouter' || settings.apiBase.toLowerCase().includes('openrouter.ai')
  const fieldsDisabled = loading || loadFailed || saving || testing || updating
  const updateReason = dirty ? 'Save your settings before updating.'
    : loading || loadFailed ? 'Wait for settings to load before updating.'
    : saving || testing ? 'Wait for the current operation to finish.' : updateBlockedReason

  return (
    <div className="settings-overlay" onClick={requestClose}>
      <div ref={dialogRef} className="settings-panel settings-wide settings-refined" role="dialog" aria-modal="true" aria-labelledby={id + '-title'} tabIndex={-1} onClick={event => event.stopPropagation()}>
        <header className="settings-dialog-header">
          <h2 id={id + '-title'}>{firstRun ? 'Make Sticky Todo yours' : 'Settings'}</h2>
          <button ref={closeButtonRef} type="button" className="settings-close" onClick={requestClose} disabled={updating || saving} aria-label="Close settings">×</button>
        </header>
        {firstRun && <p className="settings-subtitle">You can capture tasks now and set up optional tools whenever you need them.</p>}

        <nav className="settings-section-nav" aria-label="Settings sections">
          {SECTIONS.map(item => <button key={item.id} type="button" aria-pressed={section === item.id} aria-controls={id + '-section'} onClick={() => setSection(item.id)}>{item.label}</button>)}
        </nav>

        <div className="settings-scroll" id={id + '-section'}>
          {loading && <p className="settings-status" role="status">Loading settings…</p>}
          {settingsError && <div className="settings-error" role="alert"><p>{settingsError}</p>{loadFailed && <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Retry</button>}</div>}
          {section === 'style' && <section className="settings-section" aria-labelledby={id + '-material-title'}>
            <h3 className="section-title" id={id + '-material-title'}>Note material</h3>
            <p className="settings-description">Choose how your working note catches the light.</p>
            <div className="material-options" role="group" aria-label="Note material">
              {NOTE_MATERIALS.map(item => <button key={item.id} type="button"
                className="material-option" aria-pressed={noteMaterial === item.id}
                onClick={() => onNoteMaterial?.(item.id)}>
                <span className="material-swatch" data-material={item.id} aria-hidden="true"><span /><span /><span /></span>
                <span className="material-copy"><strong>{item.label}</strong><span>{item.detail}</span></span>
                <span className="material-check" aria-hidden="true">{noteMaterial === item.id ? '✓' : ''}</span>
              </button>)}
            </div>
            <p className="hint">Applies immediately on this device.</p>
            {materialSaveError && <p role="alert" className="settings-error">This style could not be saved. Choose it again to retry.</p>}
          </section>}
          {section === 'tasks'  && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-storage-title'}>
              <h3 className="section-title" id={id + '-storage-title'}>Tasks & storage</h3>
              <p className="settings-description">Your tasks are saved as Markdown in your task folder.</p>
              <p className="settings-path" aria-label="Current task folder">{settings.kbPath || '~/Documents/Sticky Todo'}</p>
              <details className="settings-details">
                <summary>Change task folder</summary>
                <label htmlFor={id + '-folder'}>Task folder</label>
                <div className="input-row">
                  <input id={id + '-folder'} value={settings.kbPath} onChange={event => update({ kbPath: event.target.value })} placeholder="~/Documents/Sticky Todo" aria-describedby={id + '-folder-hint'} />
                  <button type="button" className="input-row-btn" onClick={handleSelectFolder} aria-label="Choose storage folder">Browse</button>
                </div>
                <p className="hint" id={id + '-folder-hint'}>Leave blank for the default folder. Task files live in content/to-do inside it. Existing task files stay in their current location.</p>
              </details>
            </section>
          </fieldset>}

          {section === 'ai' && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-ai-title'}>
              <h3 className="section-title" id={id + '-ai-title'}>AI assistance</h3>
              <p className="settings-description">Optional help with outcomes, steps, and planning. Tasks work without AI.</p>
              <label htmlFor={id + '-provider'}>Provider</label>
              <select id={id + '-provider'} value={settings.provider} onChange={event => handleProviderChange(event.target.value as Provider)}>
                {PROVIDER_ORDER.map(provider => <option key={provider} value={provider}>{PROVIDER_PRESETS[provider].label}</option>)}
              </select>
              {isCodex ? <p className="hint">Uses your existing Codex CLI login. No API key is needed.</p> : <>
                <label htmlFor={id + '-key'}>{settings.preferDianeCredentials !== false && dianeAvailable ? 'Todo API key (fallback)' : 'Todo API key'}</label>
                <div className="input-row">
                  <input id={id + '-key'} type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={event => update({ apiKey: event.target.value })} placeholder={isOpenRouter ? 'sk-or-v1-…' : 'sk-…'} autoComplete="off" spellCheck={false} />
                  <button type="button" className="input-row-btn" onClick={() => setShowKey(value => !value)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? 'Hide' : 'Show'}</button>
                </div>
                {settings.preferDianeCredentials !== false && dianeAvailable && <p className="hint">A matching Diane key is available. You can change key reuse in Integrations.</p>}
              </>}
              <details className="settings-details" key={settings.provider} open={settings.provider === 'custom' || undefined}>
                <summary>Model and connection options</summary>
                <label htmlFor={id + '-model'}>{isCodex ? 'Model (optional)' : 'Model'}</label>
                <input id={id + '-model'} value={settings.model} onChange={event => update({ model: event.target.value })} placeholder={isCodex ? 'Use Codex default' : preset.model || 'model-name'} list={id + '-models'} />
                {preset.models.length > 0 && <datalist id={id + '-models'}>{preset.models.map(model => <option key={model} value={model} />)}</datalist>}
                <p className="hint">{isCodex ? 'Leave blank to use your Codex default model.' : isOpenRouter ? 'Use the model name from the OpenRouter catalog.' : 'Use a model supported by your provider.'}</p>
                <label htmlFor={id + '-endpoint'}>{isCodex ? 'Codex executable' : 'API base URL'}</label>
                <input id={id + '-endpoint'} value={settings.apiBase} onChange={event => update({ apiBase: event.target.value })} placeholder={isCodex ? 'codex or full executable path' : preset.apiBase || 'https://api.example.com/v1'} spellCheck={false} />
              </details>
              <div className="test-row">
                <button type="button" onClick={handleTest} disabled={testing || !settings.apiBase || (!isCodex && !settings.apiKey && !(settings.preferDianeCredentials !== false && dianeAvailable))}>{testing ? 'Testing…' : 'Test connection'}</button>
                {testResult && <span className={'test-result ' + (testResult.ok ? 'ok' : 'fail')} role="status">{testResult.ok ? dirty ? 'Connected. Save to use these settings.' : 'Connected' : testResult.message || 'Could not connect. Check the provider settings.'}</span>}
              </div>
              <p className="hint">Test connection checks this form. Planning uses your saved provider and model.</p>
              <details className="settings-details">
                <summary>Scheduling machines (optional)</summary>
                <p className="hint">Add computers that can run scheduled work.</p>
                {settings.machines.map((machine, index) => <div className="machine-card" key={index}>
                  <div className="settings-machine-heading"><strong>Machine {index + 1}</strong><button type="button" className="machine-rm" onClick={() => update({ machines: settings.machines.filter((_, i) => i !== index) })} aria-label={'Remove machine ' + (machine.name || index + 1)}>Remove</button></div>
                  <label htmlFor={id + '-machine-name-' + index}>Name</label>
                  <input id={id + '-machine-name-' + index} value={machine.name} onChange={event => updateMachine(index, { name: event.target.value })} />
                  <label htmlFor={id + '-machine-type-' + index}>Type</label>
                  <select id={id + '-machine-type-' + index} value={machine.type} onChange={event => updateMachine(index, { type: event.target.value })}><option value="server">Server</option><option value="workstation">Workstation</option></select>
                  <label htmlFor={id + '-machine-specs-' + index}>Specifications (optional)</label>
                  <input id={id + '-machine-specs-' + index} value={machine.specs || ''} onChange={event => updateMachine(index, { specs: event.target.value })} placeholder="For example, 64 GB RAM" />
                  <label htmlFor={id + '-machine-capabilities-' + index}>Capabilities (comma separated)</label>
                  <input id={id + '-machine-capabilities-' + index} value={(machine.capabilities || []).join(', ')} onChange={event => updateMachine(index, { capabilities: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} />
                </div>)}
                <button type="button" className="add-machine" onClick={() => update({ machines: [...settings.machines, { name: '', type: 'server', specs: '', capabilities: [] }] })}>Add machine</button>
              </details>
            </section>
          </fieldset>}

          {section === 'integrations' && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-integrations-title'}>
              <h3 className="section-title" id={id + '-integrations-title'}>Integrations</h3>
              <p className="settings-description">Connect optional tools on this computer.</p>
              <label className="diane-credentials-choice"><input type="checkbox" checked={settings.connectDiane === true} onChange={event => update({ connectDiane: event.target.checked })} /> Connect to Dear Diane on this computer</label>
              <p className="hint">{settings.connectDiane ? dianeDestination : 'Enable task handoff to Dear Diane. Your task list works independently.'}</p>
              <label className="diane-credentials-choice"><input type="checkbox" checked={settings.preferDianeCredentials !== false} onChange={event => update({ preferDianeCredentials: event.target.checked })} /> Use Diane credentials when available</label>
              <p className="hint">{settings.preferDianeCredentials === false ? 'Using Todo’s own key.' : dianeAvailable ? 'A matching key is available. Diane does not need to be open.' : 'No matching key found. Todo will use its own key.'}</p>
            </section>
          </fieldset>}

          {section === 'updates' && <AppUpdates currentVersion={appUpdates.currentVersion} state={appUpdates.state} blockedReason={updateReason} onCheck={appUpdates.check} onInstall={appUpdates.install} onRestart={appUpdates.restart} />}
          {section === 'account' && account && <AccountPanel account={account} />}
        </div>

        <div className="btn-row">
          <button type="button" onClick={requestClose} disabled={updating || saving}>{firstRun ? 'Back to tasks' : 'Cancel'}</button>
          <button type="button" className="primary" onClick={handleSave} disabled={fieldsDisabled}>{saving ? 'Saving…' : firstRun ? isProviderConfigured(settings, settings.provider) ? 'Save & start' : 'Start without AI' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
