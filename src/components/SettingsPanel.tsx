import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

interface EnvInfo {
  apiBase: string
  model: string
  hasKey: boolean
  machines: { name: string; type: string; specs?: string; capabilities?: string[] }[]
}

export function SettingsPanel({ onClose }: Props) {
  const [envInfo, setEnvInfo] = useState<EnvInfo | null>(null)

  useEffect(() => {
    window.electronAPI?.getEnv().then(setEnvInfo)
  }, [])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <h3>Settings</h3>

        <label>API Endpoint</label>
        <input value={envInfo?.apiBase || ''} readOnly />

        <label>Model</label>
        <input value={envInfo?.model || ''} readOnly />

        <label>API Key</label>
        <input
          value={envInfo?.hasKey ? '••••••••••••••••' : 'Not configured'}
          readOnly
          style={{ color: envInfo?.hasKey ? 'inherit' : 'var(--delete-color)' }}
        />

        <label>Machines</label>
        {envInfo?.machines?.length ? (
          <ul className="machine-list">
            {envInfo.machines.map(m => (
              <li key={m.name}>
                <strong>{m.name}</strong> <span className="machine-type">{m.type}</span>
                {m.specs && <span className="machine-specs">{m.specs}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--delete-color)' }}>No machines configured</p>
        )}

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
          Configure in <code>.env</code> — edit <code>VITE_MACHINES</code> to add/change machines.
        </p>

        <div className="btn-row">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
