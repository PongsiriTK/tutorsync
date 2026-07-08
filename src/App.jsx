import React from 'react'
import { themes, people, monthTH, monthEN, dowTH, dowFullTH, reactionEmojis, goalTypeMeta, seedPlans, seedMarket, catUnit, catCost } from './data.js'
import { assistantReply } from './ai.js'
import { fmt } from './util.js'
import { api, hasApi, probe, getToken, setToken } from './api.js'
import { AppShell } from './components/Chrome.jsx'

const stripMeta = (p) => { const o = { ...p }; delete o._role; delete o._shared; delete o._rev; delete o._owner; delete o._updatedAt; return o }

const STORE_KEY = 'ts_data_v1'
const SESSION_KEY = 'ts_session'

const TEMPLATES = [
  { key: 'study',    emoji: '📚', label: 'ติวสอบ',    vibe: 'Ace the exam',   type: 'budget',   theme: 'coral', ce: '📚' },
  { key: 'fitness',  emoji: '💪', label: 'ฟิตเนส',    vibe: 'Get moving',     type: 'hours',    theme: 'mint',  ce: '💪' },
  { key: 'deadline', emoji: '🎯', label: 'กำหนดส่ง',  vibe: 'Beat the clock', type: 'window',   theme: 'sky',   ce: '🎯' },
  { key: 'music',    emoji: '🎹', label: 'ดนตรี',     vibe: 'Learn a skill',  type: 'sessions', theme: 'lilac', ce: '🎹' },
  { key: 'custom',   emoji: '✨', label: 'กำหนดเอง',  vibe: 'Your way',       type: 'sessions', theme: 'coral', ce: '✨' },
]
const DEFAULT_TARGET = { budget: 20000, hours: 40, window: 30, sessions: 20 }
const TARGET_SETS = {
  budget:   [[10000, '฿10k'], [20000, '฿20k'], [30000, '฿30k'], [50000, '฿50k']],
  hours:    [[20, '20 ชม.'], [40, '40 ชม.'], [60, '60 ชม.'], [80, '80 ชม.']],
  sessions: [[10, '10 คาบ'], [20, '20 คาบ'], [30, '30 คาบ'], [40, '40 คาบ']],
  window:   [[14, '2 สัปดาห์'], [30, '1 เดือน'], [60, '2 เดือน'], [90, '3 เดือน']],
}
const TARGET_LABELS = { budget: 'งบประมาณรวม · Total budget', hours: 'เป้าชั่วโมง · Hours target', sessions: 'เป้าจำนวนคาบ · Sessions target', window: 'ระยะเวลา · Deadline in' }
const SOFT_OF = { '#FF8AA0': '#FFEBF0', '#6AAEF5': '#E7F1FE', '#4FC7A8': '#E4F7F1', '#F4A94C': '#FEF0DC', '#B18AF0': '#F1EBFC', '#7BD9E0': '#E4F9FB' }
const softOf = (hex) => SOFT_OF[hex] || '#F4EFF7'

export default class App extends React.Component {
  TODAY = 15

  state = {
    authed: false, authStep: 'email', authEmail: '', authOtp: '', authCode: '', authError: '',
    loading: true,
    screen: 'home', tab: 'cal',
    onboarding: true, onbStep: 0, onbName: '', onbTemplate: null,
    userName: '',
    year: 2026, month: 6,
    activePlanId: 1,
    dayOpen: false, selDay: null,
    slotOpen: false, selSlot: null,
    addOpen: false, settingsOpen: false, createOpen: false,
    theme: 'coral',
    toast: null,
    addSubj: null, addDate: null, addTime: '17:00–19:00', addHours: 2,
    addSets: 3, addReps: 12, addIntensity: 'ปานกลาง',
    homeTab: 'mine',
    marketOpen: false, selMarket: null, market: null,
    marketQuery: '', marketFilter: 'all',
    editTargetOpen: false, editTargetVal: null,
    planEditOpen: false, editDraft: null,
    pendingMove: null,
    reschedOpen: false, reschedId: null,
    publishOpen: false,
    booked: null,
    chatInput: '', commentDraft: '',
    messages: [{ id: 1, isAi: true, text: 'สวัสดีค่ะ! 👋 หนูช่วยดูแลทุกเป้าหมายของคุณได้เลย — ถามเรื่องงบ ชั่วโมง หรือให้จัดคาบให้ก็ได้นะคะ!' }],
    aiThinking: false,
    settingsFlags: { notif: true, presence: true, sound: false, autoBudget: true },
    plans: null,
    newGoal: { name: '', type: 'budget', target: 20000, theme: 'coral', emoji: '📚', template: 'study' },
    presenceTick: 0,
    desktop: typeof window !== 'undefined' && window.innerWidth >= 1024,
    inviteUrl: '',
  }

  cloud = false          // true once a reachable backend is confirmed
  _synced = new Map()    // plan id → last-synced JSON, so we only PUT what changed

  // ---------- lifecycle ----------
  componentDidMount() {
    const now = new Date()
    this.TODAY = now.getDate()
    this._onResize = () => {
      const d = window.innerWidth >= 1024
      if (d !== this.state.desktop) this.setState({ desktop: d })
    }
    window.addEventListener('resize', this._onResize)
    // flush the debounced save so a reload right after a change loses nothing
    this._onUnload = () => { clearTimeout(this._saveT); if (!this.cloud) this.persist() }
    window.addEventListener('beforeunload', this._onUnload)
    this._pt = setInterval(() => this.setState((s) => ({ presenceTick: s.presenceTick + 1 })), 4000)
    this._setupDrag()

    // Cloud mode when a backend is configured AND reachable; else guest mode.
    if (hasApi) this.initCloud()
    else this.initGuest()
  }

  initGuest() {
    const now = new Date()
    const yr = now.getFullYear(), mo = now.getMonth(), td = now.getDate()
    let sess = null
    try { sess = localStorage.getItem(SESSION_KEY) } catch (e) { /* private mode */ }
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') } catch (e) { saved = null }
    const fresh = !saved || saved.seedY !== yr || saved.seedM !== mo
    const plans = fresh ? seedPlans(yr, mo, td) : saved.plans
    const market = fresh ? seedMarket() : saved.market
    this.setState({
      plans, market,
      theme: (saved && saved.theme) || 'coral',
      userName: (saved && saved.userName) || '',
      settingsFlags: (saved && saved.settingsFlags) || this.state.settingsFlags,
      addDate: td, selDay: td, year: yr, month: mo,
      authed: !!sess, authEmail: sess || '',
      onboarding: !sess, onbStep: 0,
    })
    this._loadT = setTimeout(() => this.setState({ loading: false }), 850)
    // simulated live reaction (demo flourish) — guest mode only
    this._live = setTimeout(() => {
      this.setState((s) => {
        if (!s.plans) return {}
        const plans2 = s.plans.map((p) => p.id === 1 ? { ...p, sessions: p.sessions.map((x) => x.id === 8 ? { ...x, reactions: { ...x.reactions, '🔥': (x.reactions['🔥'] || 0) + 1 } } : x) } : p)
        return { plans: plans2 }
      })
      this.showToast('🔥', 'ครูท็อป reacted in Uni Prep')
    }, 6500)
  }

  async initCloud() {
    const up = await probe()
    if (!up) { this.initGuest(); return }   // backend down → graceful guest fallback
    this.cloud = true
    const now = new Date()
    const td = now.getDate()
    this.setState({ addDate: td, selDay: td, year: now.getFullYear(), month: now.getMonth() })
    const token = getToken()
    if (token) {
      try { await this.loadCloudState(); return } catch (e) { setToken('') /* stale token */ }
    }
    // not signed in → real auth overlay, empty until verified
    this.setState({ plans: [], market: [], authed: false, loading: false, onboarding: false })
  }

  async loadCloudState() {
    const { user, plans, market } = await api.state()
    this._synced = new Map(plans.map((p) => [p.id, JSON.stringify(stripMeta(p))]))
    this.setState({
      plans, market,
      userName: user?.name || '',
      theme: user?.theme || 'coral',
      authed: true, loading: false,
      authEmail: user?.email || this.state.authEmail,
      activePlanId: plans[0] ? plans[0].id : null,
      onboarding: !user?.onboarded,   // server-tracked: show onboarding once
    })
    await this.consumeInviteFromUrl()
    // light polling so a collaborator's edits show up (honest: polling, not sockets)
    clearInterval(this._poll)
    this._poll = setInterval(() => this.refreshCloud(), 20000)
  }

  async refreshCloud() {
    if (!this.cloud || !this.state.authed || document.hidden) return
    try {
      const { plans } = await api.state()
      this.setState((s) => {
        // don't stomp a plan the user is actively editing this tick
        const localById = new Map((s.plans || []).map((p) => [p.id, p]))
        const merged = plans.map((p) => {
          const local = localById.get(p.id)
          const localJson = local ? JSON.stringify(stripMeta(local)) : null
          const syncedJson = this._synced.get(p.id)
          // if local has unsynced edits, keep local; else take server
          if (local && localJson !== syncedJson) return local
          this._synced.set(p.id, JSON.stringify(stripMeta(p)))
          return p
        })
        return { plans: merged }
      })
    } catch (e) { /* transient */ }
  }

  async consumeInviteFromUrl() {
    let token = null
    try { token = new URLSearchParams(location.search).get('invite') } catch (e) { /* noop */ }
    if (!token) return
    try {
      const { plan } = await api.acceptInvite(token)
      this._synced.set(plan.id, JSON.stringify(stripMeta(plan)))
      this.setState((s) => {
        const others = (s.plans || []).filter((p) => p.id !== plan.id)
        return { plans: [...others, plan], screen: 'plan', tab: 'cal', activePlanId: plan.id, theme: plan.theme, homeTab: 'mine' }
      })
      this.showToast('🤝', 'เข้าร่วมแพลนที่แชร์แล้ว · Joined shared plan!')
    } catch (e) {
      this.showToast('😕', e.status === 410 ? 'ลิงก์หมดอายุ · Invite expired' : 'ลิงก์เชิญไม่ถูกต้อง · Invalid invite')
    } finally {
      try { const u = new URL(location.href); u.searchParams.delete('invite'); history.replaceState({}, '', u) } catch (e) { /* noop */ }
    }
  }

  componentWillUnmount() {
    clearInterval(this._pt); clearInterval(this._poll); clearTimeout(this._live); clearTimeout(this._loadT); clearTimeout(this._toast); clearTimeout(this._aiT); clearTimeout(this._saveT)
    this._teardownDrag && this._teardownDrag()
    window.removeEventListener('resize', this._onResize)
    window.removeEventListener('beforeunload', this._onUnload)
  }

  componentDidUpdate(prevProps, prevState) {
    const st = this.state
    if (st.screen === 'plan' && st.tab === 'ai') {
      const msgChanged = prevState.messages !== st.messages || prevState.aiThinking !== st.aiThinking
      const tabChanged = prevState.tab !== 'ai' || prevState.screen !== 'plan'
      if (msgChanged || tabChanged) {
        const el = document.querySelector('[data-scroll-main]')
        if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
      }
    }
    if (prevState.plans !== st.plans || prevState.market !== st.market || prevState.theme !== st.theme ||
        prevState.userName !== st.userName || prevState.settingsFlags !== st.settingsFlags) {
      clearTimeout(this._saveT)
      this._saveT = setTimeout(() => this.persist(), 300)
    }
    // cloud: sync profile (name/theme) changes to the account
    if (this.cloud && this.state.authed && (prevState.theme !== st.theme || prevState.userName !== st.userName)) {
      clearTimeout(this._profT)
      this._profT = setTimeout(() => { api.saveProfile({ name: st.userName, theme: st.theme }).catch(() => {}) }, 400)
    }
  }

  persist() {
    if (this.cloud) { this.syncCloud(); return }
    const { plans, market, theme, userName, settingsFlags, year, month } = this.state
    if (!plans) return
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ plans, market, theme, userName, settingsFlags, seedY: year, seedM: month }))
    } catch (e) { /* storage full/blocked — demo continues in memory */ }
  }

  // Push any plan whose doc changed since last sync to the server (last-write-wins).
  async syncCloud() {
    const plans = this.state.plans || []
    for (const p of plans) {
      const json = JSON.stringify(stripMeta(p))
      if (this._synced.get(p.id) === json) continue
      this._synced.set(p.id, json)
      try { await api.savePlan(p.id, stripMeta(p)) } catch (e) { this._synced.delete(p.id) /* retry next change */ }
    }
  }

  resetDemo = async () => {
    if (this.cloud) {
      this.setState({ settingsOpen: false, screen: 'home', homeTab: 'mine' })
      try { await this.loadCloudState() } catch (e) { /* noop */ }
      this.showToast('🔄', 'ซิงก์ข้อมูลแล้ว · Synced from cloud')
      return
    }
    try { localStorage.removeItem(STORE_KEY) } catch (e) { /* noop */ }
    const now = new Date()
    this.setState({
      plans: seedPlans(now.getFullYear(), now.getMonth(), now.getDate()),
      market: seedMarket(),
      settingsOpen: false, screen: 'home', homeTab: 'mine', activePlanId: 1, theme: 'coral',
    })
    this.showToast('🧹', 'รีเซ็ตข้อมูลเดโมแล้ว · Demo data reset')
  }

  // ---------- drag day → move sessions ----------
  _setupDrag() {
    let ghost = null, srcDay = null, dragging = false, startX = 0, startY = 0, downDay = null
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.closest('[data-day]') : null }
    const clearHi = () => { document.querySelectorAll('[data-drop-hi]').forEach((e) => { e.style.outline = 'none'; e.removeAttribute('data-drop-hi') }) }
    const onDown = (e) => {
      if (this.state.screen !== 'plan' || this.state.tab !== 'cal') return
      const cell = cellAt(e.clientX, e.clientY)
      if (!cell || cell.getAttribute('data-has') !== 'true') return
      downDay = parseInt(cell.getAttribute('data-day'), 10); startX = e.clientX; startY = e.clientY; dragging = false
    }
    const onMove = (e) => {
      if (downDay == null) return
      if (!dragging) {
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 8) return
        dragging = true; srcDay = downDay
        ghost = document.createElement('div')
        ghost.textContent = srcDay
        ghost.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:44px;height:44px;border-radius:15px;background:' + this.planTheme(this.activePlan()).pc + ';color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Baloo Thai 2",sans-serif;font-weight:800;font-size:16px;box-shadow:0 10px 24px rgba(74,63,85,.35);transform:translate(-50%,-50%) scale(1.05);opacity:.95;'
        document.body.appendChild(ghost)
      }
      if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px' }
      clearHi()
      const cell = cellAt(e.clientX, e.clientY)
      if (cell && cell.getAttribute('data-day') && parseInt(cell.getAttribute('data-day'), 10) !== srcDay) {
        cell.style.outline = '3px dashed ' + this.planTheme(this.activePlan()).pc
        cell.style.outlineOffset = '-2px'
        cell.setAttribute('data-drop-hi', '1')
      }
      e.preventDefault()
    }
    const onUp = (e) => {
      if (dragging) {
        const cell = cellAt(e.clientX, e.clientY)
        const tgt = cell ? parseInt(cell.getAttribute('data-day'), 10) : null
        if (tgt && tgt !== srcDay) {
          const cnt = (this.activePlan() ? this.activePlan().sessions : []).filter((x) => x.day === srcDay).length
          this.setState({ pendingMove: { from: srcDay, to: tgt, count: cnt } })
        }
      }
      clearHi()
      if (ghost) { ghost.remove(); ghost = null }
      downDay = null; srcDay = null; dragging = false
    }
    document.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp, { passive: true })
    this._teardownDrag = () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp) }
  }

  moveDaySessions(from, to) {
    let n = 0
    this.setState((s) => {
      const plans = s.plans.map((p) => {
        if (p.id !== s.activePlanId) return p
        const moved = p.sessions.map((x) => { if (x.day === from) { n++; return { ...x, day: to } } return x })
        return { ...p, sessions: moved }
      })
      return { plans }
    })
    if (n) this.showToast('🗓️', 'ย้าย ' + n + ' คาบ → วันที่ ' + to + ' · Moved to the ' + to + 'th')
  }
  confirmMove = () => { const pm = this.state.pendingMove; if (pm) this.moveDaySessions(pm.from, pm.to); this.setState({ pendingMove: null }) }
  cancelMove = () => this.setState({ pendingMove: null })

  // ---------- helpers ----------
  theme() { return themes[this.state.theme] }
  activePlan() { return (this.state.plans || []).find((p) => p.id === this.state.activePlanId) || null }
  planTheme(plan) { return themes[plan ? plan.theme : this.state.theme] }
  showToast(emoji, text) { this.setState({ toast: { emoji, text } }); clearTimeout(this._toast); this._toast = setTimeout(() => this.setState({ toast: null }), 2800) }

  daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
  firstDow(y, m) { return new Date(y, m, 1).getDay() }
  sessionsFor(plan, day) { return (plan ? plan.sessions : []).filter((s) => s.day === day).sort((a, b) => a.time.localeCompare(b.time)) }

  catRateLabel(c) { const u = catUnit(c); if (u === 'free' || !c.rate) return 'ฟรี · Free'; if (u === 'session') return '฿' + c.rate + '/คาบ'; return '฿' + c.rate + '/hr' }
  catRateShort(c) { const u = catUnit(c); if (u === 'free' || !c.rate) return 'ฟรี'; if (u === 'session') return '฿' + c.rate + '/คาบ'; return '฿' + c.rate + '/hr' }

  targetStep(type) { return { budget: 1000, hours: 2, sessions: 1, window: 7 }[type] || 1 }
  targetText(type, val) { const n = val || 0; if (type === 'budget') return '฿' + fmt(n); if (type === 'hours') return n + ' ชม.'; if (type === 'sessions') return n + ' คาบ'; if (type === 'window') return n + ' วัน'; return '' + n }
  bumpTarget(type, val, dir) { const step = this.targetStep(type); return Math.max(step, (val || 0) + dir * step) }

  planMetric(plan) {
    const t = this.planTheme(plan)
    const sess = plan.sessions || []
    const spent = sess.reduce((a, s) => a + s.cost, 0)
    const hours = sess.reduce((a, s) => a + s.hours, 0)
    const count = sess.length
    const catTargets = Object.values(plan.categories).reduce((a, c) => a + (c.target || 0), 0)
    const meta = goalTypeMeta[plan.goalType]
    let pct, big, sub, remain
    if (plan.goalType === 'budget') {
      pct = Math.min(100, Math.round(spent / plan.budgetTotal * 100))
      big = '฿' + fmt(spent); sub = 'ใช้จาก ฿' + fmt(plan.budgetTotal); remain = 'เหลือ ฿' + fmt(Math.max(0, plan.budgetTotal - spent))
    } else if (plan.goalType === 'hours') {
      pct = Math.min(100, Math.round(hours / plan.hoursGoal * 100))
      big = hours + ' / ' + plan.hoursGoal + ' ชม.'; sub = 'ชั่วโมงสะสม'; remain = 'อีก ' + Math.max(0, plan.hoursGoal - hours) + ' ชม.'
    } else if (plan.goalType === 'sessions') {
      pct = Math.min(100, Math.round(count / (catTargets || 1) * 100))
      big = count + ' / ' + (catTargets || count); sub = 'คาบที่จองแล้ว'; remain = 'อีก ' + Math.max(0, catTargets - count) + ' คาบ'
    } else {
      const left = Math.max(0, plan.deadlineDays - plan.elapsedDays)
      pct = Math.min(100, Math.round(plan.elapsedDays / plan.deadlineDays * 100))
      big = left + ' วัน'; sub = plan.deadlineLabel || 'ถึงกำหนด'; remain = count + ' คาบแล้ว'
    }
    return { pct, big, sub, remain, spent, hours, count, meta, t, catTargets }
  }

  // ---------- auth ----------
  sendCode = async () => {
    const email = (this.state.authEmail || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.setState({ authError: 'กรุณาใส่อีเมลให้ถูกต้อง · Enter a valid email' }); return }
    if (this.cloud) {
      try {
        const r = await api.requestCode(email)
        this.setState({ authStep: 'otp', authCode: r.demoCode || '', authOtp: '', authError: '' })
      } catch (e) { this.setState({ authError: 'ส่งโค้ดไม่สำเร็จ ลองใหม่ · Could not send code' }) }
      return
    }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    this.setState({ authStep: 'otp', authCode: code, authOtp: '', authError: '' })
  }
  setAuthEmail = (e) => this.setState({ authEmail: e.target.value, authError: '' })
  emailKey = (e) => { if (e.key === 'Enter') this.sendCode() }
  setAuthOtp = (e) => {
    const v = (e.target.value || '').replace(/\D/g, '').slice(0, 6)
    this.setState({ authOtp: v, authError: '' })
    if (v.length === 6) setTimeout(() => this.verifyOtp(), 120)
  }
  otpKey = (e) => { if (e.key === 'Enter') this.verifyOtp() }
  verifyOtp = async () => {
    if (this.cloud) {
      try {
        const { token } = await api.verify((this.state.authEmail || '').trim(), (this.state.authOtp || '').trim())
        setToken(token)
        this.setState({ authError: '', authOtp: '' })
        await this.loadCloudState()
        this.showToast('🎉', 'เข้าสู่ระบบแล้ว · Signed in!')
      } catch (e) {
        const msg = e.status === 429 ? 'พยายามมากเกินไป · Too many tries' : 'โค้ดไม่ถูกต้อง · Incorrect code'
        this.setState({ authError: msg, authOtp: '' })
      }
      return
    }
    if (this.state.authOtp !== this.state.authCode) { this.setState({ authError: 'โค้ดไม่ถูกต้อง · Incorrect code', authOtp: '' }); return }
    try { localStorage.setItem(SESSION_KEY, this.state.authEmail.trim()) } catch (err) { /* noop */ }
    this.setState({ authed: true, authError: '', authOtp: '' })
    this.showToast('🎉', 'เข้าสู่ระบบแล้ว · Signed in!')
  }
  resendCode = async () => {
    if (this.cloud) {
      try { const r = await api.requestCode((this.state.authEmail || '').trim()); this.setState({ authCode: r.demoCode || '', authOtp: '', authError: '' }) } catch (e) { /* noop */ }
      this.showToast('💌', 'ส่งโค้ดใหม่แล้ว · Code resent'); return
    }
    const code = String(Math.floor(100000 + Math.random() * 900000)); this.setState({ authCode: code, authOtp: '', authError: '' }); this.showToast('💌', 'ส่งโค้ดใหม่แล้ว · Code resent')
  }
  changeEmail = () => this.setState({ authStep: 'email', authOtp: '', authError: '' })
  signOut = () => {
    clearInterval(this._poll)
    if (this.cloud) { setToken(''); this._synced = new Map() }
    try { localStorage.removeItem(SESSION_KEY) } catch (e) { /* noop */ }
    this.setState({ authed: false, authStep: 'email', authEmail: '', authOtp: '', authCode: '', settingsOpen: false, screen: 'home', tab: 'cal', homeTab: 'mine', ...(this.cloud ? { plans: [], market: this.state.market } : {}) })
  }

  // ---------- onboarding (stepped — Liven/ABY pattern) ----------
  onbNext = () => {
    const st = this.state
    if (st.onbStep < 2) { this.setState({ onbStep: st.onbStep + 1 }); return }
    // finish: apply name + optionally open create sheet seeded with chosen template
    const name = (st.onbName || '').trim()
    const tpl = TEMPLATES.find((t) => t.key === st.onbTemplate)
    const next = { onboarding: false, onbStep: 0 }
    if (name) next.userName = name
    if (tpl) {
      next.newGoal = { name: '', type: tpl.type, target: DEFAULT_TARGET[tpl.type], theme: tpl.theme, emoji: tpl.ce, template: tpl.key }
      next.createOpen = true
      next.homeTab = 'mine'
    }
    this.setState(next)
    if (this.cloud) api.saveProfile({ onboarded: true, ...(name ? { name } : {}) }).catch(() => {})
    if (name) this.showToast('👋', 'ยินดีต้อนรับคุณ' + name + ' · Welcome!')
  }
  onbSkip = () => { this.setState({ onboarding: false, onbStep: 0 }); if (this.cloud) api.saveProfile({ onboarded: true }).catch(() => {}) }
  replayOnboarding = () => this.setState({ settingsOpen: false, onboarding: true, onbStep: 0 })

  // ---------- plans ----------
  openPlan(id) {
    const p = (this.state.plans || []).find((x) => x.id === id)
    this.setState({ screen: 'plan', tab: 'cal', activePlanId: id, theme: p ? p.theme : this.state.theme, addSubj: p ? Object.keys(p.categories)[0] : null })
  }
  pickTemplate(tp) { this.setState((s) => ({ newGoal: { ...s.newGoal, template: tp.key, type: tp.type, theme: tp.theme, emoji: tp.ce, target: DEFAULT_TARGET[tp.type] } })) }
  pickGoalType(k) { this.setState((s) => ({ newGoal: { ...s.newGoal, type: k, target: DEFAULT_TARGET[k] } })) }
  toggleFlag(key) { this.setState((s) => ({ settingsFlags: { ...s.settingsFlags, [key]: !s.settingsFlags[key] } })) }

  toggleReaction(id, emoji) {
    this.setState((s) => {
      const plans = s.plans.map((p) => p.id === s.activePlanId ? { ...p, sessions: p.sessions.map((x) => { if (x.id !== id) return x; const r = { ...x.reactions }; if (r[emoji]) delete r[emoji]; else r[emoji] = 1; return { ...x, reactions: r } }) } : p)
      return { plans }
    })
    this.showToast(emoji, 'รีแอคชันของคุณ · Reaction sent')
  }

  addComment = () => {
    const text = (this.state.commentDraft || '').trim()
    if (!text || !this.state.selSlot) return
    this.setState((s) => {
      const plans = s.plans.map((p) => p.id === s.activePlanId ? { ...p, sessions: p.sessions.map((x) => x.id === s.selSlot ? { ...x, comments: [...x.comments, { author: 'You', initials: (s.userName || 'พ').charAt(0), color: this.theme().pc, text, time: 'now' }] } : x) } : p)
      return { plans, commentDraft: '' }
    })
  }

  saveSession = () => {
    const st = this.state, plan = this.activePlan()
    if (!plan) return
    const subjKey = st.addSubj && plan.categories[st.addSubj] ? st.addSubj : Object.keys(plan.categories)[0]
    const subj = plan.categories[subjKey]
    const cost = catCost(subj, st.addHours)
    const fit = plan.kind === 'fitness' ? { sets: st.addSets, reps: st.addReps, intensity: st.addIntensity } : {}
    this.setState((s) => {
      const plans = s.plans.map((p) => {
        if (p.id !== s.activePlanId) return p
        const nid = Math.max(0, ...p.sessions.map((x) => x.id)) + 1
        return { ...p, sessions: [...p.sessions, { id: nid, day: st.addDate, subj: subjKey, time: st.addTime, hours: st.addHours, cost, done: false, reactions: {}, comments: [], ...fit }] }
      })
      // Peloton-style confirmation instead of toast-only feedback
      return { plans, addOpen: false, dayOpen: false, booked: { subjKey, day: st.addDate, time: st.addTime, hours: st.addHours, cost } }
    })
  }
  closeBooked = () => this.setState({ booked: null })
  viewBookedDay = () => this.setState((s) => ({ booked: null, dayOpen: true, selDay: s.booked ? s.booked.day : s.selDay, tab: 'cal' }))

  buildNewPlan() {
    const ng = this.state.newGoal; const th = themes[ng.theme]
    const catName = { study: { th: 'คาบติว', en: 'Lesson', short: 'LES' }, fitness: { th: 'คาบเทรน', en: 'Training', short: 'PT' }, deadline: { th: 'คาบเตรียมสอบ', en: 'Prep session', short: 'PREP' }, music: { th: 'คาบเรียน', en: 'Practice', short: 'PRC' }, custom: { th: 'คาบ', en: 'Session', short: 'SES' } }[ng.template] || { th: 'คาบ', en: 'Session', short: 'SES' }
    const rate = { study: 300, fitness: 500, deadline: 450, music: 400, custom: 300 }[ng.template] || 300
    const kind = ng.template === 'fitness' ? 'fitness' : 'study'
    const catTarget = ng.type === 'sessions' ? ng.target : 12
    const cats = { MAIN: { th: catName.th, en: catName.en, short: catName.short, color: th.pc, soft: th.soft, ins: 'me', rate, target: catTarget } }
    return {
      name: ng.name || 'เป้าหมายใหม่', en: 'New goal', emoji: ng.emoji, theme: ng.theme, goalType: ng.type, kind,
      budgetTotal: ng.type === 'budget' ? ng.target : 15000, hoursGoal: ng.type === 'hours' ? ng.target : 40,
      deadlineDays: ng.type === 'window' ? ng.target : 30, elapsedDays: 0, deadlineLabel: 'อีก ' + (ng.type === 'window' ? ng.target : 30) + ' วัน',
      categories: cats, sessions: [],
    }
  }
  createPlan = async () => {
    const ng = this.state.newGoal
    const body = this.buildNewPlan()
    const resetNg = { name: '', type: 'budget', target: 20000, theme: 'coral', emoji: '📚', template: 'study' }
    if (this.cloud) {
      try {
        const { plan } = await api.createPlan(body)
        this._synced.set(plan.id, JSON.stringify(stripMeta(plan)))
        this.setState((s) => ({ plans: [...s.plans, plan], createOpen: false, screen: 'plan', tab: 'cal', activePlanId: plan.id, theme: ng.theme, addSubj: 'MAIN', newGoal: resetNg }))
        this.showToast('✨', 'สร้างเป้าหมายแล้ว · Goal created!')
      } catch (e) { this.showToast('😕', 'สร้างไม่สำเร็จ ลองใหม่ · Could not create') }
      return
    }
    this.setState((s) => {
      const nid = Math.max(0, ...s.plans.map((p) => (typeof p.id === 'number' ? p.id : 0))) + 1
      const plan = { id: nid, ...body }
      return { plans: [...s.plans, plan], createOpen: false, screen: 'plan', tab: 'cal', activePlanId: nid, theme: ng.theme, addSubj: 'MAIN', newGoal: resetNg }
    })
    this.showToast('✨', 'สร้างเป้าหมายแล้ว · Goal created!')
  }

  editTargetOptionsFor(plan) {
    if (!plan) return []
    const th = this.planTheme(plan)
    const cur = plan.goalType === 'budget' ? plan.budgetTotal : plan.goalType === 'hours' ? plan.hoursGoal : plan.goalType === 'window' ? plan.deadlineDays : Object.values(plan.categories).reduce((a, c) => a + (c.target || 0), 0)
    const sel = this.state.editTargetVal != null ? this.state.editTargetVal : cur
    const sets = TARGET_SETS[plan.goalType] || []
    return sets.map(([val, lab]) => {
      const active = sel === val
      return { label: lab, onTap: () => this.setState({ editTargetVal: val }), style: `border:2px solid ${active ? th.pc : '#EEE6F3'};background:${active ? th.soft : '#fff'};color:${active ? th.pc : '#8A7C93'};border-radius:14px;padding:11px 16px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;` }
    })
  }
  openEditTarget = () => {
    const p = this.activePlan(); if (!p) return
    const cur = p.goalType === 'budget' ? p.budgetTotal : p.goalType === 'hours' ? p.hoursGoal : p.goalType === 'window' ? p.deadlineDays : Object.values(p.categories).reduce((a, c) => a + (c.target || 0), 0)
    this.setState({ editTargetOpen: true, editTargetVal: cur })
  }
  saveEditTarget = () => {
    const v = this.state.editTargetVal
    if (v == null) { this.setState({ editTargetOpen: false }); return }
    this.setState((s) => {
      const plans = s.plans.map((p) => {
        if (p.id !== s.activePlanId) return p
        const np = { ...p }
        if (p.goalType === 'budget') np.budgetTotal = v
        else if (p.goalType === 'hours') np.hoursGoal = v
        else if (p.goalType === 'window') { np.deadlineDays = v; np.elapsedDays = Math.min(np.elapsedDays, v); np.deadlineLabel = 'อีก ' + v + ' วัน' }
        else {
          const keys = Object.keys(np.categories); const per = Math.round(v / keys.length); const cats = {}
          keys.forEach((k, i) => { cats[k] = { ...np.categories[k], target: i === keys.length - 1 ? v - per * (keys.length - 1) : per } })
          np.categories = cats
        }
        return np
      })
      return { plans, editTargetOpen: false }
    })
    this.showToast('✎', 'อัปเดตเป้าหมายแล้ว · Target updated!')
  }

  openPlanEdit = () => {
    const p = this.activePlan(); if (!p) return
    const cur = p.goalType === 'budget' ? p.budgetTotal : p.goalType === 'hours' ? p.hoursGoal : p.goalType === 'window' ? p.deadlineDays : Object.values(p.categories).reduce((a, c) => a + (c.target || 0), 0)
    const cats = Object.keys(p.categories).map((k) => { const c = p.categories[k]; return { key: k, en: c.en, th: c.th, rate: c.rate, target: c.target, color: c.color, unit: catUnit(c), ins: c.ins || 'me' } })
    this.setState({ planEditOpen: true, editDraft: { name: p.name, emoji: p.emoji, theme: p.theme, goalType: p.goalType, target: cur, cats } })
  }
  setEdType(k) { this.setState((s) => ({ editDraft: { ...s.editDraft, goalType: k, target: DEFAULT_TARGET[k] } })) }
  setCat(i, field, value) { this.setState((s) => { const cats = s.editDraft.cats.map((c, idx) => idx === i ? { ...c, [field]: value } : c); return { editDraft: { ...s.editDraft, cats } } }) }
  removeCat(i) { this.setState((s) => { if (s.editDraft.cats.length <= 1) return {}; const cats = s.editDraft.cats.filter((_, idx) => idx !== i); return { editDraft: { ...s.editDraft, cats } } }) }
  addCat = () => {
    this.setState((s) => {
      const pal = ['#FF8AA0', '#6AAEF5', '#4FC7A8', '#F4A94C', '#B18AF0', '#7BD9E0']
      const color = pal[s.editDraft.cats.length % pal.length]
      return { editDraft: { ...s.editDraft, cats: [...s.editDraft.cats, { key: 'C' + Date.now(), en: 'New category', th: 'หมวดใหม่', rate: 300, target: 8, color, unit: 'hr', ins: 'me' }] } }
    })
  }
  savePlanEdit = () => {
    const ed = this.state.editDraft; if (!ed) return
    this.setState((s) => {
      const plans = s.plans.map((p) => {
        if (p.id !== s.activePlanId) return p
        const cats = {}; const validKeys = new Set()
        ed.cats.forEach((c) => {
          const key = c.key; validKeys.add(key); const old = p.categories[key] || {}; const unit = c.unit || 'hr'
          cats[key] = { th: c.th || old.th || c.en, en: c.en || 'Category', short: old.short || c.en.slice(0, 3).toUpperCase(), color: c.color, soft: softOf(c.color), ins: c.ins || old.ins || 'me', rate: unit === 'free' ? 0 : c.rate, target: c.target, unit }
        })
        const firstKey = ed.cats[0].key
        const sessions = p.sessions.map((x) => validKeys.has(x.subj) ? x : { ...x, subj: firstKey })
        const np = { ...p, name: ed.name || p.name, emoji: ed.emoji, theme: ed.theme, goalType: ed.goalType, categories: cats, sessions }
        if (ed.goalType === 'budget') np.budgetTotal = ed.target
        else if (ed.goalType === 'hours') np.hoursGoal = ed.target
        else if (ed.goalType === 'window') { np.deadlineDays = ed.target; np.elapsedDays = Math.min(p.elapsedDays || 0, ed.target); np.deadlineLabel = 'อีก ' + ed.target + ' วัน' }
        return np
      })
      return { plans, planEditOpen: false, theme: ed.theme }
    })
    this.showToast('✨', 'บันทึกการตั้งค่าแล้ว · Plan updated!')
  }
  deletePlan = async () => {
    const id = this.state.activePlanId
    if (this.cloud) { try { await api.deletePlan(id) } catch (e) { /* keep local removal anyway */ } this._synced.delete(id) }
    this.setState((s) => {
      const plans = s.plans.filter((p) => p.id !== id)
      return { plans, planEditOpen: false, screen: 'home', homeTab: 'mine', activePlanId: plans[0] ? plans[0].id : null }
    })
    this.showToast('🗑️', 'ลบแพลนแล้ว · Plan deleted')
  }

  likeMarket = () => {
    const id = this.state.selMarket
    if (this.cloud) api.likeMarket(id).catch(() => {})
    this.setState((s) => { const market = s.market.map((m) => m.id === id ? { ...m, likes: m.likes + 1 } : m); return { market } })
    this.showToast('❤️', 'ถูกใจแล้ว · Liked!')
  }
  copyMarket = async () => {
    const item = (this.state.market || []).find((x) => x.id === this.state.selMarket); if (!item) return
    if (this.cloud) {
      try {
        const { plan } = await api.copyMarket(item.id)
        this._synced.set(plan.id, JSON.stringify(stripMeta(plan)))
        this.setState((s) => ({ plans: [...s.plans, plan], market: s.market.map((m) => m.id === item.id ? { ...m, uses: m.uses + 1 } : m), marketOpen: false, screen: 'plan', tab: 'cal', activePlanId: plan.id, theme: item.theme, homeTab: 'mine', addSubj: Object.keys(plan.categories)[0] }))
        this.showToast('🎉', 'คัดลอกแล้ว! เริ่มวางแผนได้เลย · Copied to your plans')
      } catch (e) { this.showToast('😕', 'คัดลอกไม่สำเร็จ · Could not copy') }
      return
    }
    this.setState((s) => {
      const nid = Math.max(0, ...s.plans.map((p) => (typeof p.id === 'number' ? p.id : 0))) + 1
      const cats = {}; Object.keys(item.categories).forEach((k) => { cats[k] = { ...item.categories[k] } })
      const plan = { id: nid, name: item.name, en: item.en, emoji: item.emoji, theme: item.theme, kind: item.kind, goalType: item.goalType,
        budgetTotal: item.budgetTotal, hoursGoal: item.hoursGoal, deadlineDays: item.deadlineDays, elapsedDays: 0, deadlineLabel: 'อีก ' + item.deadlineDays + ' วัน',
        categories: cats, sessions: [] }
      const market = s.market.map((m) => m.id === item.id ? { ...m, uses: m.uses + 1 } : m)
      return { plans: [...s.plans, plan], market, marketOpen: false, screen: 'plan', tab: 'cal', activePlanId: nid, theme: item.theme, homeTab: 'mine', addSubj: Object.keys(cats)[0] }
    })
    this.showToast('🎉', 'คัดลอกแล้ว! เริ่มวางแผนได้เลย · Copied to your plans')
  }
  doPublish = async () => {
    const plan = this.activePlan(); if (!plan) return
    if (this.cloud) {
      try {
        const { item } = await api.publish(stripMeta(plan))
        this.setState((s) => ({ market: [item, ...s.market], publishOpen: false }))
        this.showToast('🚀', 'เผยแพร่แล้ว! อยู่ในมาร์เก็ตแล้ว · Published to Explore')
      } catch (e) { this.showToast('😕', 'เผยแพร่ไม่สำเร็จ · Could not publish') }
      return
    }
    this.setState((s) => {
      const nid = Math.max(200, ...s.market.map((m) => (typeof m.id === 'number' ? m.id : 200))) + 1
      const cats = {}; Object.keys(plan.categories).forEach((k) => { cats[k] = { ...plan.categories[k] } })
      const author = (s.userName || 'พิมพ์ชนก') + ' (You)'
      const item = { id: nid, emoji: plan.emoji, name: plan.name, en: plan.en || 'My goal', theme: plan.theme, kind: plan.kind, goalType: plan.goalType,
        author, authorInitials: (s.userName || 'พ').charAt(0), authorColor: themes[plan.theme].pc, likes: 0, uses: 0,
        desc: 'แพลนที่ฉันสร้างเองและเผยแพร่ให้ทุกคนคัดลอกไปใช้ได้ 💛 · A goal I built and shared with the community.',
        budgetTotal: plan.budgetTotal, hoursGoal: plan.hoursGoal, deadlineDays: plan.deadlineDays, categories: cats }
      return { market: [item, ...s.market], publishOpen: false }
    })
    this.showToast('🚀', 'เผยแพร่แล้ว! อยู่ในมาร์เก็ตแล้ว · Published to Explore')
  }
  doInvite = async () => {
    if (!this.cloud) { this.showToast('🔗', 'คัดลอกลิงก์แล้ว · Invite link copied!'); return }
    const plan = this.activePlan(); if (!plan) return
    try {
      const { token } = await api.invite(plan.id)
      const url = `${location.origin}/?invite=${token}`
      try { await navigator.clipboard.writeText(url) } catch (e) { /* clipboard blocked */ }
      this.setState({ inviteUrl: url })
      this.showToast('🔗', 'คัดลอกลิงก์เชิญแล้ว · Invite link copied!')
    } catch (e) { this.showToast('😕', 'สร้างลิงก์ไม่สำเร็จ · Could not create link') }
  }
  rescheduleSlot = () => {
    const plan = this.activePlan(); if (!plan) return
    const s = plan.sessions.find((x) => x.id === this.state.selSlot); if (!s) return
    this.setState({ reschedOpen: true, reschedId: this.state.selSlot })
  }
  moveSingleSession(day) {
    const id = this.state.reschedId
    this.setState((s) => {
      const plans = s.plans.map((p) => p.id === s.activePlanId ? { ...p, sessions: p.sessions.map((x) => x.id === id ? { ...x, day } : x) } : p)
      return { plans, reschedOpen: false, slotOpen: false }
    })
    this.showToast('🗓️', 'ย้ายไปวันที่ ' + day + ' แล้ว · Rescheduled!')
  }

  // ---------- AI (local heuristic assistant) ----------
  sendChat = () => { const q = (this.state.chatInput || '').trim(); if (q) this.sendChatWith(q) }
  sendChatWith(q) {
    this.setState((s) => ({ messages: [...s.messages, { id: Date.now(), isAi: false, text: q }], chatInput: '', aiThinking: true }))
    const plan = this.activePlan()
    const m = plan ? this.planMetric(plan) : null
    clearTimeout(this._aiT)
    this._aiT = setTimeout(() => {
      const reply = assistantReply(plan, m, q)
      this.setState((s) => ({ messages: [...s.messages, { id: Date.now(), isAi: true, text: reply }], aiThinking: false }))
    }, 800 + Math.random() * 500)
  }

  // ---------- computed view values ----------
  renderVals() {
    const st = this.state, t = this.theme(), TODAY = this.TODAY
    const plans = st.plans || []
    const g = { pc: t.pc, pc2: t.pc2, pcSoft: t.soft, pcBorder: t.border, pcShadow: t.shadow }
    const f = fmt

    const isHome = st.screen === 'home'
    const homeMine = isHome && st.homeTab === 'mine'
    const homeMarket = isHome && st.homeTab === 'market'
    const inPlan = st.screen === 'plan'
    const isCal = inPlan && st.tab === 'cal'
    const isGoals = inPlan && st.tab === 'goals'
    const isTeam = inPlan && st.tab === 'team'
    const isAI = inPlan && st.tab === 'ai'
    const plan = this.activePlan()
    const pt = plan ? this.planTheme(plan) : t

    // ---- HOME plan cards ----
    const planCards = plans.map((p) => {
      const m = this.planMetric(p)
      const insKeys = [...new Set(Object.values(p.categories).map((c) => c.ins))].slice(0, 3)
      const avatars = insKeys.map((k, i) => { const pp = people[k] || people.me; return { initials: pp.initials, style: `width:26px;height:26px;border-radius:50%;background:${pp.color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11px;margin-left:${i === 0 ? 0 : -8}px;` } })
      return {
        id: p.id,
        onTap: () => this.openPlan(p.id),
        emoji: p.emoji, name: p.name, en: p.en,
        iconStyle: `width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,${m.t.pc},${m.t.pc2});display:flex;align-items:center;justify-content:center;font-size:26px;flex:none;box-shadow:0 6px 14px ${m.t.shadow};`,
        glow: `position:absolute;top:-40px;right:-30px;width:120px;height:120px;border-radius:50%;background:${m.t.soft};opacity:.6;`,
        typeLabel: m.meta.title, typeBadge: `flex:none;background:${m.t.soft};color:${m.t.pc};border-radius:11px;padding:4px 10px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10.5px;`,
        big: m.big, color: m.t.pc, pctText: m.pct + '%',
        barStyle: `height:100%;width:${m.pct}%;border-radius:8px;background:linear-gradient(90deg,${m.t.pc},${m.t.pc2});transition:width .6s cubic-bezier(.34,1.56,.64,1);`,
        avatars, metaText: m.count + ' คาบ · ' + insKeys.length + ' คน',
      }
    })

    // ---- MARKET (search + filter — Airtable/Craft gallery pattern) ----
    const market = st.market || []
    const q = st.marketQuery.trim().toLowerCase()
    const marketFiltered = market.filter((item) => {
      if (st.marketFilter !== 'all' && item.kind !== st.marketFilter) return false
      if (!q) return true
      return (item.name + ' ' + item.en + ' ' + item.desc + ' ' + item.author).toLowerCase().includes(q)
    })
    const mkCard = (item) => {
      const mt = themes[item.theme]; const catCount = Object.keys(item.categories).length
      return {
        item, id: item.id, emoji: item.emoji, name: item.name, en: item.en, color: mt.pc,
        iconStyle: `width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,${mt.pc},${mt.pc2});display:flex;align-items:center;justify-content:center;font-size:26px;flex:none;box-shadow:0 6px 14px ${mt.shadow};`,
        glow: `position:absolute;top:-40px;right:-30px;width:120px;height:120px;border-radius:50%;background:${mt.soft};opacity:.6;`,
        typeLabel: goalTypeMeta[item.goalType].title, typeBadge: `flex:none;background:${mt.soft};color:${mt.pc};border-radius:11px;padding:4px 10px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10.5px;`,
        desc: item.desc, author: item.author, authorInitials: item.authorInitials, likes: f(item.likes), uses: f(item.uses),
        authorAvatar: `width:24px;height:24px;border-radius:50%;background:${item.authorColor};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11px;`,
        catCount,
      }
    }
    const marketCards = marketFiltered.map((item) => ({ ...mkCard(item), onTap: () => this.setState({ marketOpen: true, selMarket: item.id }) }))
    const marketFilters = [
      { key: 'all', label: '✨ ทั้งหมด' }, { key: 'study', label: '📚 เรียน' }, { key: 'fitness', label: '💪 ฟิตเนส' },
    ].map((c) => {
      const active = st.marketFilter === c.key
      return { label: c.label, onTap: () => this.setState({ marketFilter: c.key }), style: `flex:none;border:none;border-radius:13px;padding:8px 13px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12.5px;transition:all .2s;${active ? `background:${t.pc};color:#fff;box-shadow:0 6px 14px ${t.shadow};` : 'background:rgba(255,255,255,.8);color:#A99BB5;'}` }
    })

    let mkd = { headStyle: '', cats: [] }
    if (st.selMarket) {
      const item = market.find((x) => x.id === st.selMarket)
      if (item) {
        const mt = themes[item.theme]; const c = mkCard(item)
        mkd = { emoji: item.emoji, name: item.name, en: item.en, typeLabel: c.typeLabel, likes: c.likes, uses: c.uses, desc: item.desc, author: item.author, authorInitials: item.authorInitials, catCount: c.catCount, color: mt.pc, soft: mt.soft, shadow: mt.shadow,
          headStyle: `padding:16px 20px 18px;background:linear-gradient(135deg,${mt.pc},${mt.pc2});flex:none;`,
          authorAvatar: `width:38px;height:38px;border-radius:13px;background:${item.authorColor};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:15px;flex:none;`,
          cats: Object.values(item.categories).map((cc) => ({ en: cc.en, color: cc.color, target: cc.target })) }
      }
    }

    // ---- header ----
    let headerTitle = 'แพลนของฉัน', headerSub = 'My study & training plans', viewingText = '📌 ' + plans.length + ' เป้าหมายกำลังทำงาน · ' + plans.length + ' active goals'
    if (homeMarket) { headerTitle = 'มาร์เก็ต'; headerSub = 'Explore & copy community goals'; viewingText = '🛍️ ' + marketFiltered.length + ' แพลนให้คัดลอก · templates to copy' }
    if (inPlan && plan) {
      const online = [...new Set(Object.values(plan.categories).map((c) => c.ins))].filter((k) => people[k] && people[k].online).length
      if (isCal) { headerTitle = monthTH[st.month]; headerSub = plan.emoji + ' ' + plan.name }
      else if (isGoals) { headerTitle = 'เป้าหมาย'; headerSub = plan.emoji + ' ' + plan.name }
      else if (isTeam) { headerTitle = 'ทีมของแพลน'; headerSub = plan.emoji + ' ' + plan.name }
      else if (isAI) { headerTitle = 'ผู้ช่วย AI'; headerSub = plan.emoji + ' ' + plan.name }
      viewingText = '👀 ' + (online + 1) + ' คนกำลังดูแพลนนี้ · viewing now'
      if (isAI) viewingText = '✨ รู้ข้อมูลทุกเป้าหมายของคุณ · knows all your goals'
    }

    // ---- presence ----
    let presKeys = ['me', 'kru_nan', 'kru_top']
    if (inPlan && plan) presKeys = ['me', ...new Set(Object.values(plan.categories).map((c) => c.ins))].slice(0, 3)
    const presenceAvatars = presKeys.filter((k) => people[k]).map((k, i) => {
      const p = people[k]
      return { name: p.en, initials: p.initials, online: p.online, wrap: `position:relative;margin-left:${i === 0 ? 0 : -9}px;z-index:${10 - i};`, style: `width:30px;height:30px;border-radius:50%;background:${p.color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12px;` }
    })

    // ---- calendar ----
    const weekdays = dowTH.map((d, i) => ({ label: d, style: `text-align:center;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:11px;color:${i === 0 || i === 6 ? '#D6A0B5' : '#B0A4BC'};padding:4px 0;` }))
    const dim = this.daysInMonth(st.year, st.month), fd = this.firstDow(st.year, st.month)
    const cells = []
    for (let i = 0; i < fd; i++) cells.push({ key: 'pad' + i, dayNum: '', style: 'aspect-ratio:1;background:transparent;border:none;padding:0;', numStyle: '', dots: [], onTap: () => {} })
    if (plan) {
      const dotSize = st.desktop ? 6 : 5
      const numSize = st.desktop ? 15.5 : 14
      const cellRadius = st.desktop ? 18 : 15
      for (let d = 1; d <= dim; d++) {
        const ds = this.sessionsFor(plan, d), isToday = d === TODAY, has = ds.length > 0
        const dots = ds.slice(0, 3).map((s) => ({ style: `width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${plan.categories[s.subj] ? plan.categories[s.subj].color : pt.pc};` }))
        let bg = has ? '#fff' : 'rgba(255,255,255,.45)'
        if (isToday) bg = pt.pc
        cells.push({
          key: 'd' + d, dayNum: d,
          style: `aspect-ratio:1;border:none;border-radius:${cellRadius}px;background:${bg};cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:${has && !isToday ? '0 4px 10px rgba(180,120,150,.1)' : (isToday ? '0 6px 14px ' + pt.shadow : 'none')};padding:0;`,
          numStyle: `font-family:'Baloo Thai 2',sans-serif;font-weight:${isToday ? 800 : 600};font-size:${numSize}px;color:${isToday ? '#fff' : (has ? '#4A3F55' : '#B7A9C2')};`,
          dots, hasSess: has, onTap: () => this.setState({ dayOpen: true, selDay: d }),
        })
      }
    }
    const legendTitle = plan ? (plan.goalType === 'hours' ? 'กิจกรรม · Activities' : 'หมวดหมู่ · Categories') : 'หมวดหมู่'
    const legend = plan ? Object.keys(plan.categories).map((k) => {
      const s = plan.categories[k], ins = people[s.ins] || people.me
      const count = plan.sessions.filter((x) => x.subj === k).length
      return { th: s.th, en: s.en, insEn: ins.en, rateLabel: this.catRateShort(s), color: s.color, count, dotStyle: `width:14px;height:14px;border-radius:6px;background:${s.color};flex:none;` }
    }) : []

    // ---- up-next card (Airbnb Trips pattern) ----
    let upNext = null
    if (plan && isCal) {
      const upcoming = plan.sessions.filter((s) => s.day >= TODAY).sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time))[0]
      if (upcoming && plan.categories[upcoming.subj]) {
        const subj = plan.categories[upcoming.subj]
        const ins = people[subj.ins] || people.me
        const dLeft = upcoming.day - TODAY
        upNext = {
          onTap: () => this.setState({ dayOpen: true, selDay: upcoming.day }),
          stripe: `width:5px;border-radius:4px;background:${subj.color};flex:none;`,
          badge: dLeft === 0 ? 'วันนี้ · TODAY' : dLeft === 1 ? 'พรุ่งนี้ · TOMORROW' : 'ในอีก ' + dLeft + ' วัน · IN ' + dLeft + ' DAYS',
          badgeStyle: `flex:none;background:${subj.soft};color:${subj.color};border-radius:10px;padding:3px 9px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10px;`,
          title: subj.th + ' · ' + subj.en,
          sub: upcoming.day + ' ' + monthTH[st.month].slice(0, 3) + '. · ' + upcoming.time + ' · ' + ins.en,
        }
      }
    }

    // ---- goals (type-adaptive) ----
    let goalPrimary = {}, goalSecondary = [], subjectGoals = []
    const perCatTitle = 'คาบต่อหมวด · Per category 🎯'
    let momentum = null
    if (plan) {
      const m = this.planMetric(plan)
      goalPrimary = { kicker: m.meta.kicker, emoji: m.meta.emoji, big: m.big, sub: m.sub, pctText: m.pct + '% ', remainText: m.remain,
        barStyle: `height:100%;width:${m.pct}%;border-radius:10px;background:rgba(255,255,255,.95);transition:width .6s cubic-bezier(.34,1.56,.64,1);` }
      const budgetPct = Math.min(100, Math.round(m.spent / plan.budgetTotal * 100))
      const hoursPct = Math.min(100, Math.round(m.hours / plan.hoursGoal * 100))
      const timePct = Math.min(100, Math.round(plan.elapsedDays / plan.deadlineDays * 100))
      const cBudget = { label: 'งบใช้ไป · SPENT', value: '฿' + f(m.spent), size: '22px', barStyle: `height:100%;width:${budgetPct}%;border-radius:8px;background:linear-gradient(90deg,${pt.pc},${pt.pc2});`, foot: 'จาก ฿' + f(plan.budgetTotal) }
      const cHours = { label: 'ชั่วโมง · HOURS', value: m.hours + ' ชม.', size: '22px', barStyle: `height:100%;width:${hoursPct}%;border-radius:8px;background:linear-gradient(90deg,${pt.pc},${pt.pc2});`, foot: hoursPct + '% ของเป้า' }
      const cTime = { label: 'ช่วงเวลา · TIMELINE', value: Math.max(0, plan.deadlineDays - plan.elapsedDays) + ' วัน', size: '20px', barStyle: `height:100%;width:${timePct}%;border-radius:8px;background:linear-gradient(90deg,${pt.pc},${pt.pc2});`, foot: plan.deadlineLabel }
      if (plan.goalType === 'budget') goalSecondary = [cHours, cTime]
      else if (plan.goalType === 'hours') goalSecondary = [cBudget, cTime]
      else goalSecondary = [cBudget, cHours]
      subjectGoals = Object.keys(plan.categories).map((k) => {
        const s = plan.categories[k]; const count = plan.sessions.filter((x) => x.subj === k).length
        const pct = Math.min(100, Math.round(count / (s.target || 1) * 100))
        return { en: s.en, count, target: s.target, color: s.color, barStyle: `height:100%;width:${pct}%;border-radius:8px;background:${s.color};transition:width .6s;` }
      })

      // momentum strip (adidas/Atoms/Google Fit pattern): last 7 days + streak
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = TODAY - i
        const has = d >= 1 && plan.sessions.some((s) => s.day === d)
        const isToday = d === TODAY
        days.push({
          label: d >= 1 ? dowTH[new Date(st.year, st.month, d).getDay()] : '',
          dotStyle: `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;${has ? `background:linear-gradient(135deg,${pt.pc},${pt.pc2});color:#fff;box-shadow:0 4px 10px ${pt.shadow};` : 'background:#F1ECF5;color:#C9BBD3;'}${isToday ? `outline:2.5px solid ${pt.pc};outline-offset:2px;` : ''}`,
          mark: has ? '✓' : '·',
        })
      }
      let streak = 0
      for (let d = TODAY; d >= 1; d--) {
        if (plan.sessions.some((s) => s.day === d)) streak++
        else if (d < TODAY) break
      }
      momentum = { days, streakText: streak > 0 ? 'สตรีค ' + streak + ' วัน 🔥' : 'เริ่มสตรีคของคุณวันนี้ ✨', sub: '7 วันล่าสุด · Last 7 days' }
    }

    // ---- team ----
    const members = plan ? ['me', ...new Set(Object.values(plan.categories).map((c) => c.ins))].filter((k, i, arr) => people[k] && arr.indexOf(k) === i).map((k) => {
      const p = people[k]; const isMe = k === 'me'
      const name = isMe && st.userName ? st.userName : p.name
      return { name, en: p.en, role: p.role, online: p.online, initials: isMe && st.userName ? st.userName.charAt(0) : p.initials,
        avatarStyle: `width:46px;height:46px;border-radius:16px;background:${p.color};display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:18px;`,
        hasRate: !isMe, rateText: '฿' + (p.rate || 0) + '/hr', badge: isMe ? 'เจ้าของ' : (p.online ? 'ออนไลน์' : 'ออฟไลน์'),
        badgeStyle: `display:inline-block;border-radius:10px;padding:3px 9px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10.5px;${isMe ? `background:${pt.soft};color:${pt.pc};` : (p.online ? 'background:#E4F7F1;color:#4FC7A8;' : 'background:#F1ECF5;color:#B0A4BC;')}` }
    }) : []

    // ---- AI ----
    const messages = st.messages.map((mm) => ({
      id: mm.id, isAi: mm.isAi, text: mm.text,
      rowStyle: `display:flex;gap:8px;align-items:flex-end;${mm.isAi ? '' : 'flex-direction:row-reverse;'}animation:ts-fadeup .3s ease both;`,
      bubbleStyle: mm.isAi
        ? `max-width:78%;background:#fff;border-radius:18px 18px 18px 6px;padding:12px 15px;box-shadow:0 6px 16px rgba(180,120,150,.12);font-family:'Nunito',sans-serif;font-weight:700;font-size:13.5px;color:#4A3F55;line-height:1.4;white-space:pre-wrap;`
        : `max-width:80%;background:linear-gradient(135deg,${pt.pc},${pt.pc2});border-radius:18px 18px 6px 18px;padding:12px 15px;color:#fff;font-family:'Nunito',sans-serif;font-weight:700;font-size:13.5px;line-height:1.4;box-shadow:0 6px 16px ${pt.shadow};white-space:pre-wrap;`,
    }))
    const chips = [
      { label: '💸 งบพอไหม?', q: 'ดูงบของแพลนนี้ให้หน่อย ยังเหลือพอถึงเป้าไหม?' },
      { label: '📅 จัดคาบให้', q: 'ช่วยแนะนำว่าควรเพิ่มคาบอะไรบ้างให้ครบเป้าหมาย' },
      { label: '⚖️ อะไรขาด?', q: 'หมวดไหนที่ยังทำน้อยเกินไปเทียบกับเป้าหมาย?' },
    ].map((c) => ({ label: c.label, onTap: () => this.sendChatWith(c.q) }))

    // ---- day sheet ----
    let dayLabelTH = '', dayLabelEN = '', daySessions = [], dayEmpty = false
    if (st.selDay && plan) {
      const dt = new Date(st.year, st.month, st.selDay)
      dayLabelTH = 'วัน' + dowFullTH[dt.getDay()] + ' ' + st.selDay + ' ' + monthTH[st.month]
      dayLabelEN = monthEN[st.month] + ' ' + st.selDay + ', ' + st.year
      const ss = this.sessionsFor(plan, st.selDay); dayEmpty = ss.length === 0
      daySessions = ss.map((s) => {
        const subj = plan.categories[s.subj] || Object.values(plan.categories)[0]
        const ins = people[subj.ins] || people.me
        const rk = Object.keys(s.reactions).filter((k) => s.reactions[k] > 0)
        return {
          id: s.id,
          onTap: () => this.setState({ slotOpen: true, selSlot: s.id }),
          cardStyle: `width:100%;border:none;background:#fff;border-radius:20px;padding:14px;display:flex;gap:12px;align-items:stretch;box-shadow:0 8px 20px rgba(180,120,150,.1);cursor:pointer;text-align:left;${s.done ? 'opacity:.72;' : ''}`,
          stripeStyle: `width:5px;border-radius:4px;background:${subj.color};flex:none;`, time: s.time, short: subj.short,
          pillStyle: `background:${subj.soft};color:${subj.color};border-radius:8px;padding:2px 8px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10px;`,
          subjTh: subj.th, insInitials: ins.initials,
          insAvatar: `width:22px;height:22px;border-radius:50%;background:${ins.color};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:10px;`,
          insEn: ins.en, cost: f(s.cost), hasReactions: rk.length > 0, reactSummary: rk.map((k) => k + s.reactions[k]).join(' '),
        }
      })
    }

    // ---- slot detail ----
    let slot = { headStyle: '', reactions: [], palette: [], comments: [], noComments: false }
    if (st.selSlot && plan) {
      const s = plan.sessions.find((x) => x.id === st.selSlot)
      if (s) {
        const subj = plan.categories[s.subj] || Object.values(plan.categories)[0]
        const ins = people[subj.ins] || people.me
        slot.headStyle = `padding:16px 20px 18px;background:linear-gradient(135deg,${subj.color},${subj.color}cc);flex:none;`
        slot.short = subj.short; slot.subjTh = subj.th; slot.subjEn = subj.en; slot.time = s.time
        slot.dateShort = s.day + ' ' + monthTH[st.month].slice(0, 3) + '.'; slot.cost = f(s.cost)
        slot.insInitials = ins.initials
        slot.insAvatar = `width:40px;height:40px;border-radius:14px;background:${ins.color};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;flex:none;`
        slot.insTh = ins.name; slot.insEn = ins.en; slot.rateLabel = this.catRateLabel(subj); slot.hoursText = s.hours + ' ชม.'
        const active = Object.keys(s.reactions).filter((k) => s.reactions[k] > 0)
        slot.reactions = active.map((k) => ({ emoji: k, count: s.reactions[k], onTap: () => this.toggleReaction(s.id, k), style: `display:flex;align-items:center;gap:5px;border:1.5px solid ${subj.color};background:${subj.soft};border-radius:14px;padding:6px 11px;cursor:pointer;color:${subj.color};` }))
        slot.palette = reactionEmojis.filter((e) => !active.includes(e)).map((e) => ({ emoji: e, onTap: () => this.toggleReaction(s.id, e) }))
        slot.comments = s.comments.map((c, i) => ({ ...c, key: i, avatarStyle: `width:30px;height:30px;border-radius:50%;background:${c.color};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12px;flex:none;` }))
        slot.noComments = s.comments.length === 0
        slot.isFitness = plan.kind === 'fitness' && (s.sets || s.reps)
        slot.sets = s.sets || '—'; slot.reps = s.reps || '—'; slot.intensity = s.intensity || '—'
      }
    }

    // ---- add form ----
    let addSubjects = [], addDays = [], addTimes = [], addMetricLabel = '', addMetricValue = '', addBudgetBarStyle = '', addBudgetText = '', isFitnessAdd = false, addHoursLabel = 'จำนวนชั่วโมง · Hours', intensityOpts = []
    if (plan) {
      const curSubj = st.addSubj && plan.categories[st.addSubj] ? st.addSubj : Object.keys(plan.categories)[0]
      addSubjects = Object.keys(plan.categories).map((k) => {
        const s = plan.categories[k], active = curSubj === k
        return { key: k, en: s.en, rateLabel: this.catRateShort(s), onTap: () => this.setState({ addSubj: k }), style: `display:flex;align-items:center;gap:9px;border:2px solid ${active ? s.color : '#EEE6F3'};background:${active ? s.soft : '#fff'};border-radius:16px;padding:11px 12px;cursor:pointer;`, dotStyle: `width:12px;height:12px;border-radius:5px;background:${s.color};flex:none;` }
      })
      const base = st.selDay || 14
      for (let d = base; d <= base + 6 && d <= dim; d++) {
        const dt = new Date(st.year, st.month, d), active = st.addDate === d
        addDays.push({ num: d, dow: dowTH[dt.getDay()], onTap: () => this.setState({ addDate: d }), style: `flex:none;width:52px;border:2px solid ${active ? pt.pc : '#EEE6F3'};background:${active ? pt.pc : '#fff'};color:${active ? '#fff' : '#8A7C93'};border-radius:16px;padding:8px 0;cursor:pointer;text-align:center;` })
      }
      const slots = ['09:00–11:00', '13:00–15:00', '15:00–17:00', '17:00–19:00']
      addTimes = slots.map((tt) => { const active = st.addTime === tt; return { label: tt, onTap: () => this.setState({ addTime: tt }), style: `border:2px solid ${active ? pt.pc : '#EEE6F3'};background:${active ? pt.soft : '#fff'};color:${active ? pt.pc : '#8A7C93'};border-radius:14px;padding:9px 13px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:12.5px;` } })
      const addCost = catCost(plan.categories[curSubj], st.addHours)
      const m = this.planMetric(plan)
      if (plan.goalType === 'hours') {
        const after = m.hours + st.addHours; const pct = Math.min(100, Math.round(after / plan.hoursGoal * 100))
        addMetricLabel = 'ชั่วโมงหลังเพิ่ม · Hours'; addMetricValue = after + ' ชม.'
        addBudgetBarStyle = `height:100%;width:${pct}%;border-radius:6px;background:linear-gradient(90deg,${pt.pc},${pt.pc2});transition:width .4s;`
        addBudgetText = '฿' + f(addCost) + ' · ' + pct + '% ของเป้า ' + plan.hoursGoal + ' ชม.'
      } else if (plan.goalType === 'sessions') {
        const after = m.count + 1; const pct = Math.min(100, Math.round(after / (m.catTargets || 1) * 100))
        addMetricLabel = 'คาบหลังเพิ่ม · Sessions'; addMetricValue = after + ' คาบ'
        addBudgetBarStyle = `height:100%;width:${pct}%;border-radius:6px;background:linear-gradient(90deg,${pt.pc},${pt.pc2});transition:width .4s;`
        addBudgetText = '฿' + f(addCost) + ' · ' + pct + '% ของเป้า ' + m.catTargets + ' คาบ'
      } else {
        const after = m.spent + addCost; const pct = Math.min(100, Math.round(after / plan.budgetTotal * 100)); const over = after > plan.budgetTotal
        addMetricLabel = 'ค่าใช้จ่ายคาบนี้ · Cost'; addMetricValue = '฿' + f(addCost)
        addBudgetBarStyle = `height:100%;width:${pct}%;border-radius:6px;background:${over ? '#FF6B7A' : 'linear-gradient(90deg,' + pt.pc + ',' + pt.pc2 + ')'};transition:width .4s;`
        addBudgetText = over ? ('⚠️ เกินงบ! เหลือ ฿' + f(Math.max(0, plan.budgetTotal - m.spent))) : ('เหลือ ฿' + f(plan.budgetTotal - after) + ' · ' + pct + '% used')
      }
      isFitnessAdd = plan.kind === 'fitness'
      addHoursLabel = isFitnessAdd ? 'ระยะเวลา · Duration' : 'จำนวนชั่วโมง · Hours'
      intensityOpts = ['เบา', 'ปานกลาง', 'หนัก'].map((lv) => { const active = st.addIntensity === lv; return { label: lv, onTap: () => this.setState({ addIntensity: lv }), style: `flex:1;border:2px solid ${active ? pt.pc : '#EEE6F3'};background:${active ? pt.soft : '#fff'};color:${active ? pt.pc : '#8A7C93'};border-radius:14px;padding:10px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;` } })
    }

    // ---- booked confirmation (Peloton pattern) ----
    let booked = null
    if (st.booked && plan) {
      const subj = plan.categories[st.booked.subjKey]
      if (subj) {
        const ins = people[subj.ins] || people.me
        booked = {
          title: subj.th + ' · ' + subj.en,
          sub: st.booked.day + ' ' + monthTH[st.month] + ' · ' + st.booked.time,
          meta: ins.en + ' · ' + st.booked.hours + ' ชม.' + (st.booked.cost > 0 ? ' · ฿' + f(st.booked.cost) : ' · ฟรี'),
          chipStyle: `display:inline-flex;align-items:center;gap:6px;background:${subj.soft};color:${subj.color};border-radius:12px;padding:5px 12px;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:12px;`,
          short: subj.short,
        }
      }
    }

    // ---- create goal ----
    const ng = st.newGoal
    const templates = TEMPLATES.map((tp, i) => {
      const active = ng.template === tp.key; const tm = themes[tp.theme]
      return { key: tp.key, emoji: tp.emoji, label: tp.label, vibe: tp.vibe, onTap: () => this.pickTemplate(tp),
        style: `flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:6px;width:118px;border:none;border-radius:20px;padding:14px 14px 13px;cursor:pointer;text-align:left;position:relative;overflow:hidden;transition:transform .2s cubic-bezier(.34,1.56,.64,1);transform:scale(${active ? 1.02 : 1});background:${active ? `linear-gradient(140deg,${tm.pc},${tm.pc2})` : '#fff'};box-shadow:${active ? `0 12px 24px ${tm.shadow}` : '0 6px 16px rgba(180,120,150,.1)'};animation:ts-cardin .4s ease both;animation-delay:${i * 0.04}s;`,
        iconStyle: `width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:23px;background:${active ? 'rgba(255,255,255,.28)' : tm.soft};`,
        labelStyle: `font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:14px;color:${active ? '#fff' : '#4A3F55'};`,
        vibeStyle: `font-family:'Nunito',sans-serif;font-weight:700;font-size:10.5px;color:${active ? 'rgba(255,255,255,.9)' : '#B0A4BC'};` }
    })
    const th2 = themes[ng.theme]
    const goalTypeCards = Object.keys(goalTypeMeta).map((k) => {
      const meta = goalTypeMeta[k], active = ng.type === k
      return { key: k, emoji: meta.emoji, title: meta.title, sub: meta.sub, onTap: () => this.pickGoalType(k), style: `display:flex;align-items:center;gap:9px;border:2px solid ${active ? th2.pc : '#EEE6F3'};background:${active ? th2.soft : '#fff'};border-radius:16px;padding:11px 12px;cursor:pointer;text-align:left;` }
    })
    const targetLabel = TARGET_LABELS[ng.type]
    const targetOptions = (TARGET_SETS[ng.type] || []).map(([val, lab]) => {
      const active = ng.target === val
      return { label: lab, onTap: () => this.setState((s) => ({ newGoal: { ...s.newGoal, target: val } })), style: `border:2px solid ${active ? th2.pc : '#EEE6F3'};background:${active ? th2.soft : '#fff'};color:${active ? th2.pc : '#8A7C93'};border-radius:14px;padding:10px 15px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;` }
    })
    const createThemes = Object.keys(themes).map((k) => {
      const tm = themes[k], active = ng.theme === k
      return { key: k, active, onTap: () => this.setState((s) => ({ newGoal: { ...s.newGoal, theme: k } })), style: `width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,${tm.pc},${tm.pc2});border:3px solid ${active ? '#4A3F55' : '#fff'};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px ${tm.shadow};` }
    })
    const createEmojis = ['📚', '💪', '🎯', '🎨', '🎹', '🏊'].map((e) => {
      const active = ng.emoji === e
      return { emoji: e, onTap: () => this.setState((s) => ({ newGoal: { ...s.newGoal, emoji: e } })), style: `width:38px;height:38px;border-radius:13px;border:2px solid ${active ? th2.pc : '#EEE6F3'};background:${active ? th2.soft : '#fff'};cursor:pointer;font-size:19px;display:flex;align-items:center;justify-content:center;` }
    })

    // ---- plan edit (host) ----
    const ed = st.editDraft || { name: '', emoji: '📚', theme: 'coral', goalType: 'budget', target: 0, cats: [] }
    const edTh = themes[ed.theme] || t
    const catPalette = ['#FF8AA0', '#6AAEF5', '#4FC7A8', '#F4A94C', '#B18AF0', '#7BD9E0']
    const edThemes = Object.keys(themes).map((k) => {
      const tm = themes[k], active = ed.theme === k
      return { key: k, active, onTap: () => this.setState((s) => ({ editDraft: { ...s.editDraft, theme: k } })), style: `width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,${tm.pc},${tm.pc2});border:3px solid ${active ? '#4A3F55' : '#fff'};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px ${tm.shadow};` }
    })
    const edEmojis = ['📚', '💪', '🎯', '🎹', '🎨', '🏊', '🧠', '🍰'].map((e) => {
      const active = ed.emoji === e
      return { emoji: e, onTap: () => this.setState((s) => ({ editDraft: { ...s.editDraft, emoji: e } })), style: `width:38px;height:38px;border-radius:13px;border:2px solid ${active ? edTh.pc : '#EEE6F3'};background:${active ? edTh.soft : '#fff'};cursor:pointer;font-size:19px;display:flex;align-items:center;justify-content:center;` }
    })
    const edTypeCards = Object.keys(goalTypeMeta).map((k) => {
      const meta = goalTypeMeta[k], active = ed.goalType === k
      return { key: k, emoji: meta.emoji, title: meta.title, sub: meta.sub, onTap: () => this.setEdType(k), style: `display:flex;align-items:center;gap:9px;border:2px solid ${active ? edTh.pc : '#EEE6F3'};background:${active ? edTh.soft : '#fff'};border-radius:16px;padding:11px 12px;cursor:pointer;text-align:left;` }
    })
    const edTargetLabel = TARGET_LABELS[ed.goalType]
    const edTargetOptions = (TARGET_SETS[ed.goalType] || []).map(([val, lab]) => {
      const active = ed.target === val
      return { label: lab, onTap: () => this.setState((s) => ({ editDraft: { ...s.editDraft, target: val } })), style: `border:2px solid ${active ? edTh.pc : '#EEE6F3'};background:${active ? edTh.soft : '#fff'};color:${active ? edTh.pc : '#8A7C93'};border-radius:14px;padding:10px 15px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;` }
    })
    const edCats = (ed.cats || []).map((c, i) => ({
      key: c.key, en: c.en, rate: c.rate, target: c.target, isFree: (c.unit || 'hr') === 'free', paid: (c.unit || 'hr') !== 'free',
      rateLabel: (c.unit || 'hr') === 'session' ? '฿/คาบ · Per session' : '฿/ชม. · Rate',
      dotStyle: `width:14px;height:14px;border-radius:6px;background:${c.color};flex:none;`,
      setName: (e) => this.setCat(i, 'en', e.target.value),
      remove: () => this.removeCat(i),
      rateUp: () => this.setCat(i, 'rate', c.rate + 50), rateDown: () => this.setCat(i, 'rate', Math.max(0, c.rate - 50)),
      targetUp: () => this.setCat(i, 'target', c.target + 1), targetDown: () => this.setCat(i, 'target', Math.max(1, c.target - 1)),
      units: [{ k: 'hr', label: '/ชม.' }, { k: 'session', label: '/คาบ' }, { k: 'free', label: 'ฟรี' }].map((u) => {
        const active = (c.unit || 'hr') === u.k
        return { key: u.k, label: u.label, onTap: () => this.setCat(i, 'unit', u.k), style: `flex:1;border:none;border-radius:10px;padding:7px 4px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;${active ? `background:${c.color};color:#fff;` : 'background:#fff;color:#A99BB5;'}` }
      }),
      colors: catPalette.map((col) => ({ key: col, onTap: () => this.setCat(i, 'color', col), style: `width:22px;height:22px;border-radius:8px;background:${col};border:2.5px solid ${c.color === col ? '#4A3F55' : '#fff'};cursor:pointer;flex:none;box-shadow:0 2px 6px rgba(180,120,150,.15);` })),
      // assign this category to a team member — flows into team list, legend, slot details
      insName: (people[c.ins] || people.me).en,
      tutors: Object.keys(people).map((pk) => {
        const pp = people[pk]; const active = (c.ins || 'me') === pk
        const name = pk === 'me' && st.userName ? st.userName : pp.en
        return {
          key: pk, name, initials: pk === 'me' && st.userName ? st.userName.charAt(0) : pp.initials,
          onTap: () => this.setCat(i, 'ins', pk),
          style: `flex:none;display:flex;align-items:center;gap:6px;border:2px solid ${active ? c.color : '#EEE6F3'};background:${active ? softOf(c.color) : '#fff'};border-radius:13px;padding:5px 10px 5px 5px;cursor:pointer;transition:all .15s;`,
          avatarStyle: `width:24px;height:24px;border-radius:50%;background:${pp.color};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11px;flex:none;`,
          nameStyle: `font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:11.5px;color:${active ? '#4A3F55' : '#A99BB5'};white-space:nowrap;`,
        }
      }),
    }))

    // ---- onboarding (stepped) ----
    const onbDots = [0, 1, 2].map((i) => ({ key: i, style: `width:${i === st.onbStep ? 22 : 8}px;height:8px;border-radius:5px;background:${i === st.onbStep ? t.pc : '#E8DCEF'};transition:all .25s;` }))
    const onbTemplates = TEMPLATES.map((tp) => {
      const active = st.onbTemplate === tp.key; const tm = themes[tp.theme]
      return { key: tp.key, emoji: tp.emoji, label: tp.label, vibe: tp.vibe,
        onTap: () => this.setState({ onbTemplate: active ? null : tp.key }),
        style: `display:flex;align-items:center;gap:10px;border:2px solid ${active ? tm.pc : '#EEE6F3'};background:${active ? tm.soft : 'rgba(255,255,255,.85)'};border-radius:18px;padding:12px 14px;cursor:pointer;text-align:left;width:100%;transition:all .2s;`,
        iconStyle: `width:38px;height:38px;border-radius:13px;background:linear-gradient(135deg,${tm.pc},${tm.pc2});display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;` }
    })

    return {
      g, t, pt, TODAY,
      desktop: st.desktop,
      planIdentity: plan ? { emoji: plan.emoji, name: plan.name, en: plan.en } : null,
      // auth
      showAuth: !st.authed,
      authEmailStep: st.authStep === 'email', authOtpStep: st.authStep === 'otp',
      authEmail: st.authEmail, authError: st.authError, authCode: st.authCode, authOtp: st.authOtp,
      authEmailBorder: st.authError ? '#F6D5DF' : '#EEE6F3',
      maskedEmail: (() => { const e = st.authEmail || ''; const [u, d] = e.split('@'); if (!d) return e; return (u.length <= 2 ? u : u.slice(0, 2) + '•••') + '@' + d })(),
      otpCells: Array.from({ length: 6 }).map((_, i) => {
        const ch = st.authOtp[i] || ''; const active = i === st.authOtp.length
        return { key: i, char: ch, style: `width:42px;height:52px;border-radius:14px;background:#fff;border:2px solid ${ch ? t.pc : (active ? t.pc : '#EEE6F3')};display:flex;align-items:center;justify-content:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:24px;color:#4A3F55;box-shadow:${ch || active ? '0 6px 16px ' + t.shadow : 'none'};transition:all .15s;` }
      }),
      setAuthEmail: this.setAuthEmail, emailKey: this.emailKey, sendCode: this.sendCode,
      setAuthOtp: this.setAuthOtp, otpKey: this.otpKey, verifyOtp: this.verifyOtp,
      resendCode: this.resendCode, changeEmail: this.changeEmail, signOut: this.signOut,
      // onboarding
      onboarding: st.onboarding, onbStep: st.onbStep, onbDots, onbTemplates,
      onbName: st.onbName, setOnbName: (e) => this.setState({ onbName: e.target.value }),
      onbNameKey: (e) => { if (e.key === 'Enter') this.onbNext() },
      onbNext: this.onbNext, onbSkip: this.onbSkip,
      onbFeatures: [
        { emoji: '🎯', title: '1 เป้าหมาย = 1 ปฏิทิน', sub: 'Budget, hours, deadline or sessions' },
        { emoji: '🤝', title: 'วางแผนร่วมกัน', sub: 'React & comment live with your team' },
        { emoji: '✨', title: 'ผู้ช่วย AI', sub: 'Balances every goal for you' },
      ],
      // loading
      loading: st.loading, notLoading: !st.loading, loadingCards: [0, 1, 2],
      // nav / screens
      isHome, inPlan, isCal, isGoals, isTeam, isAI, homeMine, homeMarket,
      segMine: `flex:1;border:none;border-radius:14px;padding:11px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;transition:all .2s;${homeMine ? `background:#fff;color:${t.pc};box-shadow:0 4px 12px rgba(180,120,150,.15);` : 'background:transparent;color:#A99BB5;'}`,
      segMarket: `flex:1;border:none;border-radius:14px;padding:11px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13.5px;transition:all .2s;${homeMarket ? `background:#fff;color:${t.pc};box-shadow:0 4px 12px rgba(180,120,150,.15);` : 'background:transparent;color:#A99BB5;'}`,
      goMine: () => this.setState({ homeTab: 'mine' }), goMarket: () => this.setState({ homeTab: 'market' }),
      marketCards, mkd, marketFilters,
      marketQuery: st.marketQuery, setMarketQuery: (e) => this.setState({ marketQuery: e.target.value }),
      marketEmpty: homeMarket && marketCards.length === 0,
      marketOpen: st.marketOpen, closeMarket: () => this.setState({ marketOpen: false }),
      likeMarket: this.likeMarket, copyMarket: this.copyMarket,
      headerTitle, headerSub, viewingText, presenceAvatars,
      backHome: () => this.setState({ screen: 'home', dayOpen: false, slotOpen: false }),
      prevMonth: () => this.setState((s) => ({ month: s.month === 0 ? 11 : s.month - 1, year: s.month === 0 ? s.year - 1 : s.year })),
      nextMonth: () => this.setState((s) => ({ month: s.month === 11 ? 0 : s.month + 1, year: s.month === 11 ? s.year + 1 : s.year })),
      openSettings: () => this.setState({ settingsOpen: true }),
      planCards, openCreate: () => this.setState({ createOpen: true }),
      weekdays, cells, legend, legendTitle, upNext,
      navCal: isCal ? pt.pc : '#C9BBD3', navGoals: isGoals ? pt.pc : '#C9BBD3', navTeam: isTeam ? pt.pc : '#C9BBD3', navAI: isAI ? pt.pc : '#C9BBD3',
      goCal: () => this.setState({ tab: 'cal' }), goGoals: () => this.setState({ tab: 'goals' }), goTeam: () => this.setState({ tab: 'team' }), goAI: () => this.setState({ tab: 'ai' }),
      openAdd: () => this.setState({ addOpen: true, addDate: st.selDay || TODAY, addSubj: plan ? Object.keys(plan.categories)[0] : null }),
      goalPrimary, goalSecondary, subjectGoals, perCatTitle, momentum,
      openEditTarget: this.openEditTarget,
      editTargetOpen: st.editTargetOpen, closeEditTarget: () => this.setState({ editTargetOpen: false }),
      editTargetLabel: plan ? ({ budget: 'งบรวมใหม่ · New budget', hours: 'เป้าชั่วโมงใหม่ · New hours', sessions: 'เป้าคาบใหม่ · New session goal', window: 'กำหนดใหม่ · New deadline' }[plan.goalType]) : '',
      editTargetOptions: this.editTargetOptionsFor(plan),
      editTargetText: plan ? this.targetText(plan.goalType, st.editTargetVal != null ? st.editTargetVal : 0) : '',
      incEditTarget: () => this.setState((s) => ({ editTargetVal: this.bumpTarget(plan.goalType, s.editTargetVal, 1) })),
      decEditTarget: () => this.setState((s) => ({ editTargetVal: this.bumpTarget(plan.goalType, s.editTargetVal, -1) })),
      saveEditTarget: this.saveEditTarget,
      openPublish: () => this.setState({ publishOpen: true }), publishOpen: st.publishOpen, closePublish: () => this.setState({ publishOpen: false }), doPublish: this.doPublish,
      openPlanEdit: this.openPlanEdit, planEditOpen: st.planEditOpen, closePlanEdit: () => this.setState({ planEditOpen: false }),
      ed, edThemes, edEmojis, edTypeCards, edTargetLabel, edTargetOptions, edCats,
      edTargetText: this.targetText(ed.goalType, ed.target),
      incEdTarget: () => this.setState((s) => ({ editDraft: { ...s.editDraft, target: this.bumpTarget(s.editDraft.goalType, s.editDraft.target, 1) } })),
      decEdTarget: () => this.setState((s) => ({ editDraft: { ...s.editDraft, target: this.bumpTarget(s.editDraft.goalType, s.editDraft.target, -1) } })),
      setEdName: (e) => this.setState((s) => ({ editDraft: { ...s.editDraft, name: e.target.value } })),
      addCat: this.addCat, savePlanEdit: this.savePlanEdit, deletePlan: this.deletePlan,
      members, invite: this.doInvite, inviteUrl: st.inviteUrl, cloud: this.cloud,
      messages, aiThinking: st.aiThinking, chips,
      chatInput: st.chatInput, setChatInput: (e) => this.setState({ chatInput: e.target.value }), chatKey: (e) => { if (e.key === 'Enter') this.sendChat() }, sendChat: this.sendChat,
      toast: st.toast,
      pendingMove: st.pendingMove ? {
        from: st.pendingMove.from, to: st.pendingMove.to,
        msg: 'ย้าย ' + st.pendingMove.count + ' คาบ ไปวันที่ ' + st.pendingMove.to + ' ' + monthTH[st.month] + '? · Move ' + st.pendingMove.count + ' session' + (st.pendingMove.count > 1 ? 's' : ''),
        fromChip: `width:46px;height:46px;border-radius:15px;background:#F1E8F5;color:#8A7C93;display:flex;align-items:center;justify-content:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:18px;`,
        toChip: `width:52px;height:52px;border-radius:16px;background:${t.pc};color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;box-shadow:0 8px 18px ${t.shadow};`,
      } : null,
      confirmMove: this.confirmMove, cancelMove: this.cancelMove, stop: (e) => e.stopPropagation(),
      reschedOpen: st.reschedOpen, closeResched: () => this.setState({ reschedOpen: false }),
      reschedMonth: monthTH[st.month],
      reschedDays: (() => {
        if (!st.reschedOpen || !plan) return []
        const cur = (plan.sessions.find((x) => x.id === st.reschedId) || {}).day
        const dm = this.daysInMonth(st.year, st.month)
        return Array.from({ length: dm }).map((_, i) => {
          const d = i + 1, isCur = d === cur, isToday = d === TODAY, has = this.sessionsFor(plan, d).length > 0
          return { num: d, onTap: () => this.moveSingleSession(d), style: `aspect-ratio:1;border:none;border-radius:12px;cursor:pointer;font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;${isCur ? `background:${t.pc};color:#fff;box-shadow:0 6px 14px ${t.shadow};` : (has ? `background:${t.soft};color:${t.pc};` : 'background:#F4EFF7;color:#8A7C93;')}${isToday && !isCur ? `outline:2px solid ${t.pc};outline-offset:-2px;` : ''}` }
        })
      })(),
      dayOpen: st.dayOpen, closeDay: () => this.setState({ dayOpen: false }), dayLabelTH, dayLabelEN, daySessions, dayEmpty,
      openAddForDay: () => this.setState({ addOpen: true, dayOpen: false, addDate: st.selDay, addSubj: plan ? Object.keys(plan.categories)[0] : null }),
      slotOpen: st.slotOpen, closeSlot: () => this.setState({ slotOpen: false }), slot,
      rescheduleSlot: this.rescheduleSlot,
      commentDraft: st.commentDraft, setCommentDraft: (e) => this.setState({ commentDraft: e.target.value }), commentKey: (e) => { if (e.key === 'Enter') this.addComment() }, addComment: this.addComment,
      addOpen: st.addOpen, closeAdd: () => this.setState({ addOpen: false }), addSubjects, addDays, addTimes,
      addHoursText: st.addHours + ' ชม.', incHours: () => this.setState((s) => ({ addHours: Math.min(4, s.addHours + 1) })), decHours: () => this.setState((s) => ({ addHours: Math.max(1, s.addHours - 1) })),
      addMetricLabel, addMetricValue, addBudgetBarStyle, addBudgetText, saveSession: this.saveSession,
      isFitnessAdd, addHoursLabel, intensityOpts,
      addSets: st.addSets, addReps: st.addReps,
      incSets: () => this.setState((s) => ({ addSets: Math.min(10, s.addSets + 1) })), decSets: () => this.setState((s) => ({ addSets: Math.max(1, s.addSets - 1) })),
      incReps: () => this.setState((s) => ({ addReps: Math.min(30, s.addReps + 1) })), decReps: () => this.setState((s) => ({ addReps: Math.max(1, s.addReps - 1) })),
      booked, closeBooked: this.closeBooked, viewBookedDay: this.viewBookedDay,
      createOpen: st.createOpen, closeCreate: () => this.setState({ createOpen: false }),
      templates, ngName: ng.name, setNgName: (e) => this.setState((s) => ({ newGoal: { ...s.newGoal, name: e.target.value } })),
      goalTypeCards, targetLabel, targetOptions, createThemes, createEmojis, createPlan: this.createPlan,
      ngTargetText: this.targetText(ng.type, ng.target),
      incNgTarget: () => this.setState((s) => ({ newGoal: { ...s.newGoal, target: this.bumpTarget(s.newGoal.type, s.newGoal.target, 1) } })),
      decNgTarget: () => this.setState((s) => ({ newGoal: { ...s.newGoal, target: this.bumpTarget(s.newGoal.type, s.newGoal.target, -1) } })),
      settingsOpen: st.settingsOpen, closeSettings: () => this.setState({ settingsOpen: false }),
      profileName: st.userName ? st.userName : 'พิมพ์ชนก · Pimchanok',
      profileInitial: (st.userName || 'พ').charAt(0),
      planCountText: plans.length + ' เป้าหมาย · ' + plans.length + ' active goals',
      themeSwatches: Object.keys(themes).map((k) => {
        const tm = themes[k], active = st.theme === k
        return { key: k, active, onTap: () => this.setState({ theme: k }), style: `width:44px;height:44px;border-radius:16px;background:linear-gradient(135deg,${tm.pc},${tm.pc2});border:3px solid ${active ? '#4A3F55' : '#fff'};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px ${tm.shadow};` }
      }),
      settingRows: [
        { key: 'notif', emoji: '🔔', title: 'การแจ้งเตือน', sub: 'Session & reaction alerts' },
        { key: 'presence', emoji: '👀', title: 'แสดงสถานะออนไลน์', sub: 'Let others see you viewing' },
        { key: 'sound', emoji: '🔊', title: 'เสียงเอฟเฟกต์', sub: 'Cute sound feedback' },
        { key: 'autoBudget', emoji: '💰', title: 'หักงบอัตโนมัติ', sub: 'Deduct cost per booked slot' },
      ].map((r) => {
        const on = st.settingsFlags[r.key]
        return { ...r, onTap: () => this.toggleFlag(r.key), toggleStyle: `width:48px;height:28px;border:none;border-radius:16px;background:${on ? t.pc : '#E3D6EC'};cursor:pointer;position:relative;transition:background .2s;flex:none;`, knobStyle: `position:absolute;top:3px;left:${on ? '23px' : '3px'};width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s cubic-bezier(.34,1.56,.64,1);box-shadow:0 2px 5px rgba(0,0,0,.2);` }
      }),
      replayOnboarding: this.replayOnboarding, resetDemo: this.resetDemo,
      resetLabel: this.cloud ? '🔄 ซิงก์ใหม่จากคลาวด์ · Re-sync from cloud' : '🧹 รีเซ็ตข้อมูลเดโม · Reset demo data',
    }
  }

  render() {
    if (!this.state.plans) return null
    const v = this.renderVals()
    return <AppShell v={v} />
  }
}
