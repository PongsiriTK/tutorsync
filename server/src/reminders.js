// Reminder scheduling — pure, testable logic separated from delivery.
//
// Sessions carry a day-of-month and a time range ("17:00–19:00"); we resolve
// each to the NEXT upcoming occurrence of that day+start-time, then fire two
// reminders per session: one ~a day ahead and one shortly before it starts.

export const MIN = 60 * 1000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

// Reminder windows. A reminder of a given kind fires once when the time-until
// the session falls inside [lo, hi].
export const WINDOWS = [
  { kind: 'ahead', lo: 23 * HOUR, hi: 24 * HOUR, label: 'พรุ่งนี้', labelEn: 'tomorrow' },
  { kind: 'soon',  lo: 0,         hi: 60 * MIN,  label: 'อีกไม่นาน', labelEn: 'soon' },
]

export function parseStartHM(time) {
  const start = String(time || '').split(/[–-]/)[0].trim() // en-dash or hyphen
  const m = start.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return { h: Number(m[1]), m: Number(m[2]) }
}

// Next occurrence (>= now) of the given day-of-month at hh:mm. Tries this month,
// then rolls forward until it lands on a valid future date (handles month length).
export function nextOccurrence(nowMs, day, time) {
  const hm = parseStartHM(time)
  if (!hm || !day) return null
  const base = new Date(nowMs)
  for (let add = 0; add < 3; add++) {
    const y = base.getFullYear()
    const mo = base.getMonth() + add
    const dim = new Date(y, mo + 1, 0).getDate()
    if (day > dim) continue
    const t = new Date(y, mo, day, hm.h, hm.m, 0, 0).getTime()
    if (t >= nowMs) return t
  }
  return null
}

// entries: [{ email, planId, planName, session }]. sentHas(key) -> bool.
// Returns [{ key, email, planId, planName, session, start, window }].
export function computeDue(nowMs, entries, sentHas) {
  const due = []
  for (const e of entries) {
    const s = e.session
    const start = nextOccurrence(nowMs, s.day, s.time)
    if (start == null) continue
    const unts = start - nowMs
    for (const w of WINDOWS) {
      if (unts < w.lo || unts > w.hi) continue
      // include the occurrence date in the key so it re-arms for a future month
      const key = `${e.email}|${e.planId}|${s.id}|${w.kind}|${new Date(start).toISOString().slice(0, 10)}`
      if (sentHas(key)) continue
      due.push({ key, email: e.email, planId: e.planId, planName: e.planName, session: s, start, window: w })
    }
  }
  return due
}

export function reminderPayload(d, categories) {
  const cat = categories && categories[d.session.subj]
  const who = cat ? cat.en : 'session'
  const when = d.window.kind === 'ahead' ? d.window.label : 'วันนี้ ' + d.session.time.split(/[–-]/)[0]
  return {
    title: `TutorSync · ${d.window.kind === 'ahead' ? 'พรุ่งนี้มีคาบเรียน' : 'ใกล้ถึงเวลาเรียนแล้ว'} 🗓️`,
    body: `${cat ? cat.th + ' · ' : ''}${who} — ${when} (${d.planName})`,
    tag: d.key,
    url: '/',
  }
}
