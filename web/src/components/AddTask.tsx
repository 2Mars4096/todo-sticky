import { ui } from '../interfaceLocale'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
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

  const field = useRef<HTMLTextAreaElement>(null)
  const [composing, setComposing] = useState(false)
  const canAdd = !disabled && !composing && Boolean(text.trim())
  const captureProps = {
    ref: field,
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: () => setComposing(false),
  }
  const isComposing = (event: KeyboardEvent<HTMLTextAreaElement>) =>
    composing || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (canAdd && trimmed) {
      onAdd(trimmed)
      setText('')
      field.current?.focus({preventScroll: true})
    }
  }

  if (inline) {
    return (
      <div className={`task-step-add-row task-add-row${text ? ' has-draft' : ''}`}>
        <span className="task-step-add-handle-space" aria-hidden="true" />
        <ParagraphInput {...captureProps}
          className="task-text-input task-step-add-input"
          placeholder={ui("Add task...")}
          aria-label={ui("New top-level task")}
          value={text}
          disabled={disabled}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (isComposing(event)) return
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); handleSubmit() }
            if (event.key === 'Escape') {
              event.stopPropagation()
              setText('')
              event.currentTarget.blur()
            }
          }}
        />
        {text.trim() && <button type="button" className="task-text-action" onClick={handleSubmit} disabled={!canAdd} aria-label={ui("Add task")}>{ui("Add")}</button>}
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
      <ParagraphInput {...captureProps}
        id="quick-add-task"
        aria-label={ui("New task")}
        placeholder={ui("What needs doing?")}
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus && !disabled}
        onKeyDown={event => {
          if (!isComposing(event) && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault(); handleSubmit()
          }
        }}
      />
      {captureButton}
      <button type="submit" disabled={!canAdd} aria-label={ui("Add task")}>{ui("Add")}</button>
    </form>
  )
  return <div className={`add-task ${prominent ? 'prominent' : ''}`}>
    {screenshot ? <ScreenshotTask key={screenshot.context} disabled={disabled || !screenshot.ready}
      composer={composer} /> : composer()}
  </div>
}
