import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const { calendarDateRangeToInstants, isCalendarDate } = createRequire(
  import.meta.url,
)('./calendarDate.ts') as typeof import('./calendarDate')

test('accepts real calendar dates and rejects impossible dates', () => {
  assert.equal(isCalendarDate('2026-09-04'), true)
  assert.equal(isCalendarDate('2026-02-29'), false)
  assert.equal(isCalendarDate('2026-9-4'), false)
})

test('turns a calendar range into inclusive local-day instants', () => {
  const range = calendarDateRangeToInstants({
    from: '2026-09-03',
    to: '2026-09-04',
  })
  const from = new Date(range.from!)
  const before = new Date(range.before!)

  assert.deepEqual(
    [from.getFullYear(), from.getMonth() + 1, from.getDate(), from.getHours()],
    [2026, 9, 3, 0],
  )
  assert.deepEqual(
    [
      before.getFullYear(),
      before.getMonth() + 1,
      before.getDate(),
      before.getHours(),
      before.getMinutes(),
      before.getSeconds(),
      before.getMilliseconds(),
    ],
    [2026, 9, 5, 0, 0, 0, 0],
  )
})
