export const themes = {
  coral:  { pc: '#FF8AA0', pc2: '#FFB088', soft: '#FFEBF0', border: '#FFC9D6', shadow: 'rgba(255,138,160,.4)' },
  lilac:  { pc: '#B18AF0', pc2: '#8FB8FF', soft: '#F1EBFC', border: '#DBC9F5', shadow: 'rgba(177,138,240,.4)' },
  mint:   { pc: '#4FC7A8', pc2: '#7BD9E0', soft: '#E4F7F1', border: '#BFEBDF', shadow: 'rgba(79,199,168,.4)' },
  sky:    { pc: '#6AAEF5', pc2: '#9BD0FF', soft: '#E7F1FE', border: '#C6E0FB', shadow: 'rgba(106,174,245,.4)' },
}

export const people = {
  me:         { name: 'พิมพ์ชนก', en: 'You', initials: 'พ', color: '#FF8AA0', online: true,  role: 'เจ้าของแพลน · Owner' },
  kru_nan:    { name: 'ครูแนน', en: 'Kru Nan', initials: 'แ', color: '#FF8AA0', online: true,  role: 'ติวเตอร์คณิต · Math', rate: 270 },
  kru_top:    { name: 'ครูท็อป', en: 'Kru Top', initials: 'ท', color: '#6AAEF5', online: true,  role: 'ติวเตอร์ฟิสิกส์ · Physics', rate: 300 },
  kru_fah:    { name: 'ครูฟ้า', en: 'Kru Fah', initials: 'ฟ', color: '#4FC7A8', online: false, role: 'ติวเตอร์เคมี · Chem', rate: 280 },
  kru_mai:    { name: 'ครูใหม่', en: 'Kru Mai', initials: 'ม', color: '#F4A94C', online: false, role: 'ติวเตอร์อังกฤษ · English', rate: 250 },
  coach_bank: { name: 'โค้ชแบงค์', en: 'Coach Bank', initials: 'บ', color: '#4FC7A8', online: true,  role: 'เทรนเนอร์ · Trainer', rate: 500 },
  coach_jane: { name: 'ครูเจน', en: 'Jane', initials: 'จ', color: '#7BD9E0', online: false, role: 'ครูโยคะ · Yoga', rate: 400 },
  kru_lisa:   { name: 'ครูลิซ่า', en: 'Ms. Lisa', initials: 'ล', color: '#6AAEF5', online: true,  role: 'ครู IELTS · IELTS coach', rate: 600 },
}

export const monthTH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
export const monthEN = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const dowTH = ['อา','จ','อ','พ','พฤ','ศ','ส']
export const dowFullTH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
export const reactionEmojis = ['👍','🔥','❤️','💪','🎉','😮']

export const goalTypeMeta = {
  budget:   { emoji: '💰', title: 'งบประมาณ', sub: 'Budget cap', kicker: 'งบรวม · TOTAL FUNDING' },
  hours:    { emoji: '⏱️', title: 'ชั่วโมง', sub: 'Total hours', kicker: 'ชั่วโมงรวม · TOTAL HOURS' },
  window:   { emoji: '📆', title: 'กำหนดส่ง', sub: 'Deadline', kicker: 'นับถอยหลัง · DEADLINE' },
  sessions: { emoji: '🎯', title: 'จำนวนคาบ', sub: 'Session count', kicker: 'จำนวนคาบ · SESSIONS' },
}

export const catUnit = (c) => c.unit || (c.rate > 0 ? 'hr' : 'free')
export const catCost = (c, hours) => {
  const u = catUnit(c)
  if (u === 'free' || !c.rate) return 0
  if (u === 'session') return c.rate
  return c.rate * hours
}

export function seedPlans(yr, mo, td) {
  const dim = new Date(yr, mo + 1, 0).getDate()
  const fmtFuture = (days) => { const d = new Date(yr, mo, td + days); return d.getDate() + ' ' + monthTH[d.getMonth()].slice(0, 3) + '.' }
  const alt = (pairs, catMap) => {
    let id = 1
    return pairs.map(([day, subj]) => {
      const c = catMap[subj]; const done = day < td
      return {
        id: id++, day: Math.min(day, dim), subj, time: '17:00–19:00', hours: 2, cost: catCost(c, 2), done,
        reactions: done ? { '👍': 2, '🔥': 1 } : (day % 3 === 0 ? { '❤️': 1 } : {}),
        comments: done ? [{ author: people[c.ins].en, initials: people[c.ins].initials, color: c.color, text: 'เตรียมโจทย์มาให้แล้วนะคะ เจอกัน!', time: '2d' }] : [],
      }
    })
  }

  const p1cats = {
    MATH: { th: 'คณิตศาสตร์', en: 'Mathematics', short: 'MATH', color: '#FF8AA0', soft: '#FFEBF0', ins: 'kru_nan', rate: 270, target: 12 },
    PHYS: { th: 'ฟิสิกส์', en: 'Physics', short: 'PHYS', color: '#6AAEF5', soft: '#E7F1FE', ins: 'kru_top', rate: 300, target: 10 },
    CHEM: { th: 'เคมี', en: 'Chemistry', short: 'CHEM', color: '#4FC7A8', soft: '#E4F7F1', ins: 'kru_fah', rate: 280, target: 8 },
    ENG:  { th: 'ภาษาอังกฤษ', en: 'English', short: 'ENG', color: '#F4A94C', soft: '#FEF0DC', ins: 'kru_mai', rate: 250, target: 8 },
  }
  const spread = (subs, offsets) => offsets.map((o, i) => [Math.max(1, Math.min(dim, td + o)), subs[i % subs.length]])
  const p1sess = alt(spread(['MATH', 'PHYS', 'CHEM', 'ENG'], [-11, -10, -9, -8, -4, -3, -2, -1, 3, 4, 5, 10, 11]), p1cats)

  const p2cats = {
    PT:   { th: 'เวทเทรนนิ่ง', en: 'Weight Training', short: 'PT', color: '#4FC7A8', soft: '#E4F7F1', ins: 'coach_bank', rate: 500, target: 14 },
    HIIT: { th: 'คาร์ดิโอ', en: 'HIIT Cardio', short: 'HIIT', color: '#FF8AA0', soft: '#FFEBF0', ins: 'coach_bank', rate: 450, target: 8 },
    YOGA: { th: 'โยคะ', en: 'Yoga', short: 'YOGA', color: '#7BD9E0', soft: '#E4F9FB', ins: 'coach_jane', rate: 400, target: 6 },
  }
  const p2sess = alt(spread(['PT', 'HIIT', 'YOGA'], [-12, -9, -7, -5, -2, 2, 5, 9]), p2cats)

  const p3cats = {
    SPEAK: { th: 'พูด', en: 'Speaking', short: 'SPK', color: '#6AAEF5', soft: '#E7F1FE', ins: 'kru_lisa', rate: 600, target: 6 },
    WRITE: { th: 'เขียน', en: 'Writing', short: 'WRT', color: '#B18AF0', soft: '#F1EBFC', ins: 'kru_lisa', rate: 600, target: 6 },
    READ:  { th: 'อ่าน–ฟัง', en: 'Reading & Listening', short: 'R&L', color: '#4FC7A8', soft: '#E4F7F1', ins: 'kru_lisa', rate: 550, target: 5 },
  }
  const p3sess = alt(spread(['SPEAK', 'WRITE', 'READ'], [-13, -6, -1, 1, 6, 13]), p3cats)

  return [
    { id: 1, name: 'ติวสอบเข้ามหาลัย', en: 'University Entrance Prep', emoji: '📚', theme: 'coral', kind: 'study',
      goalType: 'budget', budgetTotal: 24000, hoursGoal: 76, elapsedDays: 20, deadlineDays: 55, deadlineLabel: 'สอบ ' + fmtFuture(35),
      categories: p1cats, sessions: p1sess },
    { id: 2, name: 'ฟิตหุ่นรับซัมเมอร์', en: 'Summer Shred Plan', emoji: '💪', theme: 'mint', kind: 'fitness',
      goalType: 'hours', budgetTotal: 20000, hoursGoal: 40, elapsedDays: 20, deadlineDays: 70, deadlineLabel: 'เป้า ' + fmtFuture(50),
      categories: p2cats, sessions: p2sess },
    { id: 3, name: 'พิชิต IELTS 7.0', en: 'IELTS 7.0 Sprint', emoji: '🎯', theme: 'sky', kind: 'study',
      goalType: 'window', budgetTotal: 18000, hoursGoal: 34, elapsedDays: 20, deadlineDays: 60, deadlineLabel: 'สอบ ' + fmtFuture(40),
      categories: p3cats, sessions: p3sess },
  ]
}

export function seedMarket() {
  return [
    { id: 101, emoji: '📐', name: 'ตะลุยโจทย์ TCAS คณิต', en: 'TCAS Math Crash Course', theme: 'coral', kind: 'study', goalType: 'sessions',
      author: 'ครูแนน', authorInitials: 'แ', authorColor: '#FF8AA0', likes: 342, uses: 1280,
      desc: 'คอร์สตะลุยโจทย์คณิต 30 คาบ ก่อนสอบ TCAS — แบ่งเป็นแคลคูลัส เรขาคณิต และสถิติ พร้อมชุดข้อสอบเก่า',
      budgetTotal: 30000, hoursGoal: 60, deadlineDays: 45,
      categories: {
        CALC: { th: 'แคลคูลัส', en: 'Calculus', short: 'CAL', color: '#FF8AA0', soft: '#FFEBF0', ins: 'me', rate: 300, target: 12 },
        GEO:  { th: 'เรขาคณิต', en: 'Geometry', short: 'GEO', color: '#B18AF0', soft: '#F1EBFC', ins: 'me', rate: 300, target: 10 },
        STAT: { th: 'สถิติ', en: 'Statistics', short: 'STA', color: '#6AAEF5', soft: '#E7F1FE', ins: 'me', rate: 300, target: 8 },
      } },
    { id: 102, emoji: '🏃‍♀️', name: 'วิ่งฮาล์ฟมาราธอน 12 สัปดาห์', en: 'Half-Marathon in 12 Weeks', theme: 'mint', kind: 'fitness', goalType: 'hours',
      author: 'โค้ชแบงค์', authorInitials: 'บ', authorColor: '#4FC7A8', likes: 521, uses: 2140,
      desc: 'ตารางซ้อมวิ่ง 12 สัปดาห์ ผสมคาร์ดิโอ ลองรัน และเวทขา — ค่อยๆ เพิ่มระยะจนพร้อมลงฮาล์ฟ 21 กม.',
      budgetTotal: 16000, hoursGoal: 48, deadlineDays: 84,
      categories: {
        LONG: { th: 'ลองรัน', en: 'Long Run', short: 'LR', color: '#4FC7A8', soft: '#E4F7F1', ins: 'me', rate: 0, target: 12 },
        INT:  { th: 'อินเทอร์วอล', en: 'Intervals', short: 'INT', color: '#FF8AA0', soft: '#FFEBF0', ins: 'me', rate: 0, target: 12 },
        LEG:  { th: 'เวทขา', en: 'Leg Day', short: 'LEG', color: '#F4A94C', soft: '#FEF0DC', ins: 'coach_bank', rate: 500, target: 8 },
      } },
    { id: 103, emoji: '🎹', name: 'เปียโนสำหรับมือใหม่', en: 'Piano for Beginners', theme: 'lilac', kind: 'study', goalType: 'sessions',
      author: 'ครูเจน', authorInitials: 'จ', authorColor: '#B18AF0', likes: 198, uses: 760,
      desc: 'เรียนเปียโนจากศูนย์ใน 20 คาบ — ทฤษฎีดนตรี การอ่านโน้ต และเพลงง่ายๆ เล่นได้จริงภายใน 2 เดือน',
      budgetTotal: 16000, hoursGoal: 30, deadlineDays: 60,
      categories: {
        THEORY: { th: 'ทฤษฎี', en: 'Music Theory', short: 'THY', color: '#B18AF0', soft: '#F1EBFC', ins: 'coach_jane', rate: 400, target: 6 },
        PRAC:   { th: 'ฝึกเล่น', en: 'Practice', short: 'PRC', color: '#6AAEF5', soft: '#E7F1FE', ins: 'coach_jane', rate: 400, target: 14 },
      } },
    { id: 104, emoji: '🗣️', name: 'พูดอังกฤษคล่องใน 30 วัน', en: 'Fluent English in 30 Days', theme: 'sky', kind: 'study', goalType: 'window',
      author: 'Ms. Lisa', authorInitials: 'ล', authorColor: '#6AAEF5', likes: 874, uses: 3320,
      desc: 'สปรินต์ 30 วัน เน้นการพูดและฟัง — คุยกับติวเตอร์วันเว้นวัน พร้อมการบ้านสั้นๆ ทุกครั้ง',
      budgetTotal: 18000, hoursGoal: 30, deadlineDays: 30,
      categories: {
        CONV: { th: 'สนทนา', en: 'Conversation', short: 'CNV', color: '#6AAEF5', soft: '#E7F1FE', ins: 'kru_lisa', rate: 600, target: 10 },
        LIST: { th: 'ฟัง', en: 'Listening', short: 'LST', color: '#4FC7A8', soft: '#E4F7F1', ins: 'kru_lisa', rate: 550, target: 6 },
      } },
  ]
}
