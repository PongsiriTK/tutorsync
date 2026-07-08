import React from 'react'
import { sx } from '../util.js'

export function AuthOverlay({ v }) {
  return (
    <div style={sx('position:absolute;inset:0;z-index:70;background:linear-gradient(170deg,#FFF3EC,#FDEFF6 55%,#EFF3FF);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;')}>
      {v.authEmailStep && (
        <div style={sx('width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;')}>
          <div style={sx('font-size:72px;animation:ts-bob 3s ease-in-out infinite;')}>🗓️</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:27px;color:#4A3F55;margin-top:10px;")}>ยินดีต้อนรับ</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:15px;color:#B0A4BC;margin-top:2px;")}>Sign in to TutorSync</div>
          <div style={sx('font-size:13px;font-weight:700;color:#C0A8CC;margin-top:8px;line-height:1.5;')}>ไม่ต้องใช้รหัสผ่าน — เราจะส่งโค้ด 6 หลักไปที่อีเมลของคุณ 💌</div>
          <div style={sx(`width:100%;margin-top:24px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:18px;padding:4px 6px 4px 16px;box-shadow:0 10px 26px rgba(180,120,150,.14);border:2px solid ${v.authEmailBorder};`)}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B0A4BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="4" /><path d="m3 7 9 6 9-6" /></svg>
            <input value={v.authEmail} onChange={v.setAuthEmail} onKeyDown={v.emailKey} type="email" inputMode="email" placeholder="you@email.com" style={sx("flex:1;border:none;outline:none;background:transparent;font-family:'Nunito',sans-serif;font-weight:700;font-size:15px;color:#4A3F55;min-width:0;padding:11px 0;")} />
          </div>
          {v.authError && <div style={sx('font-size:12px;font-weight:800;color:#E06B85;margin-top:8px;')}>{v.authError}</div>}
          <button onClick={v.sendCode} style={sx(`margin-top:16px;width:100%;border:none;border-radius:18px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;padding:15px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};`)}>ส่งโค้ด · Send code ✉️</button>
          <div style={sx('font-size:11px;font-weight:700;color:#C6B6D0;margin-top:14px;line-height:1.4;')}>เมื่อดำเนินการต่อ ถือว่ายอมรับข้อกำหนดการใช้งาน</div>
        </div>
      )}

      {v.authOtpStep && (
        <div style={sx('width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;')}>
          <div style={sx('font-size:64px;animation:ts-bob 3s ease-in-out infinite;')}>💌</div>
          <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:24px;color:#4A3F55;margin-top:10px;")}>ใส่โค้ดยืนยัน</div>
          <div style={sx('font-size:13px;font-weight:700;color:#B0A4BC;margin-top:4px;line-height:1.5;')}>ส่งโค้ด 6 หลักไปที่<br /><span style={sx('color:#4A3F55;font-weight:800;')}>{v.maskedEmail}</span></div>

          <div style={sx('position:relative;width:100%;margin-top:22px;')}>
            <div style={sx('display:flex;gap:8px;justify-content:center;')}>
              {v.otpCells.map((c) => <div key={c.key} style={sx(c.style)}>{c.char}</div>)}
            </div>
            <input value={v.authOtp} onChange={v.setAuthOtp} onKeyDown={v.otpKey} inputMode="numeric" maxLength={6} autoFocus style={sx('position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px;')} />
          </div>
          {v.authError && <div style={sx('font-size:12px;font-weight:800;color:#E06B85;margin-top:12px;')}>{v.authError}</div>}

          <div style={sx(`margin-top:16px;background:${v.g.pcSoft};border-radius:14px;padding:10px 14px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;color:${v.g.pc};`)}>🔑 โค้ดทดสอบ · demo code: <span style={sx('font-weight:800;letter-spacing:1px;')}>{v.authCode}</span></div>

          <button onClick={v.verifyOtp} style={sx(`margin-top:18px;width:100%;border:none;border-radius:18px;background:${v.g.pc};color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;padding:15px;cursor:pointer;box-shadow:0 12px 26px ${v.g.pcShadow};`)}>ยืนยัน · Verify ✨</button>
          <div style={sx('display:flex;gap:14px;margin-top:14px;')}>
            <button onClick={v.changeEmail} style={sx("border:none;background:none;color:#B0A4BC;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12.5px;cursor:pointer;")}>← เปลี่ยนอีเมล</button>
            <button onClick={v.resendCode} style={sx(`border:none;background:none;color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12.5px;cursor:pointer;`)}>ส่งโค้ดอีกครั้ง</button>
          </div>
        </div>
      )}
    </div>
  )
}
