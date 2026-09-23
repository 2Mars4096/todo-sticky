import { useState, useCallback, useEffect } from 'react'
import { format, addDays, subDays } from 'date-fns'

export function useCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [todayStr, setTodayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refreshToday = () => {
      clearTimeout(timer)
      const now = new Date()
      setTodayStr(format(now, 'yyyy-MM-dd'))

      // Local midnight follows DST. The minute cap also catches clock/timezone
      // changes and resume paths that do not dispatch a focus event.
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timer = setTimeout(refreshToday, Math.min(midnight.getTime() - now.getTime(), 60_000))
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshToday()
    }

    refreshToday()
    window.addEventListener('focus', refreshToday)
    window.addEventListener('pageshow', refreshToday)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refreshToday)
      window.removeEventListener('pageshow', refreshToday)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'EEEE, MMM d, yyyy')

  const goNext = useCallback(() => {
    setSelectedDate(d => addDays(d, 1))
  }, [])

  const goPrev = useCallback(() => {
    setSelectedDate(d => subDays(d, 1))
  }, [])

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date)
    setCalendarOpen(false)
  }, [])

  const goToday = useCallback(() => {
    setSelectedDate(new Date())
    setCalendarOpen(false)
  }, [])

  const toggleCalendar = useCallback(() => {
    setCalendarOpen(o => !o)
  }, [])

  return {
    selectedDate,
    dateStr,
    displayDate,
    calendarOpen,
    isCurrentDay: dateStr === todayStr,
    goNext,
    goPrev,
    goToDate,
    goToday,
    toggleCalendar,
    setCalendarOpen,
  }
}
