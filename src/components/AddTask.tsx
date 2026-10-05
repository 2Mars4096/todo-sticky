import { useRef, useState } from 'react'

interface Props {
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
}: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
        <button
          type="button"
          className="task-step-add-button"
          aria-label="Add a new task"
          title="Add a new task"
          disabled={disabled}
          onClick={() => { handleSubmit(); inputRef.current?.focus() }}
        >
          <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
        <input
          ref={inputRef}
          className="task-text-input task-step-add-input"
          placeholder="Add task..."
          aria-label="New top-level task"
          value={text}
          disabled={disabled}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') { event.preventDefault(); handleSubmit() }
            if (event.key === 'Escape') {
              event.stopPropagation()
              setText('')
              event.currentTarget.blur()
            }
          }}
        />
      </div>
    )
  }

  return (
    <form
      className={`add-task ${prominent ? 'prominent' : ''}`}
      onSubmit={event => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <div className="add-task-heading">
        <label htmlFor="quick-add-task">New task</label>
      </div>
      <div className="add-task-row">
        <input
          id="quick-add-task"
          placeholder="What needs doing?"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus && !disabled}
        />
        <button type="submit" disabled={disabled || !text.trim()} aria-label="Add task">
          Add
        </button>
      </div>
    </form>
  )
}
