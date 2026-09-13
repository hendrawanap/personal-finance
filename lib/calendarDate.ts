const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Convert local calendar dates into an inclusive start and exclusive end. */
export function calendarDateRangeToInstants(range: {
  from: string
  to: string
}): { from?: string; before?: string } {
  const afterTo = isCalendarDate(range.to)
    ? new Date(`${range.to}T00:00:00.000`)
    : null
  afterTo?.setDate(afterTo.getDate() + 1)

  return {
    ...(isCalendarDate(range.from)
      ? { from: new Date(`${range.from}T00:00:00.000`).toISOString() }
      : {}),
    ...(afterTo
      ? { before: afterTo.toISOString() }
      : {}),
  }
}
