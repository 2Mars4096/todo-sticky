import { useState, type ReactNode } from 'react'
import { ParagraphInput } from './ParagraphInput'
import { ScreenshotTask } from './ScreenshotTask'

interface Props {
  screenshot?: { context: string; ready: boolean }
  onAdd: (text: string) => void
  prominent?: boolean
  autoFocus?: boolean
  disabled?: boolean
  inline?: boolean
}

export function AddTask({
  onAdd,
  prominent = false,
  autoFocus = false,
  disabled = false,
  inline = false,
  screenshot,
}: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed && !disabled) {
      onAdd(trimmed)
      setText('')
    }
  }

  if (inline) {
    return (
      <div className={`task-step-add-row task-add-row${text ? ' has-draft' : ''}`}>
        <span className="task-step-add-handle-space" aria-hidden="true" />
        <ParagraphInput
          className="task-text-input task-step-add-input"
          placeholder="Add task..."
          aria-label="New top-level task"
          value={text}
          disabled={disabled}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); handleSubmit() }
            if (event.key === 'Escape') {
              event.stopPropagation()
              setText('')
              event.currentTarget.blur()
            }
          }}
        />
        {text.trim() && <button type="button" className="task-text-action" onClick={handleSubmit} disabled={disabled} aria-label="Add task">Add</button>}
      </div>
    )
  }

  const composer = (captureButton?: ReactNode) => (
    <form
      className="add-task-row"
      onSubmit={event => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <ParagraphInput
        id="quick-add-task"
        aria-label="New task"
        placeholder="What needs doing?"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus && !disabled}
        onKeyDown={event => {
          if (!event.nativeEvent.isComposing && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault(); handleSubmit()
          }
        }}
      />
      {captureButton}
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Add task">
        Add
      </button>
    </form>
  )
  return <div className={`add-task ${prominent ? 'prominent' : ''}`}>
    {screenshot ? <ScreenshotTask key={screenshot.context} disabled={disabled || !screenshot.ready}
      composer={composer} /> : composer()}
  </div>
}
