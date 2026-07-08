import React from 'react'
import { sx } from '../util.js'

const shimmer = 'background:linear-gradient(90deg,#F1ECF5 25%,#F8F3FA 50%,#F1ECF5 75%);background-size:320px 100%;animation:ts-shimmer 1.3s infinite linear;'

export function HomeScreen({ v }) {
  return (
    <div style={sx('display:flex;flex-direction:column;gap:14px;padding-top:2px;')}>
      <div style={sx('display:flex;gap:6px;background:rgba(255,255,255,.6);border-radius:18px;padding:5px;box-shadow:0 6px 16px rgba(180,120,150,.08);')}>
        <button onClick={v.goMine} style={sx(v.segMine)}>🎯 ของฉัน · Mine</button>
        <button onClick={v.goMarket} style={sx(v.segMarket)}>🛍️ มาร์เก็ต · Explore</button>
      </div>

      {v.homeMarket && (
        <div style={sx('display:flex;flex-direction:column;gap:14px;')}>
          {/* Search + category filters (Airtable/Craft template-gallery pattern) */}
          <div style={sx('display:flex;align-items:center;gap:9px;background:#fff;border-radius:16px;padding:4px 6px 4px 14px;box-shadow:0 6px 16px rgba(180,120,150,.1);')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B0A4BC" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
            <input value={v.marketQuery} onChange={v.setMarketQuery} placeholder="ค้นหาแพลน…  search templates" style={sx("flex:1;border:none;outline:none;background:transparent;font-family:'Nunito',sans-serif;font-weight:700;font-size:13.5px;color:#4A3F55;min-width:0;padding:9px 0;")} />
          </div>
          <div style={sx('display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;')}>
            {v.marketFilters.map((c, i) => <button key={i} onClick={c.onTap} style={sx(c.style)}>{c.label}</button>)}
          </div>

          <div style={sx('font-size:12.5px;font-weight:700;color:#B0A4BC;padding:0 2px;')}>แพลนยอดนิยมจากคอมมูนิตี้ · Popular templates you can copy ✨</div>
          {v.marketCards.map((mk) => (
            <button key={mk.id} onClick={mk.onTap} style={sx('width:100%;text-align:left;border:none;background:#fff;border-radius:26px;padding:18px;box-shadow:0 12px 30px rgba(180,120,150,.14);cursor:pointer;animation:ts-cardin .45s ease both;position:relative;overflow:hidden;')}>
              <div style={sx(mk.glow)} />
              <div style={sx('display:flex;align-items:center;gap:13px;position:relative;')}>
                <div style={sx(mk.iconStyle)}>{mk.emoji}</div>
                <div style={sx('flex:1;min-width:0;')}>
                  <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16.5px;color:#4A3F55;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{mk.name}</div>
                  <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;')}>{mk.en}</div>
                </div>
                <span style={sx(mk.typeBadge)}>{mk.typeLabel}</span>
              </div>
              <div style={sx('font-size:12.5px;font-weight:700;color:#8A7C93;margin-top:12px;position:relative;line-height:1.4;')}>{mk.desc}</div>
              <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:13px;position:relative;')}>
                <div style={sx('display:flex;align-items:center;gap:8px;')}>
                  <span style={sx(mk.authorAvatar)}>{mk.authorInitials}</span>
                  <span style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>โดย {mk.author}</span>
                </div>
                <div style={sx(`font-size:11.5px;font-weight:800;color:${mk.color};`)}>❤️ {mk.likes} · ⬇ {mk.uses}</div>
              </div>
            </button>
          ))}
          {v.marketEmpty && (
            <div style={sx('text-align:center;padding:30px 20px;')}>
              <div style={sx('font-size:44px;')}>🔍</div>
              <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:700;font-size:14px;color:#8A7C93;margin-top:8px;")}>ไม่พบแพลนที่ค้นหา</div>
              <div style={sx('font-size:12px;font-weight:700;color:#B8AAC4;')}>Try another keyword or filter</div>
            </div>
          )}
          <div style={sx('text-align:center;font-size:11.5px;font-weight:700;color:#C6B6D0;padding:4px 0 2px;')}>เผยแพร่แพลนของคุณได้จากหน้าเป้าหมาย 📤</div>
        </div>
      )}

      {v.homeMine && (
        <div style={sx('display:flex;flex-direction:column;gap:14px;')}>
          {v.loading && v.loadingCards.map((i) => (
            <div key={i} style={sx('background:#fff;border-radius:26px;padding:18px;box-shadow:0 12px 30px rgba(180,120,150,.1);')}>
              <div style={sx('display:flex;align-items:center;gap:13px;')}>
                <div style={sx('width:52px;height:52px;border-radius:18px;flex:none;' + shimmer)} />
                <div style={sx('flex:1;')}>
                  <div style={sx('height:15px;width:60%;border-radius:7px;' + shimmer)} />
                  <div style={sx('height:11px;width:40%;border-radius:6px;margin-top:7px;' + shimmer)} />
                </div>
              </div>
              <div style={sx('height:20px;width:45%;border-radius:8px;margin-top:16px;' + shimmer)} />
              <div style={sx('height:11px;width:100%;border-radius:8px;margin-top:10px;' + shimmer)} />
            </div>
          ))}
          {v.notLoading && (
            <div style={sx('display:flex;flex-direction:column;gap:14px;')}>
              {v.planCards.map((pl) => (
                <button key={pl.id} onClick={pl.onTap} style={sx('width:100%;text-align:left;border:none;background:#fff;border-radius:26px;padding:18px;box-shadow:0 12px 30px rgba(180,120,150,.14);cursor:pointer;animation:ts-cardin .45s ease both;position:relative;overflow:hidden;')}>
                  <div style={sx(pl.glow)} />
                  <div style={sx('display:flex;align-items:center;gap:13px;position:relative;')}>
                    <div style={sx(pl.iconStyle)}>{pl.emoji}</div>
                    <div style={sx('flex:1;min-width:0;')}>
                      <div style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16.5px;color:#4A3F55;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{pl.name}</div>
                      <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;')}>{pl.en}</div>
                    </div>
                    <span style={sx(pl.typeBadge)}>{pl.typeLabel}</span>
                  </div>
                  <div style={sx('display:flex;align-items:baseline;justify-content:space-between;margin-top:14px;position:relative;')}>
                    <span style={sx("font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:20px;color:#4A3F55;")}>{pl.big}</span>
                    <span style={sx(`font-size:11.5px;font-weight:800;color:${pl.color};`)}>{pl.pctText}</span>
                  </div>
                  <div style={sx('margin-top:8px;height:11px;border-radius:8px;background:#F2ECF6;overflow:hidden;position:relative;')}><div style={sx(pl.barStyle)} /></div>
                  <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:12px;position:relative;')}>
                    <div style={sx('display:flex;align-items:center;')}>
                      {pl.avatars.map((a, i) => <div key={i} style={sx(a.style)}>{a.initials}</div>)}
                    </div>
                    <div style={sx('font-size:11.5px;font-weight:700;color:#B0A4BC;')}>{pl.metaText} ›</div>
                  </div>
                </button>
              ))}
              <button onClick={v.openCreate} style={sx(`width:100%;border:2px dashed ${v.g.pcBorder};border-radius:24px;background:${v.g.pcSoft};color:${v.g.pc};font-family:'Baloo Thai 2',sans-serif;font-weight:800;font-size:16px;padding:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;animation:ts-cardin .5s ease both;`)}>
                <span style={sx('font-size:22px;')}>＋</span> สร้างเป้าหมายใหม่ · New goal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
