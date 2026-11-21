import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** A compact field that grows with wrapped text, then scrolls within the note. */
export const ParagraphInput = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function ParagraphInput({ value, rows = 1, className = '', ...props }, forwardedRef) {
    const ref = useRef<HTMLTextAreaElement | null>(null)
    useLayoutEffect(() => {
      const field = ref.current
      if (!field) return
      const resize = () => {
        field.style.height = 'auto'
        const style = getComputedStyle(field)
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
        field.style.height = `${field.scrollHeight + (Number.isFinite(border) ? border : 0)}px`
      }
      resize()
      if (typeof ResizeObserver === 'undefined') return
      let width = field.clientWidth
      const observer = new ResizeObserver(() => {
        if (field.clientWidth !== width) { width = field.clientWidth; resize() }
      })
      observer.observe(field)
      return () => observer.disconnect()
    }, [value, rows])
    return <textarea {...props} rows={rows} value={value} className={`paragraph-input ${className}`}
      ref={node => {
        ref.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }} />
  },
)
