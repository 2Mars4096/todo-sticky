import { useState, type ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'

const marker = /^\s*(?:[-*•▪◦☐☑✓]|\[[ xX]\]|\d+[.)、])\s*/u

export function outline(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const listOnly = lines.length > 1 && marker.test(lines[0])
  const clean = (line: string) => line.replace(marker, '').replace(/^\[[ xX]\]\s*/, '').trim()
  return {
    title: listOnly ? 'Screenshot checklist' : clean(lines.shift() || ''),
    steps: lines.map(clean).filter(Boolean).join('\n'),
  }
}

export function ScreenshotTask({ disabled, composer }: {
  composer: (button: ReactNode) => ReactNode
  disabled: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function capture() {
    setBusy(true)
    setError('')
    try {
      await invoke('capture_task_outline')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const label = busy ? 'Opening Flameshot…' : 'Task from screenshot'
  return <>
    {composer(<button type="button" className="screenshot-trigger" aria-label={label} title={label}
      aria-busy={busy} disabled={disabled || busy} onClick={capture}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13.5" r="3.5" />
      </svg>
    </button>)}
    {error && <p role="alert">{error}</p>}
  </>
}

export function ScreenshotReview({ initial, disabled, onAdd, onClose }: {
  initial: ReturnType<typeof outline>
  disabled: boolean
  onAdd: (title: string, steps: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  return <form className="screenshot-task" aria-label="Review screenshot task" onSubmit={event => {
      event.preventDefault()
      if (disabled || !draft.title.trim()) return
      onAdd(draft.title.trim(), draft.steps.split('\n').map(line => line.trim()).filter(Boolean))
      onClose()
    }}>
      <label>Task title<input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label>Steps (one per line)<textarea rows={3} value={draft.steps} onChange={e => setDraft({ ...draft, steps: e.target.value })} /></label>
      <button type="submit" className="task-text-action" disabled={disabled || !draft.title.trim()}>Add task</button>
      <button type="button" className="task-text-action" onClick={() => onClose()}>Cancel</button>
    </form>
}
