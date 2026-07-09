import { test, expect } from 'bun:test'
import { planToICS } from '../src/ics.js'

const plan = {
  id: 'p_test', name: 'Uni Prep', emoji: '📚',
  categories: { MATH: { th: 'คณิตศาสตร์', en: 'Mathematics', rate: 270 }, PHYS: { en: 'Physics', rate: 300 } },
  sessions: [
    { id: 1, day: 10, subj: 'MATH', time: '17:00–19:00', hours: 2, cost: 540, status: 'confirmed' },
    { id: 2, day: 12, subj: 'PHYS', time: '09:00–11:00', hours: 2, cost: 600, status: 'pending' },
    { id: 3, day: 14, subj: 'MATH', time: '15:00–17:00', hours: 2, cost: 540, status: 'declined' },
  ],
}
const NOW = Date.UTC(2026, 6, 9, 3, 0, 0) // fixed

test('valid VCALENDAR with one VEVENT per session', () => {
  const ics = planToICS(plan, 2026, 6, NOW)
  expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
  expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(3)
  expect(ics).toContain('X-WR-CALNAME:TutorSync · Uni Prep')
  expect(ics.includes('\r\n')).toBe(true) // CRLF line endings
})

test('Bangkok times convert to UTC (17:00 BKK → 10:00Z)', () => {
  const ics = planToICS(plan, 2026, 6, NOW)
  // day 10, 17:00 Asia/Bangkok = 10:00 UTC → 20260710T100000Z ; end 19:00 → 12:00Z
  expect(ics).toContain('DTSTART:20260710T100000Z')
  expect(ics).toContain('DTEND:20260710T120000Z')
})

test('status maps to CONFIRMED / TENTATIVE / CANCELLED', () => {
  const ics = planToICS(plan, 2026, 6, NOW)
  expect(ics).toContain('STATUS:CONFIRMED')
  expect(ics).toContain('STATUS:TENTATIVE') // pending
  expect(ics).toContain('STATUS:CANCELLED') // declined
})

test('summary carries emoji + category + plan; text is escaped', () => {
  const p = { ...plan, name: 'A, B; C', sessions: [plan.sessions[0]] }
  const ics = planToICS(p, 2026, 6, NOW)
  expect(ics).toContain('SUMMARY:📚 Mathematics · A\\, B\\; C')
})
