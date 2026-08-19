import { useState } from 'react'

interface Props {
  onAdd: (text: string) => void
  prominent?: boolean
  autoFocus?: boolean
  disabled?: boolean
}

export function AddTask({
  onAdd,
  prominent = false,
  autoFocus = false,
  disabled = false,
}: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(trimmed)
      setText('')
    }
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
