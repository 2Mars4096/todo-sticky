import { ui } from '../interfaceLocale'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { NOTE_MATERIALS, type NoteMaterial } from '../noteMaterial'
import { AccountPanel, type CloudAccount } from './AccountPanel'
import { useState, useEffect, useId, useRef } from 'react'
import type { AppSettings, Provider } from '../types'
import { api } from '../api'
import { usesDianeOpenRouter } from '../cloudAccount'
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
  { id: 'tasks', get label(){ return ui("Storage") } },
  { id: 'style', get label(){ return ui("Style") } },
  { id: 'ai', label: 'AI' },
  { id: 'integrations', get label(){ return ui("Integrations") } },
  { id: 'account', get label(){ return ui("Account") } },
  { id: 'updates', get label(){ return ui("Updates") } },
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
  const [captureSettingsOpen, setCaptureSettingsOpen] = useState(false)
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
      if (!s) throw new Error(ui("Settings unavailable"))
      setSettings(initialProvider ? settingsForProvider(s, initialProvider) : s)
      setDirty(Boolean(initialProvider && initialProvider !== s.provider))
    }).catch(() => {
      if (!disposed) {
        setLoadFailed(true)
        setSettingsError(ui("Could not load settings. Try again before making changes."))
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
    setDianeDestination(ui("Checking Shiprite on this computer…"))
    void dianeRequest<DianeProjects>('projects').then(data => {
      if (!disposed) setDianeDestination(data.projects.length ? ui("Connected · choose a workspace when sending a task.") : ui("Connected · choose a folder when sending a task."))
    }).catch(() => { if (!disposed) setDianeDestination(ui("Not connected. Open Shiprite on this computer.")) })
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
      setSettingsError(ui("Could not save settings. Your changes are still here; try again."))
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
      setSettingsError(ui("Could not open the folder chooser. You can enter the folder path instead."))
    }
  }

  const updateMachine = (index: number, patch: Partial<AppSettings['machines'][0]>) => {
    const machines = [...settings.machines]
    machines[index] = { ...machines[index], ...patch }
    update({ machines })
  }

  const preset = PROVIDER_PRESETS[settings.provider] || PROVIDER_PRESETS.custom
  const isDiane = usesDianeOpenRouter(settings.provider, settings.apiBase)
  const isCodex = settings.provider === 'codex'
  const isOpenRouter = settings.provider === 'openrouter' || settings.apiBase.toLowerCase().includes('openrouter.ai')
  const fieldsDisabled = loading || loadFailed || saving || testing || updating
  const updateReason = dirty ? ui("Save your settings before updating.")
    : loading || loadFailed ? ui("Wait for settings to load before updating.")
    : saving || testing ? ui("Wait for the current operation to finish.") : updateBlockedReason

  return (
    <div className="settings-overlay" onClick={requestClose}>
      <div ref={dialogRef} className="settings-panel settings-wide settings-refined" role="dialog" aria-modal="true" aria-labelledby={id + '-title'} tabIndex={-1} onClick={event => event.stopPropagation()}>
        <header className="settings-dialog-header">
          <h2 id={id + '-title'}>{ui("Settings")}</h2>
          <button ref={closeButtonRef} type="button" className="settings-close" onClick={requestClose} disabled={updating || saving} aria-label={ui("Close settings")}>×</button>
        </header>

        <nav className="settings-section-nav" aria-label={ui("Settings sections")}>
          {SECTIONS.filter(item => isTauri() || !['integrations', 'updates'].includes(item.id)).map(item => <button key={item.id} type="button" aria-pressed={section === item.id} aria-controls={id + '-section'} onClick={() => setSection(item.id)}>{item.label}</button>)}
        </nav>

        <div className="settings-scroll" id={id + '-section'}>
          {loading && <p className="settings-status" role="status">{ui("Loading settings…")}</p>}
          {settingsError && <div className="settings-error" role="alert"><p>{settingsError}</p>{loadFailed && <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>{ui("Retry")}</button>}</div>}
          {section === 'style' && <section className="settings-section" aria-labelledby={id + '-material-title'}>
            <h3 className="section-title" id={id + '-material-title'}>{ui("Note material")}</h3>
            <div className="material-options" role="group" aria-label={ui("Note material")}>
              {NOTE_MATERIALS.map(item => <button key={item.id} type="button"
                className="material-option" aria-pressed={noteMaterial === item.id}
                onClick={() => onNoteMaterial?.(item.id)}>
                <span className="material-swatch" data-material={item.id} aria-hidden="true"><span /><span /><span /></span>
                <span className="material-copy"><strong>{item.label}</strong><span>{item.detail}</span></span>
                <span className="material-check" aria-hidden="true">{noteMaterial === item.id ? '✓' : ''}</span>
              </button>)}
            </div>
            <p className="hint">{ui("Applies immediately on this device.")}</p>
            {materialSaveError && <p role="alert" className="settings-error">{ui("This style could not be saved. Choose it again to retry.")}</p>}
          </section>}
          {section === 'tasks'  && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-storage-title'}>
              <h3 className="section-title" id={id + '-storage-title'}>{ui("Tasks & storage")}</h3>
              {isTauri() ? <><p className="settings-description">{ui("Your tasks are saved as Markdown in your task folder.")}</p>
              <p className="settings-path" aria-label={ui("Current task folder")}>{settings.kbPath || ui("~/Documents/Sticky Todo")}</p>
              <details className="settings-details">
                <summary>{ui("Change task folder")}</summary>
                <label htmlFor={id + '-folder'}>{ui("Task folder")}</label>
                <div className="input-row">
                  <input id={id + '-folder'} value={settings.kbPath} onChange={event => update({ kbPath: event.target.value })} placeholder={ui("~/Documents/Sticky Todo")} aria-describedby={id + '-folder-hint'} />
                  <button type="button" className="input-row-btn" onClick={handleSelectFolder} aria-label={ui("Choose storage folder")}>{ui("Browse")}</button>
                </div>
                <p className="hint" id={id + '-folder-hint'}>{ui("Leave blank for the default folder. Task files live in content/to-do inside it. Existing task files stay in their current location.")}</p>
              </details></> : <p>{ui("Your notebook is saved in this browser.")}</p>}
            </section>
          </fieldset>}

          {section === 'ai' && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-ai-title'}>
              <h3 className="section-title" id={id + '-ai-title'}>{ui("AI assistance")}</h3>
              <p className="settings-description">{ui("Optional help with outcomes, steps, and planning. Tasks work without AI.")}</p>
              <label htmlFor={id + '-provider'}>{ui("Provider")}</label>
              <select id={id + '-provider'} value={settings.provider} onChange={event => handleProviderChange(event.target.value as Provider)}>
                {PROVIDER_ORDER.filter(provider => isTauri() || provider === 'diane').map(provider => <option key={provider} value={provider}>{PROVIDER_PRESETS[provider].label}</option>)}
              </select>
              {isDiane ? <p className="hint">{ui("Uses the OpenRouter key saved in your Pipe Dreams account.")}</p> : isCodex ? <p className="hint">{ui("Uses your existing Codex CLI login. No API key is needed.")}</p> : <>
                <label htmlFor={id + '-key'}>{settings.preferDianeCredentials !== false && dianeAvailable ? ui("Dockit API key (fallback)") : ui("Dockit API key")}</label>
                <div className="input-row">
                  <input id={id + '-key'} type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={event => update({ apiKey: event.target.value })} placeholder={isOpenRouter ? ui("sk-or-v1-…") : ui("sk-…")} autoComplete="off" spellCheck={false} />
                  <button type="button" className="input-row-btn" onClick={() => setShowKey(value => !value)} aria-label={showKey ? ui("Hide API key") : ui("Show API key")}>{showKey ? ui("Hide") : ui("Show")}</button>
                </div>
                {settings.preferDianeCredentials !== false && dianeAvailable && <p className="hint">{ui("A matching Shiprite key is available. You can change key reuse in Integrations.")}</p>}
              </>}
              {!isDiane && <details className="settings-details" key={settings.provider} open={settings.provider === 'custom' || undefined}>
                <summary>{ui("Model and connection options")}</summary>
                <label htmlFor={id + '-model'}>{isCodex ? ui("Model (optional)") : ui("Model")}</label>
                <input id={id + '-model'} value={settings.model} onChange={event => update({ model: event.target.value })} placeholder={isCodex ? ui("Use Codex default") : preset.model || 'model-name'} list={id + '-models'} />
                {preset.models.length > 0 && <datalist id={id + '-models'}>{preset.models.map(model => <option key={model} value={model} />)}</datalist>}
                <p className="hint">{isCodex ? ui("Leave blank to use your Codex default model.") : isOpenRouter ? ui("Use the model name from the OpenRouter catalog.") : ui("Use a model supported by your provider.")}</p>
                <label htmlFor={id + '-endpoint'}>{isCodex ? ui("Codex executable") : ui("API base URL")}</label>
                <input id={id + '-endpoint'} value={settings.apiBase} onChange={event => update({ apiBase: event.target.value })} placeholder={isCodex ? ui("codex or full executable path") : preset.apiBase || 'https://api.example.com/v1'} spellCheck={false} />
              </details>}
              <div className="test-row">
                <button type="button" onClick={handleTest} disabled={testing || (!isDiane && (!settings.apiBase || (!isCodex && !settings.apiKey && !(settings.preferDianeCredentials !== false && dianeAvailable))))}>{testing ? ui("Testing…") : ui("Test connection")}</button>
                {testResult && <span className={'test-result ' + (testResult.ok ? 'ok' : 'fail')} role="status">{testResult.ok ? dirty ? ui("Connected. Save to use these settings.") : ui("Connected") : testResult.message || ui("Could not connect. Check the provider settings.")}</span>}
              </div>
              <p className="hint">{ui("Test connection checks this form. Planning uses your saved provider and model.")}</p>
              <details className="settings-details">
                <summary>{ui("Scheduling machines (optional)")}</summary>
                <p className="hint">{ui("Add computers that can run scheduled work.")}</p>
                {settings.machines.map((machine, index) => <div className="machine-card" key={index}>
                  <div className="settings-machine-heading"><strong>{ui("Machine {0}", [index + 1])}</strong><button type="button" className="machine-rm" onClick={() => update({ machines: settings.machines.filter((_, i) => i !== index) })} aria-label={ui("Remove machine {0}", [(machine.name || index + 1)])}>{ui("Remove")}</button></div>
                  <label htmlFor={id + '-machine-name-' + index}>{ui("Name")}</label>
                  <input id={id + '-machine-name-' + index} value={machine.name} onChange={event => updateMachine(index, { name: event.target.value })} />
                  <label htmlFor={id + '-machine-type-' + index}>{ui("Type")}</label>
                  <select id={id + '-machine-type-' + index} value={machine.type} onChange={event => updateMachine(index, { type: event.target.value })}><option value="server">{ui("Server")}</option><option value="workstation">{ui("Workstation")}</option></select>
                  <label htmlFor={id + '-machine-specs-' + index}>{ui("Specifications (optional)")}</label>
                  <input id={id + '-machine-specs-' + index} value={machine.specs || ''} onChange={event => updateMachine(index, { specs: event.target.value })} placeholder={ui("For example, 64 GB RAM")} />
                  <label htmlFor={id + '-machine-capabilities-' + index}>{ui("Capabilities (comma separated)")}</label>
                  <input id={id + '-machine-capabilities-' + index} value={(machine.capabilities || []).join(', ')} onChange={event => updateMachine(index, { capabilities: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} />
                </div>)}
                <button type="button" className="add-machine" onClick={() => update({ machines: [...settings.machines, { name: '', type: 'server', specs: '', capabilities: [] }] })}>{ui("Add machine")}</button>
              </details>
            </section>
          </fieldset>}

          {section === 'integrations' && <fieldset className="settings-fields" disabled={fieldsDisabled}>
            <section className="settings-section" aria-labelledby={id + '-integrations-title'}>
              <h3 className="section-title" id={id + '-integrations-title'}>{ui("Integrations")}</h3>
              {isTauri() && /Mac/.test(navigator.platform) && (
                <button type="button" disabled={captureSettingsOpen} onClick={async () => {
                  setCaptureSettingsOpen(true)
                  try { await invoke('open_capture_settings') }
                  catch (error) { setSettingsError(String(error)) }
                  finally { setCaptureSettingsOpen(false) }
                }}>{ui("Flameshot settings…")}</button>
              )}
              <p className="settings-description">{ui("Connect optional tools on this computer.")}</p>
              <label className="diane-credentials-choice"><input type="checkbox" checked={settings.connectDiane === true} onChange={event => update({ connectDiane: event.target.checked })} />{" " + ui("Connect to Shiprite on this computer")}</label>
              <p className="hint">{settings.connectDiane ? dianeDestination : ui("Enable task handoff to Shiprite. Your task list works independently.")}</p>
              <label className="diane-credentials-choice"><input type="checkbox" checked={settings.preferDianeCredentials !== false} onChange={event => update({ preferDianeCredentials: event.target.checked })} />{" " + ui("Use Shiprite credentials when available")}</label>
              <p className="hint">{settings.preferDianeCredentials === false ? ui("Using Dockit’s own key.") : dianeAvailable ? ui("A matching key is available. Shiprite does not need to be open.") : ui("No matching key found. Dockit will use its own key.")}</p>
            </section>
          </fieldset>}

          {section === 'updates' && <AppUpdates currentVersion={appUpdates.currentVersion} state={appUpdates.state} blockedReason={updateReason} onCheck={appUpdates.check} onInstall={appUpdates.install} onRestart={appUpdates.restart} />}
          {section === 'account' && account && <AccountPanel account={account} flush={onBeforeSave} />}
        </div>

        <div className="btn-row">
          <button type="button" onClick={requestClose} disabled={updating || saving}>{firstRun ? ui("Back to tasks") : ui("Cancel")}</button>
          <button type="button" className="primary" onClick={handleSave} disabled={fieldsDisabled}>{saving ? ui("Saving…") : firstRun ? isProviderConfigured(settings, settings.provider) ? ui("Save & start") : ui("Start without AI") : ui("Save")}</button>
        </div>
      </div>
    </div>
  )
}
