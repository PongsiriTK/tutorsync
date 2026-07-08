import React from 'react'
import { sx } from '../util.js'

// Stepped onboarding (Liven / ABY Journal pattern): intro → name → first goal.
export function OnboardingOverlay({ v }) {
  return (
    <div style={sx('position:absolute;inset:0;z-index:60;background:linear-gradient(170deg,#FFF3EC,#FDEFF6 55%,#EFF3FF);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 34px;text-align:center;')}>

      <div style={sx('display:flex;gap:6px;position:absolute;top:58px;left:50%;transform:translateX(-50%);')}>
        {v.onbDots.map((d) => <span key={d.key} style={sx(d.style)} />)}
      </div>

      {v.onbStep === 0 && (
        <>
          <div style={sx('font-size:82px;animation:ts-bob 3s ease-in-out infinite;')}>🗓️</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:30px;color:#4A3F55;margin-top:14px;line-height:1.1;")}>TutorSync</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:16px;color:#B0A4BC;margin-top:4px;")}>หลายเป้าหมาย หลายปฏิทิน ในที่เดียว</div>
          <div style={sx('font-size:13.5px;font-weight:700;color:#C0A8CC;margin-top:8px;line-height:1.5;max-width:290px;')}>Every goal gets its own calendar. Set a budget, hours, deadline, or session target — then invite people to plan it live with you.</div>
          <div style={sx('display:flex;flex-direction:column;gap:10px;margin-top:26px;width:100%;max-width:290px;')}>
            {v.onbFeatures.map((f, i) => (
              <div key={i} style={sx('display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.72);border-radius:18px;padding:12px 15px;box-shadow:0 6px 16px rgba(180,120,150,.1);text-align:left;')}>
                <span style={sx('font-size:24px;')}>{f.emoji}</span>
                <div>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#4A3F55;")}>{f.title}</div>
                  <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {v.onbStep === 1 && (
        <>
          <div style={sx('font-size:72px;animation:ts-bob 3s ease-in-out infinite;')}>👋</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:26px;color:#4A3F55;margin-top:14px;line-height:1.15;")}>ให้เราเรียกคุณว่าอะไรดี?</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#B0A4BC;margin-top:4px;")}>What should we call you?</div>
          <div style={sx('font-size:12.5px;font-weight:700;color:#C0A8CC;margin-top:8px;line-height:1.5;max-width:280px;')}>ใช้แค่แสดงชื่อในทีมและให้ผู้ช่วยทักทายคุณ 💛</div>
          <input value={v.onbName} onChange={v.setOnbName} onKeyDown={v.onbNameKey} placeholder="ชื่อเล่นของคุณ · Your name" autoFocus
            style={sx("width:100%;max-width:290px;margin-top:24px;border:2px solid #EEE6F3;border-radius:18px;background:#fff;padding:15px 18px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:16px;color:#4A3F55;outline:none;text-align:center;box-shadow:0 10px 26px rgba(180,120,150,.12);")} />
        </>
      )}

      {v.onbStep === 2 && (
        <>
          <div style={sx('font-size:64px;animation:ts-bob 3s ease-in-out infinite;')}>🎯</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:24px;color:#4A3F55;margin-top:12px;line-height:1.15;")}>เป้าหมายแรกของคุณคืออะไร?</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13.5px;color:#B0A4BC;margin-top:4px;")}>Pick your first goal — we'll set it up</div>
          <div style={sx('display:flex;flex-direction:column;gap:9px;margin-top:20px;width:100%;max-width:290px;')}>
            {v.onbTemplates.map((tp) => (
              <button key={tp.key} onClick={tp.onTap} style={sx(tp.style)}>
                <div style={sx(tp.iconStyle)}>{tp.emoji}</div>
                <div style={sx('text-align:left;min-width:0;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14.5px;color:#4A3F55;")}>{tp.label}</div>
                  <div style={sx('font-size:11px;font-weight:700;color:#B0A4BC;')}>{tp.vibe}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button onClick={v.onbNext} style={sx(`margin-top:26px;width:100%;max-width:290px;border:none;border-radius:20px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:17px;padding:16px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};${v.onbStep === 0 ? 'animation:ts-bob 3.4s ease-in-out infinite;' : ''}`)}>
        {v.onbStep < 2 ? 'ต่อไป · Next →' : 'เริ่มเลย · Let’s go! 🚀'}
      </button>
      <button onClick={v.onbSkip} style={sx("margin-top:12px;border:none;background:none;color:#C6B6D0;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;cursor:pointer;")}>ข้ามไปก่อน · Skip</button>
    </div>
  )
}
