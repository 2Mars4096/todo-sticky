import { useState, useCallback } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'

export function useCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)

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
    isCurrentDay: isToday(selectedDate),
    goNext,
    goPrev,
    goToDate,
    goToday,
    toggleCalendar,
    setCalendarOpen,
  }
}
