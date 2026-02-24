import { useState } from 'react'

interface Props {
  onAdd: (text: string) => void
}

export function AddTask({ onAdd }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(trimmed)
      setText('')
    }
  }

  return (
    <div className="add-task">
      <input
        placeholder="+ Add a task..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
      />
    </div>
  )
}
