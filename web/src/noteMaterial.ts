import { ui } from './interfaceLocale'
import { useState } from 'react'

export type NoteMaterial = 'paper' | 'frosted' | 'liquid'
const KEY = 'todo-sticky-note-material-v1'
export const NOTE_MATERIALS: { id: NoteMaterial; label: string; detail: string }[] = [
  { id: 'paper', get label(){ return ui("Paper") }, get detail(){ return ui("The familiar warm note") } },
  { id: 'frosted', get label(){ return ui("Frosted glass") }, get detail(){ return ui("Soft light, satin edges") } },
  { id: 'liquid', get label(){ return ui("Liquid glass") }, get detail(){ return ui("Flowing light, polished edges") } },
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
