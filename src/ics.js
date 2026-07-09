// iCalendar (.ics) generation — client mirror of server/src/ics.js. Keep in sync.
// Times are Asia/Bangkok (UTC+7, no DST); emitted as UTC (…Z) so any calendar
// app shows them at the right moment without a VTIMEZONE block.

const pad = (n) => String(n).padStart(2, '0')
const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

function utcStamp(y, mo, d, hh, mm) {
  const dt = new Date(Date.UTC(y, mo, d, hh - 7, mm, 0))
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
}
function stampNow(ms) {
  const dt = new Date(ms)
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`
}
export function parseRange(time) {
  const [a, b] = String(time || '').split(/[–-]/).map((s) => s.trim())
  const p = (x) => { const m = (x || '').match(/(\d{1,2}):(\d{2})/); return m ? { hh: +m[1], mm: +m[2] } : null }
  return { start: p(a), end: p(b) }
}

export function planToICS(plan, year, month, nowMs, opts = {}) {
  const calName = opts.calName || ('TutorSync · ' + (plan.name || 'Plan'))
  const dtstamp = stampNow(nowMs)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutorSync//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc(calName), 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ]
  for (const s of plan.sessions || []) {
    const cat = (plan.categories || {})[s.subj] || {}
    const r = parseRange(s.time); if (!r.start) continue
    const startMin = r.start.hh * 60 + r.start.mm
    let durMin = r.end ? (r.end.hh * 60 + r.end.mm - startMin) : (s.hours ? s.hours * 60 : 60)
    if (durMin <= 0) durMin = (s.hours || 1) * 60
    const endMin = startMin + durMin
    const status = s.status === 'pending' ? 'TENTATIVE' : (s.status === 'declined' ? 'CANCELLED' : 'CONFIRMED')
    const title = `${plan.emoji || '🗓️'} ${cat.en || cat.th || 'Session'} · ${plan.name || ''}`
    const desc = `${cat.th || ''}${cat.rate ? ' · ฿' + cat.rate + '/hr' : ''}${s.cost ? ' · ฿' + s.cost : ''} · TutorSync`
    lines.push(
      'BEGIN:VEVENT',
      `UID:ts-${plan.id || 'p'}-${s.id}@tutorsync`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${utcStamp(year, month, s.day, r.start.hh, r.start.mm)}`,
      `DTEND:${utcStamp(year, month, s.day, Math.floor(endMin / 60), endMin % 60)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `STATUS:${status}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

// A single session as a Google Calendar "create event" URL (prefilled composer).
export function googleEventUrl(plan, s, year, month) {
  const cat = (plan.categories || {})[s.subj] || {}
  const r = parseRange(s.time); if (!r.start) return null
  const startMin = r.start.hh * 60 + r.start.mm
  let durMin = r.end ? (r.end.hh * 60 + r.end.mm - startMin) : (s.hours ? s.hours * 60 : 60)
  if (durMin <= 0) durMin = (s.hours || 1) * 60
  const endMin = startMin + durMin
  const dates = `${utcStamp(year, month, s.day, r.start.hh, r.start.mm)}/${utcStamp(year, month, s.day, Math.floor(endMin / 60), endMin % 60)}`
  const text = `${plan.emoji || '🗓️'} ${cat.en || cat.th || 'Session'} · ${plan.name || ''}`
  const details = `${cat.th || ''}${cat.rate ? ' · ฿' + cat.rate + '/hr' : ''} · TutorSync`
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dates}&details=${encodeURIComponent(details)}`
}

// Trigger a browser download of an .ics file.
export function downloadICS(filename, text) {
  try {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) { /* noop */ }
}
