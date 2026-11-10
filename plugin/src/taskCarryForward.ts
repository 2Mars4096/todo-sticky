export type TaskCarryForwardTargetKind = 'today' | 'tomorrow' | 'next-day'

export interface TaskCarryForwardTarget {
  dateStr: string
  kind: TaskCarryForwardTargetKind
  actionLabel: string
}

function localDateStr(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function resolveTaskCarryForwardTarget(
  sourceDateStr: string,
  now = new Date(),
): TaskCarryForwardTarget {
  const todayStr = localDateStr(now)

  if (sourceDateStr < todayStr) {
    return {
      dateStr: todayStr,
      kind: 'today',
      actionLabel: 'today',
    }
  }

  const targetDate = parseLocalDate(sourceDateStr)
  targetDate.setDate(targetDate.getDate() + 1)

  if (sourceDateStr === todayStr) {
    return {
      dateStr: localDateStr(targetDate),
      kind: 'tomorrow',
      actionLabel: 'tomorrow',
    }
  }

  return {
    dateStr: localDateStr(targetDate),
    kind: 'next-day',
    actionLabel: 'the next day',
  }
}
