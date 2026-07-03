/**
 * pages/dashboard/CareerDashboardPage.jsx
 *
 * DevPulse AI — Career Command Center
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'

const API = '/api/v1/dashboard'

function authFetch(url, opts = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

// ── XP levels ────────────────────────────────────────────────────────────────
const XP_LEVELS = [
  { name: 'Intern',    min: 0,     color: '#94a3b8' },
  { name: 'Junior',    min: 500,   color: '#22d3ee' },
  { name: 'Mid',       min: 1500,  color: '#34d399' },
  { name: 'Senior',    min: 3500,  color: '#a78bfa' },
  { name: 'Principal', min: 7000,  color: '#f59e0b' },
  { name: 'Legend',    min: 12000, color: '#f97316' },
]

function getLevelColor(level) {
  return XP_LEVELS.find(l => l.name === level)?.color || '#818cf8'
}

// ── Gauge ring component ──────────────────────────────────────────────────────
function GaugeRing({ score, size = 120, stroke = 10 }) {
  const r     = (size - stroke * 2) / 2
  const circ  = 2 * Math.PI * r
  const pct   = Math.max(0, Math.min(100, score || 0))
  const dash  = (pct / 100) * circ
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#6366f1'
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto 8px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke}/>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontSize: size < 100 ? 20 : 28, fontWeight: 800, color, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>/ 100</span>
      </div>
    </div>
  )
}

// ── XP Bar ───────────────────────────────────────────────────────────────────
function XpBar({ totalXp, nextThreshold, level }) {
  const prevLvl = XP_LEVELS.slice().reverse().find(l => totalXp >= l.min) || XP_LEVELS[0]
  const base    = prevLvl.min
  const pct     = nextThreshold > base ? Math.min(100, ((totalXp - base) / (nextThreshold - base)) * 100) : 100
  const color   = getLevelColor(level)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{totalXp.toLocaleString()} XP</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>{nextThreshold.toLocaleString()} XP</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${pct}%`, borderRadius:99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition:'width 1s ease',
          boxShadow:`0 0 10px ${color}55`,
        }}/>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ children, glow = '#6366f1' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '24px 20px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${glow}22`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 8,
    }}>
      {children}
    </div>
  )
}

// ── CSS bar chart for XP timeline ────────────────────────────────────────────
function XpBarChart({ recent_xp }) {
  // Group by day (last 7 days)
  const today = new Date()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  const dailyXp = days.map(day => {
    const dayStr = day.toISOString().slice(0, 10)
    const total  = (recent_xp || [])
      .filter(x => x.created_at.slice(0, 10) === dayStr && x.xp_amount > 0)
      .reduce((sum, x) => sum + x.xp_amount, 0)
    return { label: day.toLocaleDateString('en', { weekday: 'short' }), xp: total }
  })

  const maxXp = Math.max(...dailyXp.map(d => d.xp), 1)

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
      {dailyXp.map((d, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:4 }}>
          <div style={{
            width:'100%', borderRadius:'4px 4px 0 0',
            height: `${Math.max(4, (d.xp / maxXp) * 64)}px`,
            background: d.xp > 0
              ? 'linear-gradient(180deg,#818cf8,#6366f1)'
              : 'rgba(255,255,255,0.06)',
            transition:'height 0.8s ease',
            boxShadow: d.xp > 0 ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
          }}/>
          <span style={{ fontSize:10, color:'#475569' }}>{d.label}</span>
          {d.xp > 0 && <span style={{ fontSize:9, color:'#818cf8' }}>+{d.xp}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CareerDashboardPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    authFetch(`${API}/stats`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const d = data || {}
  const levelColor = getLevelColor(d.level || 'Intern')

  const QUICK_ACTIONS = [
    { label: "Today's Challenge ⚡", to: '/daily-challenge', color: '#f59e0b' },
    { label: 'Mock Interview 🎤',    to: '/mock-interview',  color: '#22d3ee' },
    { label: 'Skill Battle ⚔️',      to: '/battle',          color: '#f87171' },
    { label: 'Upload Resume 📄',     to: '/resume',          color: '#a78bfa' },
  ]

  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <div style={S.spinner}/>
          <p style={{ color:'#64748b', marginTop:16 }}>Loading your career stats…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>
            Career Command Center
            <span style={{ marginLeft:10, fontSize:14, color:levelColor, fontWeight:600, background:`${levelColor}22`, padding:'2px 10px', borderRadius:99, border:`1px solid ${levelColor}44` }}>
              {d.level || 'Intern'}
            </span>
          </h1>
          <p style={S.subtitle}>Welcome back, {user?.full_name?.split(' ')[0] || 'Dev'} — keep the streak alive 🔥</p>
        </div>
      </div>

      {/* ── Top row: 4 stat cards ─────────────────────────────────────────── */}
      <div style={S.grid4}>
        {/* Career Health */}
        <StatCard glow="#6366f1">
          <GaugeRing score={d.career_health_score} />
          <p style={S.cardLabel}>Career Health</p>
        </StatCard>

        {/* Level / XP */}
        <StatCard glow={levelColor}>
          <div style={{ fontSize:36, marginBottom:4 }}>🏆</div>
          <p style={{ fontSize:20, fontWeight:800, color:levelColor, margin:0 }}>{d.level || 'Intern'}</p>
          <div style={{ width:'100%', marginTop:4 }}>
            <XpBar totalXp={d.total_xp || 0} nextThreshold={d.next_threshold || 500} level={d.level || 'Intern'}/>
            <p style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{(d.xp_to_next_level||0).toLocaleString()} XP to next level</p>
          </div>
        </StatCard>

        {/* Streak */}
        <StatCard glow="#f59e0b">
          <div style={{ fontSize:40 }}>🔥</div>
          <p style={{ fontSize:32, fontWeight:800, color:'#f59e0b', margin:0 }}>{d.streak_days || 0}</p>
          <p style={S.cardLabel}>Day Streak</p>
          <p style={{ fontSize:11, color:'#78716c' }}>Keep it up!</p>
        </StatCard>

        {/* Certs */}
        <StatCard glow="#22c55e">
          <div style={{ fontSize:40 }}>🎖️</div>
          <p style={{ fontSize:32, fontWeight:800, color:'#22c55e', margin:0 }}>{d.certs_count || 0}</p>
          <p style={S.cardLabel}>Certs Earned</p>
          <p style={{ fontSize:11, color:'#4b5563' }}>verified skills</p>
        </StatCard>
      </div>

      {/* ── Middle row ───────────────────────────────────────────────────────── */}
      <div style={S.grid3}>
        {/* Recent Badges */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Recent Badges</p>
          {(!d.recent_badges || d.recent_badges.length === 0) ? (
            <p style={{ color:'#475569', fontSize:13 }}>No badges yet — complete quizzes to earn them!</p>
          ) : (
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {d.recent_badges.map((b, i) => (
                <div key={i} style={S.badgeChip}>
                  <span style={{ fontSize:20 }}>{b.badge_icon}</span>
                  <span style={{ fontSize:11, color:'#c7d2fe', whiteSpace:'nowrap' }}>{b.badge_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Nudge */}
        <div style={S.nudgeCard}>
          <div style={S.nudgeBar}/>
          <p style={{ fontSize:12, color:'#818cf8', fontWeight:600, marginBottom:6 }}>AI COACH SAYS</p>
          <p style={{ fontSize:14, color:'#c7d2fe', fontStyle:'italic', lineHeight:1.6, margin:0 }}>
            {d.xp_to_next_level > 0
              ? `You're ${d.xp_to_next_level} XP away from ${XP_LEVELS.find(l => l.min > (d.total_xp||0))?.name || 'the next level'} — crush 3 more quizzes to get there! 🚀`
              : "You've reached Legend status! Challenge yourself with harder skills."}
          </p>
          {d.resume_ats_score != null && d.resume_ats_score < 70 && (
            <p style={{ fontSize:12, color:'#fbbf24', marginTop:8, fontStyle:'italic' }}>
              💡 Your resume ATS score is {d.resume_ats_score}% — enhance it to improve your chances.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Quick Actions</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <Link key={i} to={a.to} style={{
                display:'flex', alignItems:'center',
                padding:'10px 14px', borderRadius:10,
                background:`${a.color}11`, border:`1px solid ${a.color}33`,
                color: a.color, fontSize:13, fontWeight:600,
                textDecoration:'none', transition:'background 0.2s',
              }}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────────── */}
      <div style={S.grid2}>
        {/* XP Timeline */}
        <div style={S.card}>
          <p style={S.sectionTitle}>XP Timeline — Last 7 Days</p>
          <XpBarChart recent_xp={d.recent_xp} />
        </div>

        {/* Recent XP + Top skills */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Recent XP Activity</p>
          {(!d.recent_xp || d.recent_xp.length === 0) ? (
            <p style={{ color:'#475569', fontSize:13 }}>No XP activity yet — start a quiz!</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {d.recent_xp.slice(0, 6).map((x, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p style={{ fontSize:13, color:'#cbd5e1', margin:0 }}>{x.description || x.event_type}</p>
                    <p style={{ fontSize:11, color:'#475569', margin:0 }}>{new Date(x.created_at).toLocaleDateString()}</p>
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color: x.xp_amount > 0 ? '#4ade80' : '#f87171' }}>
                    {x.xp_amount > 0 ? '+' : ''}{x.xp_amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', paddingBottom:40 },
  header: { marginBottom:28 },
  title: { fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.4px' },
  subtitle: { fontSize:13, color:'#94a3b8', margin:'4px 0 0' },
  grid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 },
  grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  card: {
    background:'rgba(255,255,255,0.04)', backdropFilter:'blur(14px)',
    border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px',
    boxShadow:'0 8px 32px rgba(0,0,0,0.25)',
  },
  sectionTitle: { fontSize:12, fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 12px' },
  cardLabel: { fontSize:12, color:'#94a3b8', margin:0 },
  badgeChip: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
    background:'rgba(99,102,241,0.12)', border:'1px solid rgba(129,140,248,0.25)',
    borderRadius:10, padding:'10px 12px', flexShrink:0, cursor:'default',
    boxShadow:'0 0 12px rgba(99,102,241,0.2)',
  },
  nudgeCard: {
    background:'rgba(99,102,241,0.06)', backdropFilter:'blur(14px)',
    border:'1px solid rgba(99,102,241,0.2)', borderRadius:16, padding:20,
    position:'relative', overflow:'hidden',
  },
  nudgeBar: {
    position:'absolute', left:0, top:0, bottom:0, width:4,
    background:'linear-gradient(180deg,#6366f1,#8b5cf6)',
  },
  spinner: {
    width:36, height:36, border:'3px solid rgba(255,255,255,0.08)',
    borderTop:'3px solid #6366f1', borderRadius:'50%',
    animation:'dp-spin 0.8s linear infinite', margin:'0 auto',
  },
}
