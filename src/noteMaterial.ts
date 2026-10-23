import { useState } from 'react'

export type NoteMaterial = 'paper' | 'frosted' | 'liquid'
const KEY = 'todo-sticky-note-material-v1'
export const NOTE_MATERIALS: { id: NoteMaterial; label: string; detail: string }[] = [
  { id: 'paper', label: 'Paper', detail: 'The familiar warm note' },
  { id: 'frosted', label: 'Frosted glass', detail: 'Soft light, satin edges' },
  { id: 'liquid', label: 'Liquid glass', detail: 'Flowing light, polished edges' },
]
export function useNoteMaterial() {
  const [material, setMaterial] = useState<NoteMaterial>(() => {
    try {
      const saved = localStorage.getItem(KEY)
      return saved === 'frosted' || saved === 'liquid' ? saved : 'paper'
    } catch { return 'paper' }
  })
  const [error, setError] = useState(false)
  const choose = (next: NoteMaterial) => {
    setMaterial(next)
    try { localStorage.setItem(KEY, next); setError(false) }
    catch { setError(true) }
  }
  return { material, choose, error }
}
