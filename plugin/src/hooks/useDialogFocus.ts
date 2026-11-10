import { useEffect, useRef, type RefObject } from 'react'

interface DialogFocusOptions {
  enabled?: boolean
  initialFocusRef?: RefObject<HTMLElement>
  /** A stable caller-owned target when the original opener was removed. */
  returnFocus?: () => HTMLElement | null
}

const openDialogs: HTMLElement[] = []
const focusableSelector = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
  'summary', '[tabindex]', '[contenteditable="true"]',
].join(',')

function isAvailable(element: HTMLElement) {
  return !element.matches(':disabled')
    && !element.closest('[inert], [hidden], [aria-hidden="true"]')
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== 'hidden'
}

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => element.tabIndex >= 0 && isAvailable(element))
}

/** Keep keyboard focus in an open dialog and return it to its invoking control. */
export function useDialogFocus(onClose: () => void, options: DialogFocusOptions = {}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const optionsRef = useRef(options)
  closeRef.current = onClose
  optionsRef.current = options
  const enabled = options.enabled !== false

  useEffect(() => {
    const dialog = dialogRef.current
    if (!enabled || !dialog) return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    let lastFocused: HTMLElement | null = null
    openDialogs.push(dialog)
    const isTopDialog = () => openDialogs[openDialogs.length - 1] === dialog
    const focusFirst = () => {
      const preferred = optionsRef.current.initialFocusRef?.current
      const target = preferred && dialog.contains(preferred) && isAvailable(preferred)
        ? preferred
        : focusableElements(dialog)[0] ?? dialog
      target.focus({ preventScroll: true })
    }

    const frame = requestAnimationFrame(() => { if (isTopDialog()) focusFirst() })

    const handleFocus = (event: FocusEvent) => {
      if (!isTopDialog()) return
      if (event.target instanceof HTMLElement && dialog.contains(event.target)) {
        lastFocused = event.target
      } else if (lastFocused?.isConnected && isAvailable(lastFocused)) {
        lastFocused.focus({ preventScroll: true })
      } else {
        focusFirst()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog() || event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const controls = focusableElements(dialog)
      const first = controls[0]
      const last = controls[controls.length - 1]
      const current = document.activeElement
      if (!first) {
        event.preventDefault()
        dialog.focus()
      } else if (event.shiftKey && (current === first || current === dialog || !dialog.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('focusin', handleFocus)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('keydown', handleKeyDown)
      const wasTopDialog = isTopDialog()
      const index = openDialogs.lastIndexOf(dialog)
      if (index !== -1) openDialogs.splice(index, 1)
      if (!wasTopDialog) return
      if (previouslyFocused?.isConnected && isAvailable(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      } else {
        const fallback = optionsRef.current.returnFocus?.()
        if (fallback?.isConnected && !dialog.contains(fallback) && isAvailable(fallback)) {
          fallback.focus({ preventScroll: true })
        } else {
          const parentDialog = openDialogs[openDialogs.length - 1]
          if (parentDialog) (focusableElements(parentDialog)[0] ?? parentDialog).focus({ preventScroll: true })
        }
      }
    }
  }, [enabled])

  return dialogRef
}
