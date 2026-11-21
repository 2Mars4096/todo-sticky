import {hostLanguage,hostFormatLanguage} from '../interfaceLocale';
import { ui } from '../interfaceLocale'
import { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { MiniCalendar } from './MiniCalendar'
import '../styles/settings-navigation.css'

interface Props {
  projectBackLabel?: string
  onBackProject?: () => void
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
  projectBackLabel, onBackProject,
  displayDate, selectedDate, calendarOpen, isCurrentDay,
  onPrev, onNext,
  onToggleCalendar, onSelectDate, onToday, onCloseCalendar,
}: Props) {
  const calRef = useRef<HTMLDivElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const shortDate = hostLanguage()!=='en' ? new Intl.DateTimeFormat(hostFormatLanguage(),{weekday:'short',day:'numeric',month:'short'}).format(selectedDate) : format(selectedDate, selectedDate.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')

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
    <div className="sticky-header compact-date-header" onKeyDown={event => {
      if (event.key === 'Escape' && calendarOpen) {
        event.stopPropagation()
        onCloseCalendar()
        dateButtonRef.current?.focus()
      }
    }}>
      <div className="date-nav">
        <button className="date-step" onClick={onPrev} title={ui("Previous day")} aria-label={ui("Previous day")}>‹</button>
        <div className="date-title-slot" ref={calRef}>
          <button
            ref={dateButtonRef}
            className="date-title"
            onClick={onToggleCalendar}
            aria-expanded={calendarOpen}
            aria-label={ui("{0}. Open calendar", [displayDate])}
            title={ui("Task list for {0}. Deadlines are shown on each task.", [displayDate])}
          >
            <span className="date-title-label">{isCurrentDay ? ui("Today · ") : ''}{shortDate}</span>
            <span className="cal-chevron">{calendarOpen ? '▴' : '▾'}</span>
          </button>
          {calendarOpen && (
            <div className="calendar-popup">
              <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />
            </div>
          )}
        </div>
        <button className="date-step" onClick={onNext} title={ui("Next day")} aria-label={ui("Next day")}>›</button>
      </div>
      {(!isCurrentDay || projectBackLabel) && <div className="header-row">
        {projectBackLabel&&<button className="today-jump" onClick={onBackProject} aria-label={ui("Back to project {0}", [projectBackLabel])} title={projectBackLabel}>{ui("‹ Project")}</button>}
        {!isCurrentDay&&<button className="today-jump" onClick={onToday}>{ui("Go to today")}</button>}
      </div>}

    </div>
  )
}
