import type { DownloadEvent } from '@tauri-apps/plugin-updater'

export interface AppUpdate {
  version: string
  body?: string
  download: (progress: (event: DownloadEvent) => void, options: { timeout: number }) => Promise<void>
  install: () => Promise<void>
  close: () => Promise<void>
}

export type UpdatePhase = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'installing' | 'installed' | 'restarting' | 'error'
export interface UpdateState {
  phase: UpdatePhase
  version?: string
  notes?: string
  downloaded?: number
  total?: number
  error?: string
}

export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000

export function updateNeedsAttention(phase: UpdatePhase) {
  return phase === 'available' || phase === 'installed'
}

export function updateIsBusy(phase: UpdatePhase) {
  return ['checking', 'downloading', 'installing', 'restarting'].includes(phase)
}

// Keep the update resource alive across Settings openings, and separate download
// from installation so disk writes can finish before Windows exits the app.
export function createAppUpdater(deps: {
  check: () => Promise<AppUpdate | null>
  beforeInstall: () => Promise<void>
  relaunch: () => Promise<void>
  onChange: (state: UpdateState) => void
  now?: () => number
}) {
  let state: UpdateState = { phase: 'idle' }
  let update: AppUpdate | null = null
  let disposed = false
  let checking = false
  let lastCheckAt: number | null = null
  const now = deps.now ?? Date.now
  const publish = (next: UpdateState) => {
    state = next
    if (!disposed) deps.onChange(next)
  }
  const close = async (resource: AppUpdate | null) => {
    if (resource) await resource.close().catch(() => {})
  }

  return {
    async check({ background = false }: { background?: boolean } = {}) {
      if (disposed || checking || updateIsBusy(state.phase) || state.phase === 'installed') return
      const time = now()
      if (background && (state.phase === 'available'
        || (lastCheckAt !== null && time >= lastCheckAt && time - lastCheckAt < UPDATE_CHECK_INTERVAL_MS))) return
      checking = true
      lastCheckAt = time
      if (!background) publish({ phase: 'checking' })
      await close(update)
      update = null
      try {
        const found = await deps.check()
        if (disposed) { await close(found); return }
        update = found
        publish(found
          ? { phase: 'available', version: found.version, notes: found.body }
          : { phase: 'current' })
      } catch (error) {
        // Automatic checks stay quiet when offline; manual checks report errors.
        if (!background) publish({ phase: 'error', error: String(error) })
      } finally {
        checking = false
      }
    },
    async install() {
      if (disposed || state.phase !== 'available' || !update) return
      const resource = update
      publish({ ...state, phase: 'downloading', error: undefined, downloaded: 0 })
      try {
        // Check save/blocking conditions before a potentially large download.
        await deps.beforeInstall()
        await resource.download(event => {
          if (event.event === 'Started') publish({ ...state, total: event.data.contentLength })
          if (event.event === 'Progress') publish({ ...state, downloaded: (state.downloaded ?? 0) + event.data.chunkLength })
        }, { timeout: 300_000 })
        if (disposed) { await close(resource); return }
        publish({ ...state, phase: 'installing' })
        await deps.beforeInstall()
        await resource.install()
        publish({ phase: 'installed', version: resource.version })
        await close(resource)
        update = null
      } catch (error) {
        await close(resource)
        update = null
        publish({ phase: 'error', error: String(error) })
      }
    },
    async restart() {
      if (disposed || state.phase !== 'installed') return
      publish({ ...state, phase: 'restarting', error: undefined })
      try {
        await deps.beforeInstall()
        await deps.relaunch()
      } catch (error) {
        // Installation succeeded; retry only the restart, not the download.
        publish({ ...state, phase: 'installed', error: String(error) })
      }
    },
    dispose() {
      disposed = true
      if (!updateIsBusy(state.phase)) void close(update)
    },
  }
}
