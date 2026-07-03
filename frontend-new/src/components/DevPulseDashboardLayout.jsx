/**
 * components/DevPulseDashboardLayout.jsx
 *
 * Full dashboard shell: fixed left sidebar + sticky top bar + scrollable content.
 * Uses React Router <Outlet> for nested page rendering.
 * Includes dark/light theme toggle in the top bar.
 */

import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import DevPulseSidebar from './DevPulseSidebar'
import useAuthStore   from '@/stores/authStore'
import useThemeStore  from '@/stores/theme.store'
import { XPToastContainer } from './XPToast'

function authFetch(url, opts = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

const LEVEL_COLORS = {
  Intern:'#94a3b8', Junior:'#22d3ee', Mid:'#34d399',
  Senior:'#a78bfa', Principal:'#f59e0b', Legend:'#f97316',
}

// ── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        width: 36, height: 36, borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, transition: 'background 0.2s, transform 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}

export default function DevPulseDashboardLayout() {
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const theme    = useThemeStore(s => s.theme)
  const applyTheme = useThemeStore(s => s.applyTheme)

  const [stats,       setStats]    = useState(null)
  const [sidebarOpen, setSidebar]  = useState(window.innerWidth >= 768)

  // Apply saved theme on mount
  useEffect(() => { applyTheme() }, [])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const h = () => {
      if (window.innerWidth < 768) setSidebar(false)
      else setSidebar(true)
    }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    authFetch('/api/v1/dashboard/stats')
      .then(r => r.json())
      .then(j => { if (j.success) setStats(j.data) })
      .catch(() => {})
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const xp    = stats?.total_xp ?? (user?.devpulse_profile?.total_xp ?? 0)
  const level = stats?.level    ?? (user?.devpulse_profile?.level ?? 'Intern')
  const lc    = LEVEL_COLORS[level] || '#818cf8'

  const isDark = theme === 'dark'

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: isDark ? '#080b14' : '#f0f2f8',
      fontFamily: "'Inter',system-ui,sans-serif",
      transition: 'background 0.3s',
    }}>
      <XPToastContainer />
      <style>{`
        @keyframes dp-spin { to { transform:rotate(360deg) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:5px; height:5px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(128,128,128,0.25); border-radius:99px }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <DevPulseSidebar
        open={sidebarOpen}
        user={user}
        level={level}
        levelColor={lc}
        onLogout={handleLogout}
        theme={theme}
      />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, marginLeft: sidebarOpen ? 240 : 0, transition:'margin 0.3s' }}>

        {/* Top bar */}
        <header style={{
          height: 56, display:'flex', alignItems:'center', gap:12,
          padding: '0 20px', flexShrink: 0, position:'sticky', top:0, zIndex:80,
          background: isDark ? 'rgba(8,11,20,0.94)' : 'rgba(240,242,248,0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
          transition: 'background 0.3s',
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setSidebar(v => !v)}
            style={{ background:'none', border:'none', color: isDark ? '#64748b' : '#94a3b8', fontSize:20, cursor:'pointer', padding:'4px 6px', borderRadius:6, display:'flex', alignItems:'center' }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          {/* Search bar */}
          <div style={{
            flex:1, maxWidth:320,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius:10, padding:'8px 14px', cursor:'text',
          }}>
            <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize:13 }}>🔍 Search…</span>
            <kbd style={{
              fontSize:10, color: isDark ? '#334155' : '#94a3b8',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius:4, padding:'2px 6px',
            }}>⌘K</kbd>
          </div>

          {/* Right section */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto' }}>
            {/* Daily challenge pill */}
            <button
              onClick={() => navigate('/dashboard/battle')}
              style={{
                padding:'6px 14px', borderRadius:99,
                background:'transparent', border:'1px solid rgba(99,102,241,0.5)',
                color:'#818cf8', fontSize:12, fontWeight:600, cursor:'pointer',
                whiteSpace:'nowrap', fontFamily:"'Inter',system-ui,sans-serif",
              }}
            >
              ⚡ Daily Challenge
            </button>

            {/* XP chip */}
            <div style={{
              padding:'4px 12px', borderRadius:99, border:`1px solid ${lc}44`,
              background:`${lc}15`, color:lc, fontSize:12, fontWeight:700, whiteSpace:'nowrap',
            }}>
              {xp.toLocaleString()} XP
            </div>

            {/* 🌙/☀️ Theme toggle */}
            <ThemeToggle />

            {/* Notification bell */}
            <button style={{ background:'none', border:'none', cursor:'pointer', position:'relative', display:'flex', alignItems:'center', padding:4 }} aria-label="Notifications">
              <span style={{ fontSize:16 }}>🔔</span>
              <span style={{ position:'absolute', top:2, right:2, width:7, height:7, borderRadius:'50%', background:'#ef4444', border: isDark ? '1px solid #080b14' : '1px solid #f0f2f8' }}/>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex:1, padding:'28px 28px 60px', overflowY:'auto',
          color: isDark ? '#f1f5f9' : '#1e293b',
          maxWidth:1200, width:'100%', margin:'0 auto',
          transition: 'color 0.3s',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
