import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { outline, ScreenshotReview } from './ScreenshotTask'
import { useDialogFocus } from '../hooks/useDialogFocus'

type Receipt = { Ok: string } | { Err: string }

export function SentScreenshots({ disabled, date, onAdd }: {
  disabled: boolean
  date: string
  onAdd: (title: string, steps: string[]) => void
}) {
  const [queue, setQueue] = useState<(Receipt & { id: string })[]>([])
  const close = () => setQueue(current => current.slice(1))
  const receipt = queue[0]
  const dialog = useDialogFocus(close, { enabled: Boolean(receipt) })

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | undefined
    async function drain() {
      const items = await invoke<Receipt[]>('take_sent_screenshots')
      if (!disposed && items.length) setQueue(current => [...current, ...items.map(item => ({ ...item, id: crypto.randomUUID() }))])
    }
    void listen('flameshot-draft-ready', drain).then(unlisten => {
      if (disposed) return unlisten()
      unsubscribe = unlisten
      return drain()
    }).catch(console.error)
    return () => { disposed = true; unsubscribe?.() }
  }, [])

  if (!receipt) return null
  return <div className="settings-overlay">
    <div ref={dialog} className="settings-panel add-task" role="dialog" aria-modal="true" aria-label="Task from Flameshot">
      <h2>Task from screenshot · {date}</h2>
      {'Ok' in receipt
        ? <ScreenshotReview key={receipt.id} initial={outline(receipt.Ok)} disabled={disabled} onAdd={onAdd} onClose={close} />
        : <><p role="alert">{receipt.Err}</p><button onClick={close}>Close</button></>}
    </div>
  </div>
}
