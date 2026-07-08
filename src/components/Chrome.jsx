import React, { useEffect, useState } from 'react'
import { sx } from '../util.js'
import { AuthOverlay } from './Auth.jsx'
import { OnboardingOverlay } from './Onboarding.jsx'
import { HomeScreen } from './Home.jsx'
import { CalendarTab, GoalsTab, TeamTab, AiTab, AiDock } from './Tabs.jsx'
import {
  DaySheet, SlotSheet, AddSheet, CreateSheet, MarketSheet, PlanEditSheet,
  EditTargetSheet, PublishSheet, SettingsSheet, MoveConfirm, ReschedSheet, BookedConfirm,
} from './Sheets.jsx'

function useScale() {
  const calc = () => {
    const vw = window.innerWidth, vh = window.innerHeight
    if (vw <= 480 || vh <= 700) return Math.min(vw / 390, vh / 844)
    return Math.min(1, (vh - 48) / 844, (vw - 24) / 390)
  }
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const on = () => setScale(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return scale
}

export function PhoneFrame({ v }) {
  const scale = useScale()
  const full = typeof window !== 'undefined' && (window.innerWidth <= 480 || window.innerHeight <= 700)
  return (
    <div className="stage">
      <div className="phone-scale" style={{ transform: `scale(${scale})` }}>
        <div style={sx(`width:390px;height:844px;margin:0 auto;position:relative;overflow:hidden;border-radius:${full ? 0 : 46}px;background:linear-gradient(170deg,#FFF3EC 0%,#FDEFF6 52%,#EFF3FF 100%);box-shadow:0 30px 80px rgba(180,120,150,.30),0 4px 12px rgba(180,120,150,.14);font-family:'Nunito','Baloo Thai 2',sans-serif;color:#4A3F55;display:flex;flex-direction:column;user-select:none;`)}>

          <div style={sx('position:absolute;top:-70px;right:-50px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#FFD7E4,#FFC4B0);filter:blur(6px);opacity:.5;animation:ts-float 11s ease-in-out infinite;pointer-events:none;')} />
          <div style={sx('position:absolute;bottom:60px;left:-70px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#D9E4FF,#E8DBFF);filter:blur(6px);opacity:.45;animation:ts-float2 13s ease-in-out infinite;pointer-events:none;')} />

          {v.showAuth && <AuthOverlay v={v} />}
          {!v.showAuth && v.onboarding && <OnboardingOverlay v={v} />}

          <Header v={v} />

          <div data-scroll-main="1" style={sx('position:relative;z-index:4;flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 16px 112px;')}>
            {v.isHome && <HomeScreen v={v} />}
            {v.isCal && <CalendarTab v={v} />}
            {v.isGoals && <GoalsTab v={v} />}
            {v.isTeam && <TeamTab v={v} />}
            {v.isAI && <AiTab v={v} />}
          </div>

          {v.isAI && <AiDock v={v} />}

          {v.homeMine && (
            <button onClick={v.openCreate} aria-label="New goal" style={sx(`position:absolute;right:22px;bottom:26px;z-index:9;width:62px;height:62px;border:none;border-radius:22px;background:${v.g.pc};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 26px ${v.g.pcShadow};animation:ts-bob 3.2s ease-in-out infinite;`)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          )}

          {v.inPlan && <BottomNav v={v} />}

          {v.pendingMove && <MoveConfirm v={v} />}
          {v.reschedOpen && <ReschedSheet v={v} />}
          {v.toast && (
            <div style={sx("position:absolute;top:96px;left:50%;z-index:40;background:#4A3F55;color:#fff;border-radius:18px;padding:11px 18px;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:13.5px;box-shadow:0 12px 30px rgba(74,63,85,.4);display:flex;align-items:center;gap:8px;white-space:nowrap;animation:ts-toast 2.8s ease forwards;")}>
              <span style={sx('font-size:18px;')}>{v.toast.emoji}</span>{v.toast.text}
            </div>
          )}

          {v.dayOpen && <DaySheet v={v} />}
          {v.slotOpen && <SlotSheet v={v} />}
          {v.addOpen && <AddSheet v={v} />}
          {v.booked && <BookedConfirm v={v} />}
          {v.createOpen && <CreateSheet v={v} />}
          {v.marketOpen && <MarketSheet v={v} />}
          {v.planEditOpen && <PlanEditSheet v={v} />}
          {v.editTargetOpen && <EditTargetSheet v={v} />}
          {v.publishOpen && <PublishSheet v={v} />}
          {v.settingsOpen && <SettingsSheet v={v} />}
        </div>
      </div>
      {!full && <div className="desk-note">TutorSync 🗓️ · mobile app demo — best viewed like a phone</div>}
    </div>
  )
}

function Header({ v }) {
  return (
    <div style={sx('position:relative;z-index:5;padding:52px 20px 12px;flex:none;')}>
      <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px;')}>
        <div style={sx('display:flex;align-items:center;gap:8px;min-width:0;')}>
          {v.inPlan && (
            <button onClick={v.backHome} aria-label="Back to plans" style={sx(`width:34px;height:34px;border:none;border-radius:14px;background:${v.g.pcSoft};color:${v.g.pc};cursor:pointer;box-shadow:0 4px 10px rgba(180,120,150,.12);display:flex;align-items:center;justify-content:center;flex:none;`)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={v.g.pc} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10.5V20h14v-9.5" /></svg>
            </button>
          )}
          {v.isCal && (
            <button onClick={v.prevMonth} aria-label="Previous month" style={sx('width:30px;height:30px;border:none;border-radius:12px;background:rgba(255,255,255,.7);color:#A99BB5;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;')}>‹</button>
          )}
          <div style={sx('min-width:0;')}>
            <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:21px;line-height:1.05;color:#4A3F55;white-space:nowrap;")}>{v.headerTitle}</div>
            <div style={sx('font-size:12px;font-weight:700;color:#B0A4BC;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;')}>{v.headerSub}</div>
          </div>
          {v.isCal && (
            <button onClick={v.nextMonth} aria-label="Next month" style={sx('width:30px;height:30px;border:none;border-radius:12px;background:rgba(255,255,255,.7);color:#A99BB5;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;')}>›</button>
          )}
        </div>
        <div style={sx('display:flex;align-items:center;gap:10px;flex:none;')}>
          <div style={sx('display:flex;align-items:center;')}>
            {v.presenceAvatars.map((p, i) => (
              <div key={i} style={sx(p.wrap)} title={p.name}>
                <div style={sx(p.style)}>{p.initials}</div>
                {p.online && <span style={sx('position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#5FD3A8;border:2px solid #fff;')} />}
              </div>
            ))}
          </div>
          <button onClick={v.openSettings} aria-label="Settings" style={sx('width:36px;height:36px;border:none;border-radius:14px;background:rgba(255,255,255,.8);cursor:pointer;box-shadow:0 4px 10px rgba(180,120,150,.12);display:flex;align-items:center;justify-content:center;flex:none;')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A7C93" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </div>
      <div style={sx('font-size:11.5px;font-weight:700;color:#C0A8CC;margin-top:6px;padding-left:2px;')}>{v.viewingText}</div>
    </div>
  )
}

function BottomNav({ v }) {
  const item = sx('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding-top:10px;')
  const label = (color) => sx(`font-family:'Baloo Thai 2',sans-serif;font-size:10.5px;font-weight:700;color:${color};`)
  return (
    <div style={sx('position:absolute;left:0;right:0;bottom:0;z-index:8;height:78px;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border-top:1px solid rgba(180,120,150,.1);border-radius:30px 30px 0 0;display:flex;align-items:center;justify-content:space-around;padding:0 8px 14px;box-shadow:0 -8px 24px rgba(180,120,150,.08);')}>
      <button onClick={v.goCal} style={item}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v.navCal} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="4" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="5" /><line x1="16" y1="2" x2="16" y2="5" /></svg>
        <span style={label(v.navCal)}>ปฏิทิน</span>
      </button>
      <button onClick={v.goGoals} style={item}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v.navGoals} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill={v.navGoals} /></svg>
        <span style={label(v.navGoals)}>เป้าหมาย</span>
      </button>
      <div style={sx('flex:1;display:flex;justify-content:center;')}>
        <button onClick={v.openAdd} aria-label="Add session" style={sx(`width:60px;height:60px;margin-top:-26px;border:none;border-radius:22px;background:${v.g.pc};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 24px ${v.g.pcShadow};animation:ts-bob 3.2s ease-in-out infinite;`)}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      </div>
      <button onClick={v.goTeam} style={item}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v.navTeam} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        <span style={label(v.navTeam)}>ทีม</span>
      </button>
      <button onClick={v.goAI} style={item}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v.navAI} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5 10.1 7.6 12 3z" /><path d="M19 15l.7 1.8L21.5 17.5 19.7 18.2 19 20l-.7-1.8L16.5 17.5 18.3 16.8 19 15z" /></svg>
        <span style={label(v.navAI)}>ผู้ช่วย</span>
      </button>
    </div>
  )
}
