import { formatLanguage } from '../interfaceLocale'
import { displayLanguage } from '../interfaceLocale'
import { InterfaceLanguage } from './InterfaceLanguage'
import { ui } from '../interfaceLocale'
import { createElement, useRef, useEffect, useId } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { format } from 'date-fns'
import { Chevron } from 'react-day-picker'
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
  const calendarId = useId()
  const calRef = useRef<HTMLDivElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const shortDate = displayLanguage() !== 'en' ? new Intl.DateTimeFormat(formatLanguage(),{weekday:'short',month:'short',day:'numeric',...(selectedDate.getFullYear() !== new Date().getFullYear()?{year:'numeric' as const}:{})}).format(selectedDate) : format(selectedDate, selectedDate.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')

  const handleDragMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (!isTauri() || event.button !== 0) return

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
      <div className="window-drag-bar" data-tauri-drag-region title={ui("Drag window")}>
        <div className="window-drag-pill" />
      </div>
      <div className="date-nav">
        {createElement('pipedreams-app-menu', {product: 'dockit', 'data-no-window-drag': 'true'})}
        <button className="date-step" onClick={onPrev} title={ui("Previous day")} aria-label={ui("Previous day")}><Chevron orientation="left" size={18}/></button>
        <div className="date-title-slot" ref={calRef} onBlur={event => {
          if (calendarOpen && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) onCloseCalendar()
        }}>
          <button
            ref={dateButtonRef}
            className="date-title"
            onClick={onToggleCalendar}
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
            aria-controls={calendarOpen ? calendarId : undefined}
            aria-label={ui("{0}. Open calendar", [displayDate])}
            title={ui("Task list for {0}. Deadlines are shown on each task.", [displayDate])}
          >
            <span className="date-title-label">{isCurrentDay ? ui("Today · ") : ''}{shortDate}</span>
            <Chevron className="cal-chevron" orientation={calendarOpen ? 'up' : 'down'} size={12}/>
          </button>
          {calendarOpen && (
            <div className="calendar-popup" id={calendarId} role="dialog" aria-label={ui("Choose notebook date")}>
              <MiniCalendar selected={selectedDate} onSelect={date => {
                if (date.toDateString() === selectedDate.toDateString()) onCloseCalendar()
                else onSelectDate(date)
                dateButtonRef.current?.focus({preventScroll:true})
              }} />
            </div>
          )}
        </div>
        <button className="date-step" onClick={onNext} title={ui("Next day")} aria-label={ui("Next day")}><Chevron orientation="right" size={18}/></button>
        <InterfaceLanguage/>
      </div>
      {(!isCurrentDay || projectBackLabel) && <div className="header-row">
        {projectBackLabel&&<button className="today-jump" onClick={onBackProject} aria-label={ui("Back to project {0}", [projectBackLabel])} title={projectBackLabel}>{ui("‹ Project")}</button>}
        {!isCurrentDay&&<button className="today-jump" onClick={onToday}>{ui("Go to today")}</button>}
      </div>}

    </div>
  )
}
