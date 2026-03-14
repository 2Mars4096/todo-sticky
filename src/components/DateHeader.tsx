import { useRef, useEffect } from 'react'
import type { ViewMode } from '../types'
import { MiniCalendar } from './MiniCalendar'

interface Props {
  displayDate: string
  selectedDate: Date
  calendarOpen: boolean
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToggleCalendar: () => void
  onSelectDate: (date: Date) => void
  onCloseCalendar: () => void
  onViewModeChange: (mode: ViewMode) => void
}

export function DateHeader({
  displayDate, selectedDate, calendarOpen,
  viewMode, onPrev, onNext,
  onToggleCalendar, onSelectDate, onCloseCalendar,
  onViewModeChange,
}: Props) {
  const calRef = useRef<HTMLDivElement>(null)

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
    <div className="sticky-header">
      <div className="window-drag-bar" data-tauri-drag-region>
        <div className="window-drag-pill" data-tauri-drag-region />
      </div>
      <div className="date-nav">
        <button onClick={onPrev} title="Previous day">‹</button>
        <div style={{ position: 'relative' }} ref={calRef}>
          <button className="date-title" onClick={onToggleCalendar}>
            {displayDate}
            <span className="cal-chevron">{calendarOpen ? '▴' : '▾'}</span>
          </button>
          {calendarOpen && (
            <div className="calendar-popup">
              <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />
            </div>
          )}
        </div>
        <button onClick={onNext} title="Next day">›</button>
      </div>
      <div className="header-row">
        <div />
        <div className="view-toggle">
          <button
            className={viewMode === 'all' ? 'active' : ''}
            onClick={() => onViewModeChange('all')}
          >
            All
          </button>
          <button
            className={viewMode === 'today' ? 'active' : ''}
            onClick={() => onViewModeChange('today')}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}
