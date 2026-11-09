import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

interface Props {
  selected: Date
  onSelect: (date: Date) => void
}

export function MiniCalendar({ selected, onSelect }: Props) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(day) => day && onSelect(day)}
      showOutsideDays
      fixedWeeks
    />
  )
}
