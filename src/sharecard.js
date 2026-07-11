// A shareable achievement card — opened in a new window, sized for a phone
// screenshot (portrait, IG-story friendly). Pure inline HTML/CSS so it works
// offline and needs no build step, mirroring timetable.js.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function buildShareCardHTML(p) {
  const accent = p.accent || '#FF8AA0'
  const accent2 = p.accent2 || '#B18AF0'
  const stats = (p.stats || []).map((s) => `
      <div class="stat">
        <div class="sv">${esc(s.value)}</div>
        <div class="sl">${esc(s.label)}</div>
      </div>`).join('')
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.titleTh)} · TutorSync</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+Thai+2:wght@500;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    font-family: 'Baloo Thai 2', -apple-system, sans-serif;
    background: #EEE7F5;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; min-height: 100%;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card {
    width: 100%; max-width: 440px; aspect-ratio: 4 / 5;
    border-radius: 34px; position: relative; overflow: hidden;
    background:
      radial-gradient(120% 80% at 15% 0%, ${accent}33 0%, transparent 55%),
      radial-gradient(120% 90% at 100% 100%, ${accent2}3d 0%, transparent 55%),
      linear-gradient(160deg, #FFFFFF 0%, #FFF7FB 60%, #F6F0FF 100%);
    box-shadow: 0 30px 70px rgba(74, 63, 85, .28), inset 0 0 0 1px #ffffff;
    padding: 40px 34px; display: flex; flex-direction: column;
  }
  .confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .confetti i {
    position: absolute; top: -12px; width: 10px; height: 14px; border-radius: 2px;
    opacity: .85; animation: fall linear infinite;
  }
  @keyframes fall { to { transform: translateY(680px) rotate(540deg); } }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; color: ${accent}; font-size: 17px; letter-spacing: .2px; }
  .brand .dot { width: 10px; height: 10px; border-radius: 50%; background: ${accent}; box-shadow: 0 0 0 4px ${accent}22; }
  .emoji { font-size: 96px; line-height: 1; margin: 30px 0 14px; filter: drop-shadow(0 10px 18px rgba(74,63,85,.22)); }
  .kicker { color: ${accent}; font-weight: 800; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; }
  .title { color: #4A3F55; font-weight: 800; font-size: 34px; line-height: 1.12; margin: 8px 0 4px; }
  .titleEn { color: #8A7C93; font-weight: 600; font-size: 17px; }
  .plan { display: inline-block; align-self: flex-start; margin-top: 16px; background: ${accent}1a; color: ${accent}; font-weight: 700; font-size: 15px; padding: 7px 15px; border-radius: 999px; }
  .stats { margin-top: auto; display: flex; gap: 10px; }
  .stat { flex: 1; background: #ffffffcc; border: 1px solid #F0E9F5; border-radius: 18px; padding: 14px 8px; text-align: center; box-shadow: 0 6px 16px rgba(74,63,85,.06); }
  .sv { color: #4A3F55; font-weight: 800; font-size: 22px; }
  .sl { color: #8A7C93; font-weight: 600; font-size: 11px; margin-top: 3px; }
  .foot { margin-top: 18px; color: #A99FB2; font-weight: 600; font-size: 13px; text-align: center; }
  .hint { position: fixed; bottom: 14px; left: 0; right: 0; text-align: center; color: #A99FB2; font-size: 13px; font-weight: 600; }
  @media print { .hint { display: none; } body { padding: 0; background: #fff; } }
</style></head>
<body>
  <div class="card">
    <div class="confetti">${confettiPieces(accent, accent2)}</div>
    <div class="brand"><span class="dot"></span>TutorSync</div>
    <div class="emoji">${esc(p.emoji || '🎉')}</div>
    <div class="kicker">${esc(p.kicker || 'GOAL COMPLETE')}</div>
    <div class="title">${esc(p.titleTh)}</div>
    <div class="titleEn">${esc(p.titleEn)}</div>
    ${p.planName ? `<span class="plan">📚 ${esc(p.planName)}</span>` : ''}
    <div class="stats">${stats}</div>
    <div class="foot">${esc(p.foot || 'ทำสำเร็จแล้ววันนี้ · Completed on TutorSync')}</div>
  </div>
  <div class="hint">📸 บันทึกภาพหน้าจอเพื่อแชร์ · Screenshot to share</div>
</body></html>`
}

function confettiPieces(a, b) {
  const colors = [a, b, '#FFD36E', '#6AAEF5', '#4FC7A8', '#FF8AA0']
  // deterministic scatter (no Math.random — keeps card stable across reopens)
  let out = ''
  for (let i = 0; i < 26; i++) {
    const left = (i * 37) % 100
    const delay = ((i * 13) % 30) / 10
    const dur = 2.6 + ((i * 7) % 20) / 10
    const c = colors[i % colors.length]
    out += `<i style="left:${left}%;background:${c};animation-delay:-${delay}s;animation-duration:${dur}s"></i>`
  }
  return out
}

// Open the achievement card in a new window (screenshot-ready).
export function openShareCard(payload) {
  const html = buildShareCardHTML(payload)
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(html); w.document.close()
  return true
}
