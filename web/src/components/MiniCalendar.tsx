import { displayLanguage } from '../interfaceLocale'
import { enUS, zhCN, zhTW, zhHK, ja, ko, fr, de, es, pt } from 'react-day-picker/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

interface Props {
  selected: Date
  onSelect: (date: Date) => void
}

export function MiniCalendar({ selected, onSelect }: Props) {
  return (
    <DayPicker
      locale={({en:enUS,'zh-Hans':zhCN,'zh-Hant':zhTW,yue:zhHK,ja,ko,fr,de,es,pt} as Record<string,typeof enUS>)[displayLanguage()]}
      mode="single"
      required
      autoFocus
      defaultMonth={selected}
      selected={selected}
      onSelect={(day) => day && onSelect(day)}
      showOutsideDays
      fixedWeeks
    />
  )
}
