// iCalendar (.ics) generation for a plan's sessions.
// NOTE: mirrored on the client at src/ics.js — keep the two in sync.
//
// Times are Asia/Bangkok (UTC+7, no DST); we emit DTSTART/DTEND in UTC (…Z) so
// no VTIMEZONE is needed and any calendar app renders them at the right moment.

const pad = (n) => String(n).padStart(2, '0')
const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

function utcStamp(y, mo, d, hh, mm) {
  const dt = new Date(Date.UTC(y, mo, d, hh - 7, mm, 0)) // Bangkok(+7) → UTC
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
}
function stampNow(ms) {
  const dt = new Date(ms)
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`
}
function parseRange(time) {
  const [a, b] = String(time || '').split(/[–-]/).map((s) => s.trim())
  const p = (x) => { const m = (x || '').match(/(\d{1,2}):(\d{2})/); return m ? { hh: +m[1], mm: +m[2] } : null }
  return { start: p(a), end: p(b) }
}

// plan: the plan doc (with .categories and .sessions). year/month: the calendar
// month the day-of-month values belong to. nowMs: DTSTAMP source (Date.now()).
// render a day's notes (description + checklist + links) as a text block
function noteText(note) {
  if (!note) return ''
  const parts = []
  if (note.desc) parts.push(note.desc)
  for (const c of note.checklist || []) parts.push(`${c.done ? '[x]' : '[ ]'} ${c.text}`)
  for (const l of note.links || []) parts.push(`🔗 ${l.label || l.url}: ${l.url}`)
  return parts.join('\n')
}

export function planToICS(plan, year, month, nowMs, opts = {}) {
  const calName = opts.calName || ('TutorSync · ' + (plan.name || 'Plan'))
  const dtstamp = stampNow(nowMs)
  const notes = plan.dayNotes || {}
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutorSync//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc(calName), 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ]
  const daysWithSessions = new Set()
  for (const s of plan.sessions || []) {
    const cat = (plan.categories || {})[s.subj] || {}
    const r = parseRange(s.time); if (!r.start) continue
    daysWithSessions.add(s.day)
    const startMin = r.start.hh * 60 + r.start.mm
    let durMin = r.end ? (r.end.hh * 60 + r.end.mm - startMin) : (s.hours ? s.hours * 60 : 60)
    if (durMin <= 0) durMin = (s.hours || 1) * 60
    const endMin = startMin + durMin
    const dtStart = utcStamp(year, month, s.day, r.start.hh, r.start.mm)
    const dtEnd = utcStamp(year, month, s.day, Math.floor(endMin / 60), endMin % 60)
    const status = s.status === 'pending' ? 'TENTATIVE' : (s.status === 'declined' ? 'CANCELLED' : 'CONFIRMED')
    const title = `${plan.emoji || '🗓️'} ${cat.en || cat.th || 'Session'} · ${plan.name || ''}`
    const nt = noteText(notes[s.day])
    const desc = `${cat.th || ''}${cat.rate ? ' · ฿' + cat.rate + '/hr' : ''}${s.cost ? ' · ฿' + s.cost : ''} · TutorSync${nt ? '\n\n— วันนี้ · Day notes —\n' + nt : ''}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:ts-${plan.id || 'p'}-${s.id}@tutorsync`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `STATUS:${status}`,
      'END:VEVENT',
    )
  }
  // all-day event for days that have notes but no session, so the context isn't lost
  for (const dayKey of Object.keys(notes)) {
    const day = Number(dayKey)
    if (daysWithSessions.has(day)) continue
    const nt = noteText(notes[dayKey]); if (!nt) continue
    const ds = `${year}${pad(month + 1)}${pad(day)}`
    const de = new Date(Date.UTC(year, month, day + 1))
    lines.push(
      'BEGIN:VEVENT',
      `UID:ts-${plan.id || 'p'}-note-${day}@tutorsync`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${ds}`,
      `DTEND;VALUE=DATE:${de.getUTCFullYear()}${pad(de.getUTCMonth() + 1)}${pad(de.getUTCDate())}`,
      `SUMMARY:${esc('📝 ' + (plan.name || 'Notes') + ' · Day notes')}`,
      `DESCRIPTION:${esc(nt)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
