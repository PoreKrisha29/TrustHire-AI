/**
 * components/DevPulseSidebar.jsx
 *
 * Fixed-width navigation sidebar for the DevPulse dashboard.
 * Groups: Overview, Resume, Grow, Compete, Intel.
 */

import { NavLink, useLocation } from 'react-router-dom'

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { label: 'Dashboard',    icon: '🏠', to: '/dashboard' },
      { label: 'Profile',      icon: '👤', to: '/dashboard/profile' },
    ],
  },
  {
    group: 'RESUME',
    items: [
      { label: 'Resume Forge', icon: '📄', to: '/dashboard/resume' },
      { label: 'Applications', icon: '📋', to: '/dashboard/applications' },
    ],
  },
  {
    group: 'GROW',
    items: [
      { label: 'Skill Genome', icon: '🧬', to: '/dashboard/genome' },
      { label: 'Learn & Certify', icon: '🎓', to: '/dashboard/learn' },
      { label: 'Project Vault', icon: '🗂️', to: '/dashboard/projects' },
    ],
  },
  {
    group: 'COMPETE',
    items: [
      { label: 'Mock Interview', icon: '🎤', to: '/dashboard/interview' },
      { label: 'Skill Battle',   icon: '⚔️', to: '/dashboard/battle' },
      { label: 'AI Coach',       icon: '🧠', to: '/dashboard/coach' },
    ],
  },
  {
    group: 'INTEL',
    items: [
      { label: 'Market Pulse', icon: '📊', to: '/dashboard/market' },
    ],
  },
]

// ── Level colours ─────────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  Intern: '#94a3b8', Junior: '#22d3ee', Mid: '#34d399',
  Senior: '#a78bfa', Principal: '#f59e0b', Legend: '#f97316',
}

export default function DevPulseSidebar({ open, user, level, levelColor, onLogout, theme }) {
  const location = useLocation()
  const isDark = (theme || 'dark') === 'dark'

  if (!open) return null

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(to)
  }

  const lc = levelColor || LEVEL_COLORS[level] || '#818cf8'

  return (
    <aside style={{
      ...S.sidebar,
      background: isDark ? 'rgba(10,12,22,0.98)' : 'rgba(240,242,248,0.98)',
      borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
    }}>
      {/* Brand */}
      <div style={{ ...S.brand, borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)' }}>
        <div style={S.brandIcon}>⚡</div>
        <div>
          <p style={{ ...S.brandName, color: isDark ? '#f1f5f9' : '#1e293b' }}>DevPulse AI</p>
          <p style={{ ...S.brandSub, color: isDark ? '#475569' : '#94a3b8' }}>Career OS</p>
        </div>
      </div>

      {/* Navigation groups */}
      <nav style={S.nav}>
        {NAV.map(group => (
          <div key={group.group} style={{ marginBottom:20 }}>
            <p style={{ ...S.groupLabel, color: isDark ? '#334155' : '#94a3b8' }}>{group.group}</p>
            {group.items.map(item => {
              const active = isActive(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  style={{
                    ...S.navItem,
                    background: active
                      ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)')
                      : 'transparent',
                    color: active
                      ? (isDark ? '#c7d2fe' : '#4f46e5')
                      : (isDark ? '#64748b' : '#94a3b8'),
                    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize:16, lineHeight:1 }}>{item.icon}</span>
                  <span style={{ fontSize:13 }}>{item.label}</span>
                  {active && <div style={S.activeDot}/>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ ...S.footer, borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)' }}>
        <div style={S.userRow}>
          <div style={{ ...S.avatar, background:`linear-gradient(135deg,${lc}88,${lc})` }}>
            {(user?.full_name || 'D')[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ ...S.userName, color: isDark ? '#e2e8f0' : '#1e293b' }}>{user?.full_name || 'Developer'}</p>
            <span style={{ fontSize:10, color:lc, background:`${lc}22`, borderRadius:99, padding:'1px 8px', fontWeight:700 }}>
              {level || 'Intern'}
            </span>
          </div>
        </div>
        <button onClick={onLogout} style={S.logoutBtn}>
          ← Logout
        </button>
      </div>
    </aside>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  sidebar: {
    width:240, flexShrink:0,
    background:'rgba(10,12,22,0.98)',
    borderRight:'1px solid rgba(255,255,255,0.06)',
    display:'flex', flexDirection:'column',
    position:'fixed', top:0, left:0, bottom:0, zIndex:90,
    overflowY:'auto',
  },
  brand: {
    display:'flex', alignItems:'center', gap:10,
    padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
    flexShrink:0,
  },
  brandIcon:{
    width:34, height:34, borderRadius:10,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:18,
    boxShadow:'0 0 16px rgba(99,102,241,0.4)',
  },
  brandName:{ fontSize:15, fontWeight:800, color:'#f1f5f9', margin:0, letterSpacing:'-0.3px' },
  brandSub: { fontSize:10, color:'#475569', margin:'1px 0 0' },
  nav: { flex:1, padding:'16px 10px', overflowY:'auto' },
  groupLabel:{
    fontSize:10, fontWeight:700, color:'#334155',
    textTransform:'uppercase', letterSpacing:'0.5px',
    margin:'0 6px 6px', padding:'0',
  },
  navItem:{
    display:'flex', alignItems:'center', gap:10,
    padding:'9px 12px', borderRadius:9, marginBottom:2,
    textDecoration:'none', transition:'all 0.15s',
    position:'relative',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  activeDot:{
    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
    width:5, height:5, borderRadius:'50%', background:'#818cf8',
  },
  footer:{
    borderTop:'1px solid rgba(255,255,255,0.06)',
    padding:'14px 12px', flexShrink:0,
  },
  userRow:{ display:'flex', alignItems:'center', gap:10, marginBottom:10 },
  avatar:{
    width:34, height:34, borderRadius:'50%', flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:14, fontWeight:800, color:'#fff',
  },
  userName:{ fontSize:13, fontWeight:600, color:'#e2e8f0', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:{
    width:'100%', padding:'8px', borderRadius:8,
    background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
    color:'#f87171', fontSize:12, fontWeight:600, cursor:'pointer',
    fontFamily:"'Inter',system-ui,sans-serif",
    transition:'background 0.15s',
  },
}
