import React from 'react'
import { sx } from '../util.js'

export function CalendarTab({ v }) {
  return (
    <div>
      {/* Up-next card (Airbnb Trips pattern) */}
      {v.upNext && (
        <button onClick={v.upNext.onTap} style={sx('width:100%;border:none;background:#fff;border-radius:20px;padding:13px 15px;display:flex;gap:12px;align-items:stretch;box-shadow:0 8px 22px rgba(180,120,150,.13);cursor:pointer;text-align:left;margin-bottom:12px;animation:ts-cardin .4s ease both;')}>
          <div style={sx(v.upNext.stripe)} />
          <div style={sx('flex:1;min-width:0;')}>
            <span style={sx(v.upNext.badgeStyle)}>⏰ {v.upNext.badge}</span>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14.5px;color:#4A3F55;margin-top:5px;line-height:1.15;")}>{v.upNext.title}</div>
            <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;margin-top:2px;')}>{v.upNext.sub}</div>
          </div>
          <span style={sx('color:#D7C8E0;font-size:18px;align-self:center;')}>›</span>
        </button>
      )}

      <div style={sx('display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;')}>
        {v.weekdays.map((w, i) => <div key={i} style={sx(w.style)}>{w.label}</div>)}
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(7,1fr);gap:5px;')}>
        {v.cells.map((cell) => (
          <button key={cell.key} onClick={cell.onTap} data-day={cell.dayNum || undefined} data-has={cell.hasSess ? 'true' : 'false'} style={sx(cell.style)}>
            <span style={sx(cell.numStyle)}>{cell.dayNum}</span>
            <div style={sx('display:flex;gap:3px;justify-content:center;margin-top:3px;height:6px;')}>
              {cell.dots.map((d, i) => <i key={i} style={sx(d.style)} />)}
            </div>
          </button>
        ))}
      </div>

      <div style={sx('margin-top:18px;background:rgba(255,255,255,.72);border-radius:22px;padding:14px 16px;box-shadow:0 8px 22px rgba(180,120,150,.12);')}>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;margin-bottom:10px;")}>{v.legendTitle}</div>
        <div style={sx('display:flex;flex-direction:column;gap:9px;')}>
          {v.legend.map((s, i) => (
            <div key={i} style={sx('display:flex;align-items:center;gap:10px;')}>
              <span style={sx(s.dotStyle)} />
              <div style={sx('flex:1;min-width:0;')}>
                <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:600;font-size:13.5px;color:#4A3F55;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{s.th}</div>
                <div style={sx('font-size:11px;font-weight:700;color:#B0A4BC;')}>{s.en} · {s.insEn} · {s.rateLabel}</div>
              </div>
              <div style={sx(`font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;color:${s.color};`)}>{s.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={sx('text-align:center;margin-top:16px;font-size:12px;font-weight:700;color:#C6B6D0;')}>แตะเพื่อดู · ลากวันเพื่อย้ายคาบ · Tap or drag a day ✨</div>
    </div>
  )
}

export function GoalsTab({ v }) {
  return (
    <div style={sx('display:flex;flex-direction:column;gap:14px;padding-top:4px;')}>
      <div style={sx(`background:linear-gradient(135deg,${v.pt.pc},${v.pt.pc2});border-radius:26px;padding:20px;box-shadow:0 14px 30px ${v.pt.shadow};color:#fff;animation:ts-fadeup .4s ease both;`)}>
        <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
          <div>
            <div style={sx('font-size:12px;font-weight:800;opacity:.9;letter-spacing:.4px;')}>{v.goalPrimary.kicker}</div>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:30px;line-height:1.1;margin-top:2px;")}>{v.goalPrimary.big}</div>
            <div style={sx('font-size:12.5px;font-weight:700;opacity:.92;')}>{v.goalPrimary.sub}</div>
          </div>
          <div style={sx('display:flex;align-items:center;gap:8px;')}>
            <button onClick={v.openEditTarget} aria-label="Edit target" style={sx('width:34px;height:34px;border:none;border-radius:13px;background:rgba(255,255,255,.28);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
            <div style={sx('width:58px;height:58px;border-radius:20px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:26px;')}>{v.goalPrimary.emoji}</div>
          </div>
        </div>
        <div style={sx('margin-top:16px;height:14px;border-radius:10px;background:rgba(255,255,255,.28);overflow:hidden;')}><div style={sx(v.goalPrimary.barStyle)} /></div>
        <div style={sx('display:flex;justify-content:space-between;margin-top:8px;font-weight:800;font-size:12.5px;')}>
          <span>{v.goalPrimary.pctText}</span><span>{v.goalPrimary.remainText}</span>
        </div>
      </div>

      {/* Momentum strip (adidas Running / Atoms / Google Fit pattern) */}
      {v.momentum && (
        <div style={sx('background:#fff;border-radius:22px;padding:14px 17px;box-shadow:0 10px 26px rgba(180,120,150,.12);animation:ts-fadeup .45s ease both;')}>
          <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;')}>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13px;color:#8A7C93;")}>{v.momentum.sub}</div>
            <div style={sx(`font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;color:${v.pt.pc};`)}>{v.momentum.streakText}</div>
          </div>
          <div style={sx('display:flex;justify-content:space-between;')}>
            {v.momentum.days.map((d, i) => (
              <div key={i} style={sx('display:flex;flex-direction:column;align-items:center;gap:5px;')}>
                <div style={sx(d.dotStyle)}>{d.mark}</div>
                <span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:10px;color:#B0A4BC;")}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sx('display:flex;gap:14px;')}>
        {v.goalSecondary.map((sec, i) => (
          <div key={i} style={sx('flex:1;background:#fff;border-radius:24px;padding:16px;box-shadow:0 10px 26px rgba(180,120,150,.12);animation:ts-fadeup .5s ease both;')}>
            <div style={sx('font-size:11px;font-weight:800;color:#B0A4BC;')}>{sec.label}</div>
            <div style={sx(`font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:${sec.size};color:#4A3F55;margin-top:4px;line-height:1.15;`)}>{sec.value}</div>
            <div style={sx('margin-top:10px;height:9px;border-radius:8px;background:#F1ECF5;overflow:hidden;')}><div style={sx(sec.barStyle)} /></div>
            <div style={sx(`font-size:11px;font-weight:800;color:${v.g.pc};margin-top:6px;`)}>{sec.foot}</div>
          </div>
        ))}
      </div>

      <div style={sx('background:#fff;border-radius:26px;padding:18px 20px;box-shadow:0 12px 30px rgba(180,120,150,.14);animation:ts-fadeup .7s ease both;')}>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#4A3F55;margin-bottom:14px;")}>{v.perCatTitle}</div>
        <div style={sx('display:flex;flex-direction:column;gap:14px;')}>
          {v.subjectGoals.map((sg, i) => (
            <div key={i}>
              <div style={sx('display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;')}>
                <span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:600;font-size:13.5px;color:#4A3F55;")}>{sg.en}</span>
                <span style={sx(`font-weight:800;font-size:12.5px;color:${sg.color};`)}>{sg.count}/{sg.target}</span>
              </div>
              <div style={sx('height:10px;border-radius:8px;background:#F4EFF7;overflow:hidden;')}><div style={sx(sg.barStyle)} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={sx('background:#fff;border-radius:22px;padding:15px 17px;box-shadow:0 10px 26px rgba(180,120,150,.12);display:flex;align-items:center;gap:12px;animation:ts-fadeup .75s ease both;')}>
        <div style={sx(`width:40px;height:40px;border-radius:14px;background:${v.g.pcSoft};display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;`)}>⚙️</div>
        <div style={sx('flex:1;min-width:0;')}>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14.5px;color:#4A3F55;")}>ตั้งค่าแพลน · Plan settings</div>
          <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>คุณเป็นเจ้าของ · Host — edit anytime</div>
        </div>
        <button onClick={v.openPlanEdit} style={sx(`border:none;border-radius:14px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;padding:10px 15px;cursor:pointer;flex:none;box-shadow:0 6px 14px ${v.g.pcShadow};`)}>แก้ไข</button>
      </div>

      <button onClick={v.openPublish} style={sx(`width:100%;border:2px dashed ${v.g.pcBorder};border-radius:22px;background:${v.g.pcSoft};color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;animation:ts-fadeup .8s ease both;`)}>📤 เผยแพร่สู่มาร์เก็ต · Publish to Explore</button>
    </div>
  )
}

export function TeamTab({ v }) {
  return (
    <div style={sx('display:flex;flex-direction:column;gap:12px;padding-top:4px;')}>
      <div style={sx(`background:linear-gradient(135deg,${v.pt.pc},${v.pt.pc2});border-radius:26px;padding:20px;box-shadow:0 14px 30px ${v.pt.shadow};color:#fff;animation:ts-fadeup .4s ease both;`)}>
        <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:19px;")}>แชร์แพลนนี้ 🤝</div>
        <div style={sx('font-size:13px;font-weight:700;opacity:.92;margin-top:2px;')}>Invite people to view &amp; react in real time</div>
        <button onClick={v.invite} style={sx(`margin-top:14px;width:100%;border:none;border-radius:16px;background:rgba(255,255,255,.95);color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;padding:13px;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.1);`)}>🔗 คัดลอกลิงก์เชิญ · Copy invite link</button>
      </div>
      {v.members.map((m, i) => (
        <div key={i} style={sx('background:#fff;border-radius:22px;padding:14px 16px;box-shadow:0 8px 22px rgba(180,120,150,.12);display:flex;align-items:center;gap:13px;animation:ts-fadeup .5s ease both;')}>
          <div style={sx('position:relative;flex:none;')}>
            <div style={sx(m.avatarStyle)}>{m.initials}</div>
            {m.online && <span style={sx('position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#5FD3A8;border:2.5px solid #fff;')} />}
          </div>
          <div style={sx('flex:1;min-width:0;')}>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#4A3F55;")}>{m.name} <span style={sx('font-size:12px;color:#B0A4BC;font-weight:700;')}>{m.en}</span></div>
            <div style={sx('font-size:12px;font-weight:700;color:#B0A4BC;')}>{m.role}</div>
          </div>
          <div style={sx('text-align:right;flex:none;')}>
            <div style={sx(m.badgeStyle)}>{m.badge}</div>
            {m.hasRate && <div style={sx('font-size:11px;font-weight:800;color:#4A3F55;margin-top:4px;')}>{m.rateText}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AiTab({ v }) {
  return (
    <div style={sx('display:flex;flex-direction:column;gap:11px;padding-top:2px;')}>
      {v.messages.map((msg) => (
        <div key={msg.id} style={sx(msg.rowStyle)}>
          {msg.isAi && <div style={sx('width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#C9B6F7,#8FD0FF);display:flex;align-items:center;justify-content:center;font-size:17px;flex:none;')}>✨</div>}
          <div style={sx(msg.bubbleStyle)}>{msg.text}</div>
        </div>
      ))}
      {v.aiThinking && (
        <div style={sx('display:flex;gap:8px;align-items:flex-end;')}>
          <div style={sx('width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#C9B6F7,#8FD0FF);display:flex;align-items:center;justify-content:center;font-size:17px;flex:none;')}>✨</div>
          <div style={sx('background:#fff;border-radius:18px 18px 18px 6px;padding:14px 16px;box-shadow:0 6px 16px rgba(180,120,150,.12);display:flex;gap:5px;')}>
            <span style={sx('width:8px;height:8px;border-radius:50%;background:#C9B6F7;animation:ts-thinking 1.2s infinite;')} />
            <span style={sx('width:8px;height:8px;border-radius:50%;background:#C9B6F7;animation:ts-thinking 1.2s infinite .2s;')} />
            <span style={sx('width:8px;height:8px;border-radius:50%;background:#C9B6F7;animation:ts-thinking 1.2s infinite .4s;')} />
          </div>
        </div>
      )}
      <div style={sx('height:158px;flex:none;')} />
    </div>
  )
}

export function AiDock({ v }) {
  return (
    <div style={sx('position:absolute;left:0;right:0;bottom:82px;z-index:6;padding:0 14px;')}>
      <div style={sx('display:flex;gap:8px;overflow-x:auto;padding-bottom:9px;')}>
        {v.chips.map((c, i) => (
          <button key={i} onClick={c.onTap} style={sx("flex:none;border:none;border-radius:14px;background:rgba(255,255,255,.92);color:#7A6C86;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;padding:8px 13px;cursor:pointer;box-shadow:0 4px 12px rgba(180,120,150,.12);white-space:nowrap;")}>{c.label}</button>
        ))}
      </div>
      <div style={sx('display:flex;gap:9px;align-items:center;background:#fff;border-radius:20px;padding:6px 6px 6px 16px;box-shadow:0 10px 26px rgba(180,120,150,.18);')}>
        <input value={v.chatInput} onChange={v.setChatInput} onKeyDown={v.chatKey} placeholder="ถามผู้ช่วย AI…  ask me anything" style={sx("flex:1;border:none;outline:none;background:transparent;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;color:#4A3F55;min-width:0;")} />
        <button onClick={v.sendChat} aria-label="Send" style={sx(`width:40px;height:40px;flex:none;border:none;border-radius:15px;background:${v.g.pc};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px ${v.g.pcShadow};`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  )
}
