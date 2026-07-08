import React from 'react'
import { sx } from '../util.js'

const scrim = (onClick, z) => <div onClick={onClick} style={sx(`position:absolute;inset:0;z-index:${z};background:rgba(74,63,85,.36);animation:ts-scrim .25s ease;`)} />
const grabber = (v) => v.desktop ? null : <div style={sx('width:44px;height:5px;border-radius:3px;background:#E8DCEF;margin:0 auto 12px;')} />
const lightGrabber = (v) => v.desktop ? null : <div style={sx('width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.6);margin:0 auto 12px;')} />
const closeBtn = (onClick) => <button onClick={onClick} aria-label="Close" style={sx('width:34px;height:34px;border:none;border-radius:13px;background:#F1E8F5;color:#8A7C93;font-size:18px;font-weight:800;cursor:pointer;')}>✕</button>
const sheetTitle = (text) => <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;")}>{text}</div>
const fieldLabel = (text, m = '16px 0 8px') => <div style={sx(`font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:#8A7C93;margin:${m};`)}>{text}</div>

// Bottom sheet on mobile; centered modal on desktop.
function SheetShell({ v, z, maxH = '92%', width = 480, extra = '', children }) {
  if (v.desktop) {
    return (
      <div style={sx(`position:absolute;inset:0;z-index:${z};display:flex;align-items:center;justify-content:center;padding:34px;pointer-events:none;`)}>
        <div style={sx(`pointer-events:auto;width:${width}px;max-width:100%;max-height:88vh;background:#FFF8FB;border-radius:30px;box-shadow:0 34px 90px rgba(74,63,85,.38);display:flex;flex-direction:column;overflow:hidden;animation:ts-pop .34s cubic-bezier(.34,1.56,.64,1) both;${extra}`)}>
          {children}
        </div>
      </div>
    )
  }
  return (
    <div style={sx(`position:absolute;left:0;right:0;bottom:0;z-index:${z};max-height:${maxH};background:#FFF8FB;border-radius:34px 34px 0 0;box-shadow:0 -14px 40px rgba(180,120,150,.3);display:flex;flex-direction:column;animation:ts-sheetUp .42s cubic-bezier(.34,1.56,.64,1);${extra}`)}>
      {children}
    </div>
  )
}

export function DaySheet({ v }) {
  return (
    <>
      {scrim(v.closeDay, 20)}
      <SheetShell v={v} z={21} maxH="80%">
        <div style={sx('padding:14px 22px 6px;flex:none;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            <div>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:21px;color:#4A3F55;")}>{v.dayLabelTH}</div>
              <div style={sx('font-size:12.5px;font-weight:700;color:#B0A4BC;')}>{v.dayLabelEN}</div>
            </div>
            {closeBtn(v.closeDay)}
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:8px 18px 20px;')}>
          {v.dayEmpty && (
            <div style={sx('text-align:center;padding:36px 20px;')}>
              <div style={sx('font-size:52px;animation:ts-bob 3s ease-in-out infinite;')}>🗓️</div>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#8A7C93;margin-top:8px;")}>ยังไม่มีคาบวันนี้</div>
              <div style={sx('font-size:12.5px;font-weight:700;color:#B8AAC4;')}>No sessions yet — add one below!</div>
            </div>
          )}
          <div style={sx('display:flex;flex-direction:column;gap:11px;')}>
            {v.daySessions.map((ds) => (
              <button key={ds.id} onClick={ds.onTap} style={sx(ds.cardStyle)}>
                <div style={sx(ds.stripeStyle)} />
                <div style={sx('flex:1;min-width:0;text-align:left;')}>
                  <div style={sx('display:flex;align-items:center;gap:7px;')}>
                    <span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;color:#4A3F55;")}>{ds.time}</span>
                    <span style={sx(ds.pillStyle)}>{ds.short}</span>
                  </div>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:600;font-size:14.5px;color:#4A3F55;margin-top:3px;line-height:1.1;")}>{ds.subjTh}</div>
                  <div style={sx('display:flex;align-items:center;gap:6px;margin-top:6px;')}>
                    <span style={sx(ds.insAvatar)}>{ds.insInitials}</span>
                    <span style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>{ds.insEn} · ฿{ds.cost}</span>
                  </div>
                </div>
                <div style={sx('text-align:right;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;')}>
                  {ds.hasReactions && <div style={sx('background:#F6EEFA;border-radius:12px;padding:4px 8px;font-size:12px;font-weight:800;color:#8A7C93;')}>{ds.reactSummary}</div>}
                  <span style={sx('color:#D7C8E0;font-size:18px;')}>›</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={v.openAddForDay} style={sx(`margin-top:14px;width:100%;border:2px dashed ${v.g.pcBorder};border-radius:20px;background:${v.g.pcSoft};color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:14px;cursor:pointer;`)}>＋ เพิ่มคาบ · Add session</button>
        </div>
      </SheetShell>
    </>
  )
}

export function SlotSheet({ v }) {
  const s = v.slot
  return (
    <>
      {scrim(v.closeSlot, 24)}
      <SheetShell v={v} z={25} maxH="90%">
        <div style={sx(s.headStyle)}>
          {lightGrabber(v)}
          <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;')}>
            <div>
              <span style={sx("display:inline-block;background:rgba(255,255,255,.28);color:#fff;border-radius:10px;padding:3px 10px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;")}>{s.short}</span>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#fff;margin-top:8px;line-height:1.1;")}>{s.subjTh}</div>
              <div style={sx('font-size:13px;font-weight:700;color:rgba(255,255,255,.9);')}>{s.subjEn}</div>
            </div>
            <button onClick={v.closeSlot} aria-label="Close" style={sx('width:34px;height:34px;border:none;border-radius:13px;background:rgba(255,255,255,.25);color:#fff;font-size:18px;font-weight:800;cursor:pointer;flex:none;')}>✕</button>
          </div>
          <div style={sx('display:flex;gap:16px;margin-top:14px;color:#fff;')}>
            <div><div style={sx('font-size:10.5px;font-weight:800;opacity:.85;')}>⏰ เวลา</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;")}>{s.time}</div></div>
            <div><div style={sx('font-size:10.5px;font-weight:800;opacity:.85;')}>📅 วันที่</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;")}>{s.dateShort}</div></div>
            <div><div style={sx('font-size:10.5px;font-weight:800;opacity:.85;')}>💸 ค่าใช้จ่าย</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;")}>฿{s.cost}</div></div>
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:16px 20px 22px;')}>
          <div style={sx('display:flex;align-items:center;gap:11px;background:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
            <span style={sx(s.insAvatar)}>{s.insInitials}</span>
            <div style={sx('flex:1;')}>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14.5px;color:#4A3F55;")}>{s.insTh} <span style={sx('font-size:11.5px;color:#B0A4BC;')}>{s.insEn}</span></div>
              <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>{s.rateLabel} · {s.hoursText}</div>
            </div>
          </div>
          {s.isFitness && (
            <div style={sx('display:flex;gap:8px;margin-top:10px;')}>
              <div style={sx('flex:1;background:#fff;border-radius:14px;padding:11px;text-align:center;box-shadow:0 4px 12px rgba(180,120,150,.09);')}><div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;')}>เซ็ต · SETS</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:18px;color:#4A3F55;")}>{s.sets}</div></div>
              <div style={sx('flex:1;background:#fff;border-radius:14px;padding:11px;text-align:center;box-shadow:0 4px 12px rgba(180,120,150,.09);')}><div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;')}>ครั้ง · REPS</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:18px;color:#4A3F55;")}>{s.reps}</div></div>
              <div style={sx('flex:1;background:#fff;border-radius:14px;padding:11px;text-align:center;box-shadow:0 4px 12px rgba(180,120,150,.09);')}><div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;')}>เข้มข้น · INT</div><div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;color:#4A3F55;margin-top:2px;")}>{s.intensity}</div></div>
            </div>
          )}
          <button onClick={v.rescheduleSlot} style={sx(`margin-top:12px;width:100%;border:2px solid ${v.g.pcBorder};border-radius:16px;background:#fff;color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;padding:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;`)}>🗓️ ย้ายวัน · Reschedule</button>
          <div style={sx("margin-top:18px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;")}>รีแอคชัน · React</div>
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;')}>
            {s.reactions.map((r, i) => <button key={'r' + i} onClick={r.onTap} style={sx(r.style)}><span style={sx('font-size:16px;')}>{r.emoji}</span> <span style={sx('font-weight:800;font-size:13px;')}>{r.count}</span></button>)}
            {s.palette.map((p, i) => <button key={'p' + i} onClick={p.onTap} style={sx('width:38px;height:34px;border:1.5px dashed #E3D6EC;border-radius:13px;background:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;')}>{p.emoji}</button>)}
          </div>
          <div style={sx("margin-top:20px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;")}>คอมเมนต์ · Comments</div>
          <div style={sx('display:flex;flex-direction:column;gap:10px;margin-top:10px;')}>
            {s.comments.map((c) => (
              <div key={c.key} style={sx('display:flex;gap:9px;animation:ts-fadeup .3s ease both;')}>
                <span style={sx(c.avatarStyle)}>{c.initials}</span>
                <div style={sx('flex:1;background:#fff;border-radius:14px 14px 14px 4px;padding:9px 13px;box-shadow:0 4px 12px rgba(180,120,150,.09);')}>
                  <div style={sx('display:flex;justify-content:space-between;align-items:baseline;')}>
                    <span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:#4A3F55;")}>{c.author}</span>
                    <span style={sx('font-size:10.5px;font-weight:700;color:#C6B6D0;')}>{c.time}</span>
                  </div>
                  <div style={sx('font-size:13px;font-weight:600;color:#5C5165;margin-top:2px;line-height:1.3;')}>{c.text}</div>
                </div>
              </div>
            ))}
            {s.noComments && <div style={sx('text-align:center;font-size:12.5px;font-weight:700;color:#C6B6D0;padding:6px;')}>ยังไม่มีคอมเมนต์ · Be the first 💬</div>}
          </div>
          <div style={sx('display:flex;gap:8px;align-items:center;margin-top:12px;background:#fff;border-radius:16px;padding:5px 5px 5px 14px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
            <input value={v.commentDraft} onChange={v.setCommentDraft} onKeyDown={v.commentKey} placeholder="เขียนคอมเมนต์…" style={sx("flex:1;border:none;outline:none;background:transparent;font-family:'Nunito',sans-serif;font-weight:700;font-size:13.5px;color:#4A3F55;min-width:0;")} />
            <button onClick={v.addComment} style={sx(`border:none;border-radius:12px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;padding:9px 15px;cursor:pointer;flex:none;`)}>ส่ง</button>
          </div>
        </div>
      </SheetShell>
    </>
  )
}

export function AddSheet({ v }) {
  return (
    <>
      {scrim(v.closeAdd, 28)}
      <SheetShell v={v} z={29} maxH="92%">
        <div style={sx('padding:14px 22px 4px;flex:none;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            {sheetTitle('เพิ่มคาบ ✏️')}
            {closeBtn(v.closeAdd)}
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:10px 20px 16px;')}>
          {fieldLabel('ประเภท · Category', '0 0 8px')}
          <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:9px;')}>
            {v.addSubjects.map((a) => (
              <button key={a.key} onClick={a.onTap} style={sx(a.style)}>
                <span style={sx(a.dotStyle)} />
                <div style={sx('text-align:left;min-width:0;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#4A3F55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{a.en}</div>
                  <div style={sx('font-size:10.5px;font-weight:700;color:#B0A4BC;')}>{a.rateLabel}</div>
                </div>
              </button>
            ))}
          </div>
          {fieldLabel('วันที่ · Date')}
          <div style={sx('display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;')}>
            {v.addDays.map((d) => (
              <button key={d.num} onClick={d.onTap} style={sx(d.style)}>
                <div style={sx('font-size:10px;font-weight:800;opacity:.7;')}>{d.dow}</div>
                <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:18px;")}>{d.num}</div>
              </button>
            ))}
          </div>
          {fieldLabel('เวลา · Time')}
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;')}>
            {v.addTimes.map((t, i) => <button key={i} onClick={t.onTap} style={sx(t.style)}>{t.label}</button>)}
          </div>
          {fieldLabel(v.addHoursLabel)}
          <div style={sx('display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:10px 16px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
            <button onClick={v.decHours} style={sx('width:38px;height:38px;border:none;border-radius:13px;background:#F1E8F5;color:#8A7C93;font-size:22px;font-weight:800;cursor:pointer;')}>−</button>
            <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:22px;color:#4A3F55;")}>{v.addHoursText}</div>
            <button onClick={v.incHours} style={sx('width:38px;height:38px;border:none;border-radius:13px;background:#F1E8F5;color:#8A7C93;font-size:22px;font-weight:800;cursor:pointer;')}>＋</button>
          </div>

          {v.isFitnessAdd && (
            <>
              {fieldLabel('ความเข้มข้น · Intensity 🔥')}
              <div style={sx('display:flex;gap:8px;')}>
                {v.intensityOpts.map((io, i) => <button key={i} onClick={io.onTap} style={sx(io.style)}>{io.label}</button>)}
              </div>
              <div style={sx('display:flex;gap:12px;margin-top:14px;')}>
                <div style={sx('flex:1;')}>
                  {fieldLabel('เซ็ต · Sets', '0 0 8px')}
                  <div style={sx('display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
                    <button onClick={v.decSets} style={sx('width:32px;height:32px;border:none;border-radius:11px;background:#F1E8F5;color:#8A7C93;font-size:19px;font-weight:800;cursor:pointer;')}>−</button>
                    <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;color:#4A3F55;")}>{v.addSets}</div>
                    <button onClick={v.incSets} style={sx('width:32px;height:32px;border:none;border-radius:11px;background:#F1E8F5;color:#8A7C93;font-size:19px;font-weight:800;cursor:pointer;')}>＋</button>
                  </div>
                </div>
                <div style={sx('flex:1;')}>
                  {fieldLabel('ครั้ง/เซ็ต · Reps', '0 0 8px')}
                  <div style={sx('display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
                    <button onClick={v.decReps} style={sx('width:32px;height:32px;border:none;border-radius:11px;background:#F1E8F5;color:#8A7C93;font-size:19px;font-weight:800;cursor:pointer;')}>−</button>
                    <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;color:#4A3F55;")}>{v.addReps}</div>
                    <button onClick={v.incReps} style={sx('width:32px;height:32px;border:none;border-radius:11px;background:#F1E8F5;color:#8A7C93;font-size:19px;font-weight:800;cursor:pointer;')}>＋</button>
                  </div>
                </div>
              </div>
            </>
          )}
          <div style={sx(`margin-top:16px;background:${v.g.pcSoft};border-radius:20px;padding:16px 18px;`)}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;')}>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;")}>{v.addMetricLabel}</div>
              <div style={sx(`font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:${v.g.pc};`)}>{v.addMetricValue}</div>
            </div>
            <div style={sx('margin-top:10px;height:8px;border-radius:6px;background:rgba(255,255,255,.7);overflow:hidden;')}><div style={sx(v.addBudgetBarStyle)} /></div>
            <div style={sx('font-size:11.5px;font-weight:800;color:#8A7C93;margin-top:7px;')}>{v.addBudgetText}</div>
          </div>
        </div>
        <div style={sx('flex:none;padding:12px 20px 22px;background:#FFF8FB;')}>
          <button onClick={v.saveSession} style={sx(`width:100%;border:none;border-radius:20px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:17px;padding:16px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};`)}>บันทึกคาบ · Book session 🎉</button>
        </div>
      </SheetShell>
    </>
  )
}

// Post-booking confirmation (Peloton "Added to your schedule" pattern)
export function BookedConfirm({ v }) {
  const b = v.booked
  return (
    <div onClick={v.closeBooked} style={sx('position:absolute;inset:0;z-index:46;background:rgba(74,63,85,.42);animation:ts-scrim .2s ease;display:flex;align-items:center;justify-content:center;padding:0 34px;')}>
      <div onClick={v.stop} style={sx('width:100%;max-width:400px;background:#FFF8FB;border-radius:28px;padding:26px 22px 20px;box-shadow:0 22px 50px rgba(180,120,150,.35);animation:ts-pop .38s cubic-bezier(.34,1.56,.64,1) both;text-align:center;')}>
        <div style={sx('font-size:52px;animation:ts-bob 2.6s ease-in-out infinite;')}>🎉</div>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;margin-top:8px;")}>จองคาบแล้ว!</div>
        <div style={sx('font-size:12.5px;font-weight:700;color:#B0A4BC;margin-top:2px;')}>Added to your calendar</div>
        <div style={sx('margin-top:14px;')}><span style={sx(b.chipStyle)}>{b.short}</span></div>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;color:#4A3F55;margin-top:8px;")}>{b.title}</div>
        <div style={sx('font-size:13px;font-weight:700;color:#8A7C93;margin-top:3px;')}>{b.sub}</div>
        <div style={sx('font-size:12px;font-weight:700;color:#B0A4BC;margin-top:2px;')}>{b.meta}</div>
        <div style={sx('display:flex;gap:10px;margin-top:20px;')}>
          <button onClick={v.closeBooked} style={sx("flex:1;border:none;border-radius:16px;background:#F1E8F5;color:#8A7C93;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14.5px;padding:14px;cursor:pointer;")}>เสร็จสิ้น</button>
          <button onClick={v.viewBookedDay} style={sx(`flex:1.5;border:none;border-radius:16px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14.5px;padding:14px;cursor:pointer;box-shadow:0 10px 22px ${v.g.pcShadow};`)}>ดูวันนั้น · View day 🗓️</button>
        </div>
      </div>
    </div>
  )
}

export function CreateSheet({ v }) {
  return (
    <>
      {scrim(v.closeCreate, 34)}
      <SheetShell v={v} z={35} maxH="94%" width={520}>
        <div style={sx('padding:14px 22px 4px;flex:none;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            {sheetTitle('เป้าหมายใหม่ 🎯')}
            {closeBtn(v.closeCreate)}
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:8px 20px 16px;')}>
          {fieldLabel('แม่แบบ · Start from ✨', '0 0 8px')}
          <div style={sx('display:flex;gap:10px;overflow-x:auto;padding:2px 2px 6px;')}>
            {v.templates.map((tp) => (
              <button key={tp.key} onClick={tp.onTap} style={sx(tp.style)}>
                <div style={sx(tp.iconStyle)}>{tp.emoji}</div>
                <div style={sx(tp.labelStyle)}>{tp.label}</div>
                <div style={sx(tp.vibeStyle)}>{tp.vibe}</div>
              </button>
            ))}
          </div>

          {fieldLabel('ชื่อเป้าหมาย · Goal name')}
          <input value={v.ngName} onChange={v.setNgName} placeholder="เช่น ติวสอบเข้ามหาลัย" style={sx("width:100%;border:2px solid #EEE6F3;border-radius:16px;background:#fff;padding:13px 15px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#4A3F55;outline:none;")} />

          {fieldLabel('ชนิดของเป้าหมาย · Goal type')}
          <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:9px;')}>
            {v.goalTypeCards.map((gt) => (
              <button key={gt.key} onClick={gt.onTap} style={sx(gt.style)}>
                <span style={sx('font-size:22px;')}>{gt.emoji}</span>
                <div style={sx('text-align:left;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;color:#4A3F55;")}>{gt.title}</div>
                  <div style={sx('font-size:10.5px;font-weight:700;color:#B0A4BC;line-height:1.15;')}>{gt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {fieldLabel(v.targetLabel)}
          <div style={sx('display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 6px 16px rgba(180,120,150,.1);margin-bottom:9px;')}>
            <button onClick={v.decNgTarget} style={sx('width:36px;height:36px;border:none;border-radius:12px;background:#F1E8F5;color:#8A7C93;font-size:20px;font-weight:800;cursor:pointer;flex:none;')}>−</button>
            <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;")}>{v.ngTargetText}</div>
            <button onClick={v.incNgTarget} style={sx(`width:36px;height:36px;border:none;border-radius:12px;background:${v.g.pcSoft};color:${v.g.pc};font-size:20px;font-weight:800;cursor:pointer;flex:none;`)}>＋</button>
          </div>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;')}>
            {v.targetOptions.map((to, i) => <button key={i} onClick={to.onTap} style={sx(to.style)}>{to.label}</button>)}
          </div>

          {fieldLabel('สี & ไอคอน · Look')}
          <div style={sx('display:flex;align-items:center;gap:12px;')}>
            <div style={sx('display:flex;gap:9px;')}>
              {v.createThemes.map((ct) => <button key={ct.key} onClick={ct.onTap} style={sx(ct.style)}>{ct.active && <span style={sx('color:#fff;font-size:15px;font-weight:800;')}>✓</span>}</button>)}
            </div>
            <div style={sx('width:1px;height:30px;background:#EEE6F3;')} />
            <div style={sx('display:flex;gap:7px;')}>
              {v.createEmojis.map((ce, i) => <button key={i} onClick={ce.onTap} style={sx(ce.style)}>{ce.emoji}</button>)}
            </div>
          </div>
        </div>
        <div style={sx('flex:none;padding:12px 20px 22px;background:#FFF8FB;')}>
          <button onClick={v.createPlan} style={sx(`width:100%;border:none;border-radius:20px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:17px;padding:16px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};`)}>สร้างเป้าหมาย · Create goal ✨</button>
        </div>
      </SheetShell>
    </>
  )
}

export function MarketSheet({ v }) {
  const m = v.mkd
  return (
    <>
      {scrim(v.closeMarket, 36)}
      <SheetShell v={v} z={37} maxH="90%">
        <div style={sx(m.headStyle)}>
          {lightGrabber(v)}
          <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;')}>
            <div style={sx('display:flex;align-items:center;gap:13px;')}>
              <div style={sx('width:56px;height:56px;border-radius:20px;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:30px;')}>{m.emoji}</div>
              <div>
                <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#fff;line-height:1.1;")}>{m.name}</div>
                <div style={sx('font-size:12.5px;font-weight:700;color:rgba(255,255,255,.9);')}>{m.en}</div>
              </div>
            </div>
            <button onClick={v.closeMarket} aria-label="Close" style={sx('width:34px;height:34px;border:none;border-radius:13px;background:rgba(255,255,255,.25);color:#fff;font-size:18px;font-weight:800;cursor:pointer;flex:none;')}>✕</button>
          </div>
          <div style={sx('display:flex;gap:8px;margin-top:14px;')}>
            <span style={sx("background:rgba(255,255,255,.25);color:#fff;border-radius:11px;padding:5px 11px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;")}>{m.typeLabel}</span>
            <span style={sx("background:rgba(255,255,255,.25);color:#fff;border-radius:11px;padding:5px 11px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;")}>❤️ {m.likes}</span>
            <span style={sx("background:rgba(255,255,255,.25);color:#fff;border-radius:11px;padding:5px 11px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;")}>⬇ {m.uses}</span>
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:16px 20px 18px;')}>
          <div style={sx('display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:11px 14px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
            <span style={sx(m.authorAvatar)}>{m.authorInitials}</span>
            <div style={sx('flex:1;')}>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#4A3F55;")}>{m.author}</div>
              <div style={sx('font-size:11px;font-weight:700;color:#B0A4BC;')}>ผู้สร้างแพลน · Creator</div>
            </div>
            <button onClick={v.likeMarket} style={sx(`border:none;border-radius:13px;background:${m.soft};color:${m.color};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;padding:9px 14px;cursor:pointer;`)}>❤️ ถูกใจ</button>
          </div>
          <div style={sx('font-size:13.5px;font-weight:700;color:#5C5165;margin-top:14px;line-height:1.45;')}>{m.desc}</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;margin:18px 0 10px;")}>รวม {m.catCount} หมวด · Includes</div>
          <div style={sx('display:flex;flex-direction:column;gap:9px;')}>
            {m.cats.map((c, i) => (
              <div key={i} style={sx('display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 6px 16px rgba(180,120,150,.09);')}>
                <span style={sx(`width:13px;height:13px;border-radius:5px;background:${c.color};flex:none;`)} />
                <div style={sx('flex:1;')}><span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13.5px;color:#4A3F55;")}>{c.en}</span></div>
                <span style={sx(`font-size:12px;font-weight:800;color:${c.color};`)}>เป้า {c.target} คาบ</span>
              </div>
            ))}
          </div>
        </div>
        <div style={sx('flex:none;padding:12px 20px 22px;background:#FFF8FB;')}>
          <button onClick={v.copyMarket} style={sx(`width:100%;border:none;border-radius:20px;background:${m.color};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:17px;padding:16px;cursor:pointer;box-shadow:0 12px 26px ${m.shadow};`)}>⬇ คัดลอกไปยังของฉัน · Copy to my plans</button>
        </div>
      </SheetShell>
    </>
  )
}

export function PlanEditSheet({ v }) {
  return (
    <>
      {scrim(v.closePlanEdit, 42)}
      <SheetShell v={v} z={43} maxH="94%" width={540}>
        <div style={sx('padding:14px 22px 4px;flex:none;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            {sheetTitle('ตั้งค่าแพลน ⚙️')}
            {closeBtn(v.closePlanEdit)}
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:8px 20px 16px;')}>
          {fieldLabel('ชื่อแพลน · Plan name', '0 0 8px')}
          <input value={v.ed.name} onChange={v.setEdName} style={sx("width:100%;border:2px solid #EEE6F3;border-radius:16px;background:#fff;padding:13px 15px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#4A3F55;outline:none;")} />

          {fieldLabel('สี & ไอคอน · Look')}
          <div style={sx('display:flex;align-items:center;gap:12px;')}>
            <div style={sx('display:flex;gap:9px;')}>
              {v.edThemes.map((ct) => <button key={ct.key} onClick={ct.onTap} style={sx(ct.style)}>{ct.active && <span style={sx('color:#fff;font-size:15px;font-weight:800;')}>✓</span>}</button>)}
            </div>
            <div style={sx('width:1px;height:30px;background:#EEE6F3;')} />
            <div style={sx('display:flex;gap:7px;')}>
              {v.edEmojis.map((ce, i) => <button key={i} onClick={ce.onTap} style={sx(ce.style)}>{ce.emoji}</button>)}
            </div>
          </div>

          {fieldLabel('ชนิดเป้าหมาย · Goal type')}
          <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:9px;')}>
            {v.edTypeCards.map((gt) => (
              <button key={gt.key} onClick={gt.onTap} style={sx(gt.style)}>
                <span style={sx('font-size:22px;')}>{gt.emoji}</span>
                <div style={sx('text-align:left;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;color:#4A3F55;")}>{gt.title}</div>
                  <div style={sx('font-size:10.5px;font-weight:700;color:#B0A4BC;')}>{gt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {fieldLabel(v.edTargetLabel)}
          <div style={sx('display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 6px 16px rgba(180,120,150,.1);margin-bottom:9px;')}>
            <button onClick={v.decEdTarget} style={sx('width:36px;height:36px;border:none;border-radius:12px;background:#F1E8F5;color:#8A7C93;font-size:20px;font-weight:800;cursor:pointer;flex:none;')}>−</button>
            <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;")}>{v.edTargetText}</div>
            <button onClick={v.incEdTarget} style={sx(`width:36px;height:36px;border:none;border-radius:12px;background:${v.g.pcSoft};color:${v.g.pc};font-size:20px;font-weight:800;cursor:pointer;flex:none;`)}>＋</button>
          </div>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;')}>
            {v.edTargetOptions.map((to, i) => <button key={i} onClick={to.onTap} style={sx(to.style)}>{to.label}</button>)}
          </div>

          <div style={sx('display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px;')}>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:#8A7C93;")}>หมวดในปฏิทิน · Calendar categories</div>
            <button onClick={v.addCat} style={sx(`border:none;border-radius:11px;background:${v.g.pcSoft};color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;padding:6px 11px;cursor:pointer;`)}>＋ เพิ่ม</button>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:11px;')}>
            {v.edCats.map((c) => (
              <div key={c.key} style={sx('background:#fff;border-radius:18px;padding:13px 14px;box-shadow:0 6px 16px rgba(180,120,150,.09);')}>
                <div style={sx('display:flex;align-items:center;gap:10px;')}>
                  <span style={sx(c.dotStyle)} />
                  <input value={c.en} onChange={c.setName} style={sx("flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#4A3F55;")} />
                  <button onClick={c.remove} aria-label="Remove" style={sx('width:28px;height:28px;border:none;border-radius:10px;background:#FBEAF0;color:#E77;font-size:15px;font-weight:800;cursor:pointer;flex:none;')}>✕</button>
                </div>
                <div style={sx('display:flex;gap:8px;margin-top:10px;')}>
                  <div style={sx('display:flex;gap:6px;flex:1;align-items:center;')}>
                    {c.colors.map((cc) => <button key={cc.key} onClick={cc.onTap} style={sx(cc.style)} />)}
                  </div>
                </div>
                <div style={sx('display:flex;gap:5px;margin-top:11px;background:#F4EFF7;border-radius:12px;padding:4px;')}>
                  {c.units.map((u) => <button key={u.key} onClick={u.onTap} style={sx(u.style)}>{u.label}</button>)}
                </div>
                <div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;margin:11px 0 6px;')}>ผู้สอน · Taught by</div>
                <div style={sx('display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;')}>
                  {c.tutors.map((tu) => (
                    <button key={tu.key} onClick={tu.onTap} style={sx(tu.style)}>
                      <span style={sx(tu.avatarStyle)}>{tu.initials}</span>
                      <span style={sx(tu.nameStyle)}>{tu.name}</span>
                    </button>
                  ))}
                </div>
                <div style={sx('display:flex;gap:10px;margin-top:11px;')}>
                  {c.isFree && (
                    <div style={sx("flex:1;display:flex;align-items:center;justify-content:center;background:#EAF8F2;border-radius:12px;padding:12px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;color:#4FC7A8;")}>🎁 ฟรี · No cost</div>
                  )}
                  {c.paid && (
                    <div style={sx('flex:1;')}>
                      <div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;margin-bottom:5px;')}>{c.rateLabel}</div>
                      <div style={sx('display:flex;align-items:center;gap:8px;background:#F8F3FA;border-radius:12px;padding:6px 10px;')}>
                        <button onClick={c.rateDown} style={sx('width:26px;height:26px;border:none;border-radius:9px;background:#fff;color:#8A7C93;font-size:16px;font-weight:800;cursor:pointer;')}>−</button>
                        <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;color:#4A3F55;")}>฿{c.rate}</div>
                        <button onClick={c.rateUp} style={sx('width:26px;height:26px;border:none;border-radius:9px;background:#fff;color:#8A7C93;font-size:16px;font-weight:800;cursor:pointer;')}>＋</button>
                      </div>
                    </div>
                  )}
                  <div style={sx('flex:1;')}>
                    <div style={sx('font-size:10.5px;font-weight:800;color:#B0A4BC;margin-bottom:5px;')}>เป้าคาบ · Target</div>
                    <div style={sx('display:flex;align-items:center;gap:8px;background:#F8F3FA;border-radius:12px;padding:6px 10px;')}>
                      <button onClick={c.targetDown} style={sx('width:26px;height:26px;border:none;border-radius:9px;background:#fff;color:#8A7C93;font-size:16px;font-weight:800;cursor:pointer;')}>−</button>
                      <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;color:#4A3F55;")}>{c.target}</div>
                      <button onClick={c.targetUp} style={sx('width:26px;height:26px;border:none;border-radius:9px;background:#fff;color:#8A7C93;font-size:16px;font-weight:800;cursor:pointer;')}>＋</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={v.deletePlan} style={sx("margin-top:18px;width:100%;border:2px solid #F6D5DF;border-radius:16px;background:#fff;color:#E06B85;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;padding:13px;cursor:pointer;")}>🗑️ ลบแพลนนี้ · Delete plan</button>
        </div>
        <div style={sx('flex:none;padding:12px 20px 22px;background:#FFF8FB;')}>
          <button onClick={v.savePlanEdit} style={sx(`width:100%;border:none;border-radius:20px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:17px;padding:16px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};`)}>บันทึกการตั้งค่า · Save changes ✨</button>
        </div>
      </SheetShell>
    </>
  )
}

export function EditTargetSheet({ v }) {
  return (
    <>
      {scrim(v.closeEditTarget, 38)}
      <SheetShell v={v} z={39} maxH="none" extra={v.desktop ? '' : 'padding-bottom:22px;'}>
        <div style={sx('padding:14px 22px 4px;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;color:#4A3F55;")}>แก้ไขเป้าหมาย ✎</div>
            {closeBtn(v.closeEditTarget)}
          </div>
        </div>
        <div style={sx(`padding:8px 20px ${v.desktop ? '22px' : '4px'};`)}>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:#8A7C93;margin-bottom:9px;")}>{v.editTargetLabel}</div>
          <div style={sx('display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:8px 12px;box-shadow:0 6px 16px rgba(180,120,150,.1);margin-bottom:9px;')}>
            <button onClick={v.decEditTarget} style={sx('width:36px;height:36px;border:none;border-radius:12px;background:#F1E8F5;color:#8A7C93;font-size:20px;font-weight:800;cursor:pointer;flex:none;')}>−</button>
            <div style={sx("flex:1;text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;")}>{v.editTargetText}</div>
            <button onClick={v.incEditTarget} style={sx(`width:36px;height:36px;border:none;border-radius:12px;background:${v.g.pcSoft};color:${v.g.pc};font-size:20px;font-weight:800;cursor:pointer;flex:none;`)}>＋</button>
          </div>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap;')}>
            {v.editTargetOptions.map((eo, i) => <button key={i} onClick={eo.onTap} style={sx(eo.style)}>{eo.label}</button>)}
          </div>
          <button onClick={v.saveEditTarget} style={sx(`margin-top:18px;width:100%;border:none;border-radius:18px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;padding:15px;cursor:pointer;box-shadow:0 10px 24px ${v.g.pcShadow};`)}>บันทึก · Save target</button>
        </div>
      </SheetShell>
    </>
  )
}

export function PublishSheet({ v }) {
  return (
    <>
      {scrim(v.closePublish, 40)}
      <SheetShell v={v} z={41} maxH="none" extra="padding:14px 22px 24px;">
        <div style={sx(`width:44px;height:5px;border-radius:3px;background:#E8DCEF;margin:0 auto 14px;${v.desktop ? 'display:none;' : ''}`)} />
        <div style={sx('text-align:center;')}>
          <div style={sx('font-size:52px;')}>📤</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;margin-top:6px;")}>เผยแพร่สู่มาร์เก็ต?</div>
          <div style={sx('font-size:13px;font-weight:700;color:#B0A4BC;margin-top:4px;line-height:1.4;padding:0 10px;')}>แชร์โครงสร้างเป้าหมายนี้ให้คนอื่นคัดลอกไปใช้ (คาบเรียนและคอมเมนต์จะไม่ถูกแชร์) · Share this goal's structure — your sessions stay private.</div>
        </div>
        <div style={sx('display:flex;gap:10px;margin-top:20px;')}>
          <button onClick={v.closePublish} style={sx("flex:1;border:none;border-radius:18px;background:#F1E8F5;color:#8A7C93;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:15px;cursor:pointer;")}>ยกเลิก</button>
          <button onClick={v.doPublish} style={sx(`flex:1.6;border:none;border-radius:18px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:15px;cursor:pointer;box-shadow:0 10px 24px ${v.g.pcShadow};`)}>เผยแพร่เลย 🚀</button>
        </div>
      </SheetShell>
    </>
  )
}

export function SettingsSheet({ v }) {
  return (
    <>
      {scrim(v.closeSettings, 32)}
      <SheetShell v={v} z={33} maxH="80%">
        <div style={sx('padding:14px 22px 6px;flex:none;')}>
          {grabber(v)}
          <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
            {sheetTitle('ตั้งค่า · Settings')}
            {closeBtn(v.closeSettings)}
          </div>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:8px 20px 24px;')}>
          <div style={sx('display:flex;align-items:center;gap:13px;background:#fff;border-radius:20px;padding:14px 16px;box-shadow:0 8px 20px rgba(180,120,150,.1);')}>
            <div style={sx(`width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,${v.g.pc},${v.g.pc2});display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;`)}>{v.profileInitial}</div>
            <div>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;color:#4A3F55;")}>{v.profileName}</div>
              <div style={sx('font-size:12px;font-weight:700;color:#B0A4BC;')}>{v.planCountText}</div>
            </div>
          </div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:#8A7C93;margin:18px 0 9px;")}>ธีมสี · App accent</div>
          <div style={sx('display:flex;gap:11px;')}>
            {v.themeSwatches.map((sw) => <button key={sw.key} onClick={sw.onTap} style={sx(sw.style)}>{sw.active && <span style={sx('color:#fff;font-size:18px;font-weight:800;')}>✓</span>}</button>)}
          </div>
          <div style={sx('margin-top:18px;display:flex;flex-direction:column;gap:10px;')}>
            {v.settingRows.map((row) => (
              <div key={row.key} style={sx('display:flex;align-items:center;gap:13px;background:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 6px 16px rgba(180,120,150,.09);')}>
                <span style={sx('font-size:20px;')}>{row.emoji}</span>
                <div style={sx('flex:1;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#4A3F55;")}>{row.title}</div>
                  <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>{row.sub}</div>
                </div>
                <button onClick={row.onTap} style={sx(row.toggleStyle)}><span style={sx(row.knobStyle)} /></button>
              </div>
            ))}
          </div>
          <button onClick={v.replayOnboarding} style={sx("margin-top:16px;width:100%;border:none;border-radius:18px;background:#F1E8F5;color:#8A7C93;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;padding:14px;cursor:pointer;")}>ดูวิธีใช้อีกครั้ง · Replay intro</button>
          <button onClick={v.resetDemo} style={sx("margin-top:10px;width:100%;border:none;border-radius:18px;background:#F1E8F5;color:#8A7C93;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;padding:14px;cursor:pointer;")}>🧹 รีเซ็ตข้อมูลเดโม · Reset demo data</button>
          <button onClick={v.signOut} style={sx("margin-top:10px;width:100%;border:2px solid #F6D5DF;border-radius:18px;background:#fff;color:#E06B85;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;padding:13px;cursor:pointer;")}>🚪 ออกจากระบบ · Sign out</button>
          <div style={sx('text-align:center;font-size:11px;font-weight:700;color:#C6B6D0;margin-top:12px;')}>{v.authEmail}</div>
        </div>
      </SheetShell>
    </>
  )
}

export function MoveConfirm({ v }) {
  const pm = v.pendingMove
  return (
    <div onClick={v.cancelMove} style={sx('position:absolute;inset:0;z-index:46;background:rgba(74,63,85,.42);animation:ts-scrim .2s ease;display:flex;align-items:center;justify-content:center;padding:0 34px;')}>
      <div onClick={v.stop} style={sx('width:100%;max-width:400px;background:#FFF8FB;border-radius:28px;padding:24px 22px 20px;box-shadow:0 22px 50px rgba(180,120,150,.35);animation:ts-cardin .32s cubic-bezier(.34,1.56,.64,1) both;text-align:center;')}>
        <div style={sx('font-size:46px;animation:ts-bob 2.6s ease-in-out infinite;')}>🗓️</div>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;color:#4A3F55;margin-top:8px;")}>ย้ายคาบเรียน?</div>
        <div style={sx('font-size:13px;font-weight:700;color:#8A7C93;margin-top:6px;line-height:1.45;')}>{pm.msg}</div>
        <div style={sx('display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;')}>
          <div style={sx(pm.fromChip)}>{pm.from}</div>
          <span style={sx(`color:${v.g.pc};font-size:22px;font-weight:800;`)}>→</span>
          <div style={sx(pm.toChip)}>{pm.to}</div>
        </div>
        <div style={sx('display:flex;gap:10px;margin-top:22px;')}>
          <button onClick={v.cancelMove} style={sx("flex:1;border:none;border-radius:16px;background:#F1E8F5;color:#8A7C93;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:14px;cursor:pointer;")}>ยกเลิก</button>
          <button onClick={v.confirmMove} style={sx(`flex:1.5;border:none;border-radius:16px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:14px;cursor:pointer;box-shadow:0 10px 22px ${v.g.pcShadow};`)}>ย้ายเลย ✨</button>
        </div>
      </div>
    </div>
  )
}

export function ReschedSheet({ v }) {
  return (
    <>
      <div onClick={v.closeResched} style={sx('position:absolute;inset:0;z-index:44;background:rgba(74,63,85,.42);animation:ts-scrim .2s ease;')} />
      <SheetShell v={v} z={45} maxH="none" extra="padding:14px 20px 24px;">
        <div style={sx(`width:44px;height:5px;border-radius:3px;background:#E8DCEF;margin:0 auto 12px;${v.desktop ? 'display:none;' : ''}`)} />
        <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;color:#4A3F55;")}>ย้ายไปวันไหน? 🗓️</div>
          {closeBtn(v.closeResched)}
        </div>
        <div style={sx('font-size:12.5px;font-weight:700;color:#B0A4BC;margin-top:4px;')}>เลือกวันใหม่ในเดือน{v.reschedMonth} · Pick a new day</div>
        <div style={sx('display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:14px;')}>
          {v.reschedDays.map((d) => <button key={d.num} onClick={d.onTap} style={sx(d.style)}>{d.num}</button>)}
        </div>
      </SheetShell>
    </>
  )
}
