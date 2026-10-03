import { useEffect, useRef, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { createAppUpdater, type UpdateState } from '../appUpdates'

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
    if (isTauri()) void getVersion().then(setCurrentVersion).catch(() => {})
    return () => { updater.dispose(); controller.current = null }
  }, [])

  return {
    state, currentVersion,
    check: () => { void controller.current?.check() },
    install: () => { void controller.current?.install() },
    restart: () => { void controller.current?.restart() },
  }
}
