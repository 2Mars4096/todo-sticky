import React from 'react'

interface Props {
  children: React.ReactNode
  onError: (error: Error) => void
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="boot-fallback" role="alert">
        <span className="boot-fallback-mark" aria-hidden="true">!</span>
        <h1>Sticky Todo needs a reload</h1>
        <p>The interface hit a startup error. Your task file was not changed.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload app</button>
      </main>
    )
  }
}
