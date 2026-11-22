import { loadLanguage, ui } from './interfaceLocale'
import './app-menu.js'
import './app-menu.css'
import { invoke, isTauri } from '@tauri-apps/api/core'

if (isTauri()) {
  document.addEventListener('pipedreams-open-app', event => {
    const {url, opened, failed} = (event as CustomEvent).detail
    event.preventDefault()
    void invoke('open_suite_link', {url}).then(opened, failed)
  })
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './styles/sticky.css'
import './styles/shell-refinements.css'
import './styles/note-materials.css'

const BOOT_DIAGNOSTIC_KEY = 'todo-sticky-boot-diagnostic-v1'

interface BootBridge {
  record: (stage: string, value?: unknown) => void
  showFailure: (value?: unknown) => void
}

declare global {
  interface Window {
    __stickyTodoBoot?: BootBridge
  }
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown frontend error')
  return message.replace(/([A-Za-z]:)?[\\/][^\s:]+/g, '[path]').slice(0, 500)
}

function recordBootError(error: unknown) {
  const message = sanitizeError(error)
  window.__stickyTodoBoot?.record('react-render-error', message)

  if (!window.__stickyTodoBoot) {
    try {
      window.localStorage.setItem(BOOT_DIAGNOSTIC_KEY, JSON.stringify({
        stage: 'react-render-error',
        message,
        recordedAt: new Date().toISOString(),
      }))
    } catch (_) {}
  }
}

window.__stickyTodoBoot?.record('main-module-loaded', '')

const rootElement = document.getElementById('root')
if (!rootElement) {
  const error = new Error(ui("Missing application root element"))
  recordBootError(error)
  throw error
}

const root = ReactDOM.createRoot(rootElement)
void loadLanguage()
root.render(
  <React.StrictMode>
    <AppErrorBoundary onError={recordBootError}>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
