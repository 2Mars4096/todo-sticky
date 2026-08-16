import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './styles/sticky.css'

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
  const error = new Error('Missing application root element')
  recordBootError(error)
  throw error
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary onError={recordBootError}>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)

window.requestAnimationFrame(() => {
  window.__stickyTodoBoot?.record('render-complete', '')
})
