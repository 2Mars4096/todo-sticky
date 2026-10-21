import { useRef, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { format } from 'date-fns'
import { MiniCalendar } from './MiniCalendar'
import '../styles/settings-navigation.css'

interface Props {
  displayDate: string
  selectedDate: Date
  calendarOpen: boolean
  isCurrentDay: boolean
  onPrev: () => void
  onNext: () => void
  onToggleCalendar: () => void
  onSelectDate: (date: Date) => void
  onToday: () => void
  onCloseCalendar: () => void
}

export function DateHeader({
  displayDate, selectedDate, calendarOpen, isCurrentDay,
  onPrev, onNext,
  onToggleCalendar, onSelectDate, onToday, onCloseCalendar,
}: Props) {
  const calRef = useRef<HTMLDivElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const shortDate = format(selectedDate, selectedDate.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')

  const handleDragMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return

    const target = event.target as HTMLElement
    if (target.closest('button, input, textarea, select, label, .calendar-popup, [data-no-window-drag="true"]')) {
      return
    }

    event.preventDefault()
    void getCurrentWindow().startDragging().catch((error) => {
      console.error('Window drag failed', error)
    })
  }

  useEffect(() => {
    if (!calendarOpen) return
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        onCloseCalendar()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calendarOpen, onCloseCalendar])

  return (
    <div className="sticky-header compact-date-header" onMouseDown={handleDragMouseDown} onKeyDown={event => {
      if (event.key === 'Escape' && calendarOpen) {
        event.stopPropagation()
        onCloseCalendar()
        dateButtonRef.current?.focus()
      }
    }}>
      <div className="window-drag-bar" data-tauri-drag-region title="Drag window">
        <div className="window-drag-pill" />
      </div>
      <div className="date-nav">
        <button className="date-step" onClick={onPrev} title="Previous day" aria-label="Previous day">‹</button>
        <div className="date-title-slot" ref={calRef}>
          <button
            ref={dateButtonRef}
            className="date-title"
            onClick={onToggleCalendar}
            aria-expanded={calendarOpen}
            aria-label={`${displayDate}. Open calendar`}
            title={displayDate}
          >
            <span className="date-title-label">{isCurrentDay ? 'Today · ' : ''}{shortDate}</span>
            <span className="cal-chevron">{calendarOpen ? '▴' : '▾'}</span>
          </button>
          {calendarOpen && (
            <div className="calendar-popup">
              <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />
            </div>
          )}
        </div>
        <button className="date-step" onClick={onNext} title="Next day" aria-label="Next day">›</button>
      </div>
      {!isCurrentDay && <div className="header-row">
        <button className="today-jump" onClick={onToday}>Go to today</button>
      </div>}

    </div>
  )
}
