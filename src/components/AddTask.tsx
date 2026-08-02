import { useState } from 'react'

interface Props {
  onAdd: (text: string) => void
  prominent?: boolean
  autoFocus?: boolean
}

export function AddTask({ onAdd, prominent = false, autoFocus = false }: Props) {
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
      <label htmlFor="quick-add-task">New task</label>
      <div className="add-task-row">
        <input
          id="quick-add-task"
          placeholder="What needs doing?"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus={autoFocus}
        />
        <button type="submit" disabled={!text.trim()} aria-label="Add task">
          Add
        </button>
      </div>
    </form>
  )
}
