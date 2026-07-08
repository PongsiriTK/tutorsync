import { test, expect } from 'bun:test'
import { parseStartHM, nextOccurrence, computeDue, MIN, HOUR } from '../src/reminders.js'

test('parseStartHM handles en-dash and hyphen ranges', () => {
  expect(parseStartHM('17:00–19:00')).toEqual({ h: 17, m: 0 })
  expect(parseStartHM('09:30-11:00')).toEqual({ h: 9, m: 30 })
  expect(parseStartHM('nonsense')).toBeNull()
})

test('nextOccurrence returns the next future day+time, rolling months', () => {
  const now = new Date(2026, 6, 15, 12, 0, 0).getTime() // Jul 15 2026, noon
  // day 20 this month at 17:00 → still upcoming
  expect(nextOccurrence(now, 20, '17:00–19:00')).toBe(new Date(2026, 6, 20, 17, 0).getTime())
  // day 10 already passed this month → next month
  expect(nextOccurrence(now, 10, '17:00–19:00')).toBe(new Date(2026, 7, 10, 17, 0).getTime())
  // day 15 at 09:00 already passed today → next month
  expect(nextOccurrence(now, 15, '09:00–11:00')).toBe(new Date(2026, 7, 15, 9, 0).getTime())
})

test('computeDue fires "soon" within the hour and "ahead" ~a day out, once each', () => {
  const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
  const soonStart = new Date(2026, 6, 15, 12, 40).getTime()   // 40 min away → soon
  const aheadStart = new Date(2026, 6, 16, 11, 30).getTime()  // ~23.5h away → ahead
  const farStart = new Date(2026, 6, 20, 17, 0).getTime()     // days away → nothing

  const entries = [
    { email: 'a@x', planId: 'p1', planName: 'Uni', session: { id: 1, day: 15, time: '12:40–14:40', subj: 'MATH' } },
    { email: 'a@x', planId: 'p1', planName: 'Uni', session: { id: 2, day: 16, time: '11:30–13:30', subj: 'PHYS' } },
    { email: 'a@x', planId: 'p1', planName: 'Uni', session: { id: 3, day: 20, time: '17:00–19:00', subj: 'CHEM' } },
  ]
  const sent = new Set()
  const due = computeDue(now, entries, (k) => sent.has(k))
  const kinds = due.map((d) => `${d.session.id}:${d.window.kind}`).sort()
  expect(kinds).toEqual(['1:soon', '2:ahead'])

  // once marked, they don't re-fire
  due.forEach((d) => sent.add(d.key))
  expect(computeDue(now, entries, (k) => sent.has(k)).length).toBe(0)
})

test('computeDue ignores past sessions (they roll to next month, out of window)', () => {
  const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
  const entries = [{ email: 'a@x', planId: 'p1', planName: 'Uni', session: { id: 9, day: 3, time: '09:00–11:00', subj: 'MATH' } }]
  expect(computeDue(now, entries, () => false).length).toBe(0)
})
