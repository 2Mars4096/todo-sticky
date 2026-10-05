import { useEffect, useRef, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { createAppUpdater, UPDATE_CHECK_INTERVAL_MS, updateNeedsAttention, type UpdateState } from '../appUpdates'

export function useAppUpdates(beforeInstall: () => Promise<void>) {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [currentVersion, setCurrentVersion] = useState('')
  const prepareRef = useRef(beforeInstall)
  prepareRef.current = beforeInstall
  const controller = useRef<ReturnType<typeof createAppUpdater> | null>(null)

  useEffect(() => {
    const updater = createAppUpdater({
      check: () => check({ timeout: 15_000 }),
      relaunch,
      beforeInstall: () => prepareRef.current(),
      onChange: setState,
    })
    controller.current = updater
    let stopChecking = () => {}
    if (isTauri()) {
      void getVersion().then(setCurrentVersion).catch(() => {})
      const checkInBackground = () => { void updater.check({ background: true }) }
      const onVisible = () => { if (document.visibilityState === 'visible') checkInBackground() }
      checkInBackground()
      const timer = window.setInterval(checkInBackground, UPDATE_CHECK_INTERVAL_MS)
      window.addEventListener('focus', checkInBackground)
      window.addEventListener('online', checkInBackground)
      document.addEventListener('visibilitychange', onVisible)
      stopChecking = () => {
        window.clearInterval(timer)
        window.removeEventListener('focus', checkInBackground)
        window.removeEventListener('online', checkInBackground)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
    return () => { stopChecking(); updater.dispose(); controller.current = null }
  }, [])

  return {
    state, currentVersion, needsAttention: updateNeedsAttention(state.phase),
    check: () => { void controller.current?.check() },
    install: () => { void controller.current?.install() },
    restart: () => { void controller.current?.restart() },
  }
}
