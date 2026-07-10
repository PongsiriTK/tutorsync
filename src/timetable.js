// Build a print-ready Thai "ตารางเรียน" (class timetable) as an HTML document,
// then open it for the browser to print / Save as PDF. Rendering in the browser
// (not jsPDF) gives correct Thai shaping (tone marks/vowels) and easy multi-page
// layout via CSS. One weekly day×time grid per page.
import { monthTH, dowFullTH } from './data.js'

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const startHM = (time) => { const m = String(time || '').split(/[–-]/)[0].trim().match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 9999 }
const statusTag = (s) => s === 'pending' ? 'รอยืนยัน' : (s === 'declined' ? 'ยกเลิก' : '')

// Monday-based column index (Mon=0 … Sun=6) and the Monday day-of-month of a date's week.
const mondayIndex = (dow) => (dow + 6) % 7

export function buildTimetableHTML(plan, year, month) {
  const cats = plan.categories || {}
  const sessions = (plan.sessions || []).slice().sort((a, b) => (a.day - b.day) || startHM(a.time) - startHM(b.time))
  const notes = plan.dayNotes || {}
  const dim = new Date(year, month + 1, 0).getDate()

  // distinct time slots (rows), sorted by start
  const slots = [...new Set(sessions.map((s) => s.time))].sort((a, b) => startHM(a) - startHM(b))

  // group session days into Monday-based weeks (keyed by the week's Monday date-of-month, may be ≤0)
  const weekKeys = new Set()
  const dayHasContent = (d) => sessions.some((s) => s.day === d) || (notes[d] && (notes[d].desc || (notes[d].checklist || []).length || (notes[d].links || []).length))
  for (let d = 1; d <= dim; d++) {
    if (!dayHasContent(d)) continue
    const dow = new Date(year, month, d).getDay()
    weekKeys.add(d - mondayIndex(dow))
  }
  const weeks = [...weekKeys].sort((a, b) => a - b)

  const dowShort = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] // Mon…Sun

  const legend = Object.keys(cats).map((k) => {
    const c = cats[k]
    const count = sessions.filter((s) => s.subj === k).length
    return `<span class="leg"><i style="background:${esc(c.color)}"></i>${esc(c.th || c.en)} <b>${count}/${c.target || '—'}</b></span>`
  }).join('')

  const cellFor = (dayNum, slot) => {
    const ss = sessions.filter((s) => s.day === dayNum && s.time === slot)
    if (!ss.length) return '<td class="empty"></td>'
    const inner = ss.map((s) => {
      const c = cats[s.subj] || {}
      const tag = statusTag(s.status)
      return `<div class="ses" style="background:${esc(c.soft || '#F4EFF7')};border-left:4px solid ${esc(c.color || '#B0A4BC')}">
        <div class="subj">${esc(c.th || c.en || '')}</div>
        <div class="meta">${esc(s.time)}${s.cost ? ' · ฿' + s.cost : ''}${tag ? ' · ' + esc(tag) : ''}</div>
      </div>`
    }).join('')
    return `<td>${inner}</td>`
  }

  const weekSections = weeks.map((mon, wi) => {
    // 7 columns Mon…Sun; compute each column's real date-of-month
    const colDays = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(year, month, mon + i)
      return { day: dt.getDate(), inMonth: dt.getMonth() === month && dt.getFullYear() === year }
    })
    const first = colDays.find((c) => c.inMonth) || colDays[0]
    const last = [...colDays].reverse().find((c) => c.inMonth) || colDays[6]
    const head = `<tr><th class="tcol">เวลา</th>${colDays.map((c, i) => `<th class="${c.inMonth ? '' : 'off'}"><div class="dname">${dowShort[i]}</div><div class="dnum">${c.inMonth ? c.day : ''}</div></th>`).join('')}</tr>`
    const rows = slots.map((slot) => `<tr><td class="tcol">${esc(slot)}</td>${colDays.map((c) => c.inMonth ? cellFor(c.day, slot) : '<td class="off"></td>').join('')}</tr>`).join('')

    // day notes within this week
    const weekNotes = colDays.filter((c) => c.inMonth && notes[c.day] && (notes[c.day].desc || (notes[c.day].checklist || []).length || (notes[c.day].links || []).length)).map((c) => {
      const n = notes[c.day]
      const chk = (n.checklist || []).map((x) => `<li>${x.done ? '☑' : '☐'} ${esc(x.text)}</li>`).join('')
      const lnk = (n.links || []).map((x) => `<li>🔗 ${esc(x.label || x.url)} — <span class="url">${esc(x.url)}</span></li>`).join('')
      return `<div class="note"><b>วันที่ ${c.day}</b>${n.desc ? ` — ${esc(n.desc)}` : ''}${chk || lnk ? `<ul>${chk}${lnk}</ul>` : ''}</div>`
    }).join('')

    return `<section class="week ${wi === 0 ? '' : 'page-break'}">
      <h2>สัปดาห์ที่ ${wi + 1} · วันที่ ${first.day}–${last.day} ${esc(monthTH[month])}</h2>
      <table class="grid"><thead>${head}</thead><tbody>${rows}</tbody></table>
      ${weekNotes ? `<div class="notes"><div class="notes-h">📝 หมายเหตุประจำวัน</div>${weekNotes}</div>` : ''}
    </section>`
  }).join('')

  const totalSess = sessions.length
  const spent = sessions.reduce((a, s) => a + (s.cost || 0), 0)
  const hours = sessions.reduce((a, s) => a + (s.hours || 0), 0)
  const genDate = new Date()

  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<title>ตารางเรียน — ${esc(plan.name || '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Thai+2:wght@500;700;800&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { --ink:#4A3F55; --muted:#8A7C93; }
  * { box-sizing:border-box; }
  html,body { margin:0; padding:0; }
  body { font-family:'Sarabun','Baloo Thai 2','Noto Sans Thai','Thonburi',sans-serif; color:var(--ink); background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .doc { max-width:940px; margin:0 auto; padding:28px 26px; }
  .cover { display:flex; align-items:center; gap:16px; border-bottom:3px solid #FFE0EA; padding-bottom:16px; }
  .cover .emoji { font-size:46px; }
  .cover h1 { font-family:'Baloo Thai 2',sans-serif; font-weight:800; font-size:30px; margin:0; line-height:1.1; }
  .cover .en { color:var(--muted); font-weight:600; font-size:14px; }
  .cover .sub { margin-top:4px; font-size:13px; color:var(--muted); font-weight:600; }
  .stats { display:flex; gap:22px; margin:14px 0 4px; flex-wrap:wrap; }
  .stat { font-size:13px; color:var(--muted); font-weight:600; } .stat b { color:var(--ink); font-size:16px; font-family:'Baloo Thai 2',sans-serif; }
  .legend { display:flex; flex-wrap:wrap; gap:8px 16px; margin:12px 0 4px; }
  .leg { font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px; } .leg i { width:12px; height:12px; border-radius:3px; display:inline-block; } .leg b { font-family:'Baloo Thai 2',sans-serif; }
  .week { margin-top:22px; } .week h2 { font-family:'Baloo Thai 2',sans-serif; font-weight:700; font-size:18px; margin:0 0 10px; color:var(--ink); }
  table.grid { width:100%; border-collapse:separate; border-spacing:0; }
  .grid th,.grid td { border:1px solid #EEE6F3; padding:5px; vertical-align:top; }
  .grid th { background:#FBF3F8; font-family:'Baloo Thai 2',sans-serif; font-weight:700; font-size:12px; text-align:center; }
  .grid th.off,.grid td.off { background:#FAFAFC; color:#C9BBD3; }
  .grid .tcol { background:#FBF3F8; font-weight:700; font-size:11px; width:78px; white-space:nowrap; text-align:center; color:var(--muted); }
  .grid .dname { font-size:12px; } .grid .dnum { font-size:11px; color:var(--muted); font-weight:600; }
  .grid td { height:46px; } .grid td.empty { background:#fff; }
  .ses { border-radius:8px; padding:5px 7px; margin-bottom:4px; }
  .ses .subj { font-weight:700; font-size:12px; line-height:1.2; } .ses .meta { font-size:10px; color:var(--muted); font-weight:600; margin-top:1px; }
  .notes { margin-top:12px; background:#FBF7FD; border:1px solid #F1E8F5; border-radius:10px; padding:10px 12px; }
  .notes-h { font-family:'Baloo Thai 2',sans-serif; font-weight:700; font-size:13px; margin-bottom:6px; }
  .note { font-size:12px; font-weight:600; margin:4px 0; } .note ul { margin:3px 0 0 4px; padding-left:16px; } .note li { font-size:11.5px; margin:1px 0; } .note .url { color:#8A6FD0; }
  .foot { margin-top:24px; border-top:1px solid #F1E8F5; padding-top:10px; font-size:11px; color:#C6B6D0; font-weight:600; text-align:center; }
  @page { size:A4; margin:12mm; }
  @media print { .page-break { page-break-before:always; } .no-print { display:none; } }
  .bar { position:sticky; top:0; background:#fff; padding:10px 0; text-align:center; }
  .bar button { font-family:'Baloo Thai 2',sans-serif; font-weight:800; font-size:14px; border:none; border-radius:14px; background:#FF8AA0; color:#fff; padding:11px 22px; cursor:pointer; box-shadow:0 8px 20px rgba(255,138,160,.4); }
</style></head>
<body>
  <div class="no-print bar"><button onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF · Print / Save PDF</button></div>
  <div class="doc">
    <div class="cover">
      <div class="emoji">${esc(plan.emoji || '🗓️')}</div>
      <div>
        <h1>ตารางเรียน · ${esc(plan.name || '')}</h1>
        <div class="en">${esc(plan.en || '')}</div>
        <div class="sub">ประจำเดือน${esc(monthTH[month])} พ.ศ. ${year + 543}</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat">คาบทั้งหมด <b>${totalSess}</b></div>
      <div class="stat">ชั่วโมงรวม <b>${hours}</b></div>
      <div class="stat">ค่าใช้จ่ายรวม <b>฿${spent.toLocaleString('en-US')}</b></div>
    </div>
    <div class="legend">${legend}</div>
    ${weekSections || '<p style="color:#8A7C93;margin-top:20px">ยังไม่มีคาบเรียนในเดือนนี้ · No sessions this month.</p>'}
    <div class="foot">สร้างโดย TutorSync 🗓️ · ${genDate.getDate()}/${genDate.getMonth() + 1}/${genDate.getFullYear() + 543}</div>
  </div>
</body></html>`
}

// Open the timetable in a new window for printing / Save as PDF.
export function openTimetablePrint(plan, year, month) {
  const html = buildTimetableHTML(plan, year, month)
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(html); w.document.close()
  return true
}
