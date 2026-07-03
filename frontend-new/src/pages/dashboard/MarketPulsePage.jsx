/**
 * pages/dashboard/MarketPulsePage.jsx
 *
 * DevPulse AI — Market Pulse 📊
 * Trending skills bar chart + Salary Insights + Skill Gap Analyzer.
 * Vanilla CSS-in-JS, dark glassmorphism.
 */

import { useState, useEffect } from 'react'
import useAuthStore from '@/stores/authStore'

function authFetch(url, opts = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

const ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Data Engineer', 'ML Engineer', 'Product Manager',
  'Mobile Developer', 'Security Engineer', 'QA Engineer',
]

// ── Trending skills bar chart ─────────────────────────────────────────────────
function TrendingSkills({ skills }) {
  const maxPct = Math.max(...skills.map(s => s.demand_pct), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {skills.map((s, i) => {
        const w     = (s.demand_pct / maxPct) * 100
        const up    = s.delta_week >= 0
        const hue   = Math.floor(220 + (i / skills.length) * 80)
        const color = `hsl(${hue},70%,65%)`
        return (
          <div key={s.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, color:'#94a3b8', minWidth:110, textAlign:'right' }}>{s.name}</span>
            <div style={{ flex:1, height:24, background:'rgba(255,255,255,0.04)', borderRadius:6, overflow:'hidden', position:'relative' }}>
              <div style={{
                height:'100%', borderRadius:6,
                width:`${w}%`,
                background:`linear-gradient(90deg,${color}88,${color})`,
                transition:'width 1s ease',
                boxShadow:`0 0 8px ${color}44`,
              }}/>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#fff', fontWeight:600 }}>
                {s.demand_pct.toFixed(0)}%
              </span>
            </div>
            <span style={{
              fontSize:11, fontWeight:700, minWidth:48, textAlign:'right',
              color: up ? '#4ade80' : '#f87171',
            }}>
              {up ? '▲' : '▼'}{Math.abs(s.delta_week).toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Salary card ───────────────────────────────────────────────────────────────
function SalaryCard({ role, data }) {
  const range = data.p75 - data.p25
  const medPct = range > 0 ? ((data.median - data.p25) / range) * 100 : 50
  return (
    <div style={S.salaryCard}>
      <p style={{ fontSize:12, color:'#818cf8', fontWeight:700, margin:'0 0 12px', textTransform:'uppercase' }}>{role}</p>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <p style={{ fontSize:36, fontWeight:800, color:'#f1f5f9', margin:0, letterSpacing:'-1px' }}>
          ${(data.median / 1000).toFixed(0)}k
        </p>
        <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0' }}>Median annual salary ({data.currency})</p>
      </div>

      {/* p25–p75 range bar */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <div style={{ height:8, borderRadius:99, background:'rgba(255,255,255,0.07)' }}>
          <div style={{
            position:'absolute', top:0, left:'0%', right:'0%',
            height:'100%', borderRadius:99,
            background:'linear-gradient(90deg,#6366f188,#818cf8)',
          }}/>
          {/* Median marker */}
          <div style={{
            position:'absolute', top:-4, left:`${medPct}%`, transform:'translateX(-50%)',
            width:16, height:16, borderRadius:'50%',
            background:'#f1f5f9', border:'2px solid #6366f1',
            boxShadow:'0 0 8px #6366f1',
          }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
          <span style={{ fontSize:11, color:'#64748b' }}>p25 ${(data.p25/1000).toFixed(0)}k</span>
          <span style={{ fontSize:11, color:'#64748b' }}>p75 ${(data.p75/1000).toFixed(0)}k</span>
        </div>
      </div>

      {/* Top companies */}
      {data.top_companies?.length > 0 && (
        <div>
          <p style={{ fontSize:11, color:'#475569', marginBottom:8 }}>Top hiring companies:</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {data.top_companies.map(c => (
              <span key={c} style={{ fontSize:11, color:'#94a3b8', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:99, padding:'3px 10px' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skill gap section ─────────────────────────────────────────────────────────
function SkillGapSection({ targetRole }) {
  const [gap,     setGap]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [target,  setTarget]  = useState(targetRole || 'Full Stack Developer')

  const loadGap = async (role = target) => {
    setLoading(true)
    try {
      const res  = await authFetch(`/api/v1/market/gap?target=${encodeURIComponent(role)}`)
      const json = await res.json()
      if (json.success) setGap(json)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadGap() }, [])

  return (
    <div style={S.card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={S.sectionTitle}>🎯 Skill Gap Analyzer</p>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={target} onChange={e => setTarget(e.target.value)} style={S.roleSelect}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button onClick={() => loadGap(target)} style={S.analyzeBtn} disabled={loading}>
            {loading ? '…' : 'Analyze'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:30 }}><div style={S.spinner}/></div>
      ) : gap ? (
        <div>
          <p style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>
            Target: <strong style={{ color:'#c7d2fe' }}>{gap.target_role}</strong> ·
            You have {gap.user_skills?.length || 0} skills mapped
          </p>

          {/* Priority skill highlight */}
          {gap.data?.priority_skill && (
            <div style={S.priorityCard}>
              <p style={{ fontSize:12, color:'#f59e0b', fontWeight:700, margin:'0 0 4px' }}>⚡ Start With This</p>
              <p style={{ fontSize:16, fontWeight:800, color:'#fbbf24', margin:0 }}>{gap.data.priority_skill}</p>
            </div>
          )}

          {/* Missing skills */}
          {gap.data?.missing?.length > 0 && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:11, color:'#475569', marginBottom:8, fontWeight:600 }}>MISSING SKILLS:</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {gap.data.missing.map(sk => (
                  <span key={sk} style={{ fontSize:12, color:'#fca5a5', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:99, padding:'3px 12px' }}>
                    ✗ {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended order */}
          {gap.data?.recommended_order?.length > 0 && (
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:11, color:'#475569', marginBottom:8, fontWeight:600 }}>RECOMMENDED LEARNING ORDER:</p>
              <ol style={{ margin:0, paddingLeft:20, display:'flex', flexDirection:'column', gap:6 }}>
                {gap.data.recommended_order.map((sk, i) => (
                  <li key={sk} style={{ fontSize:13, color: i === 0 ? '#fbbf24' : '#94a3b8', fontWeight: i === 0 ? 700 : 400 }}>
                    {sk}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color:'#475569', fontSize:13 }}>Click Analyze to see your skill gap.</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MarketPulsePage() {
  const [trends,       setTrends]    = useState(null)
  const [salary,       setSalary]    = useState(null)
  const [salaryRole,   setSalRole]   = useState('Full Stack Developer')
  const [loadTrends,   setLdTrends]  = useState(true)
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [lastUpdated,  setUpdated]   = useState(null)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    authFetch('/api/v1/market/trends')
      .then(r => r.json())
      .then(j => { if (j.success) { setTrends(j.data); setUpdated(new Date()) } })
      .finally(() => setLdTrends(false))
  }, [])

  const loadSalary = async (role = salaryRole) => {
    setSalaryLoading(true)
    try {
      const res  = await authFetch(`/api/v1/market/salary?role=${encodeURIComponent(role)}`)
      const json = await res.json()
      if (json.success) setSalary(json)
    } catch {}
    setSalaryLoading(false)
  }

  const profile = user?.devpulse_profile
  const targetRole = profile?.target_role || 'Full Stack Developer'

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', paddingBottom:40 }}>
      <style>{`@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.4px' }}>📊 Market Pulse</h1>
          <p style={{ fontSize:13, color:'#64748b', margin:'4px 0 0' }}>Live tech demand, salary data, and your skill gap — all in one place.</p>
        </div>
        {lastUpdated && (
          <p style={{ fontSize:11, color:'#334155' }}>Updated: {lastUpdated.toLocaleTimeString()}</p>
        )}
      </div>

      {/* Trending Skills */}
      <div style={S.card}>
        <p style={S.sectionTitle}>🔥 Trending Skills — Live Demand</p>
        {loadTrends ? (
          <div style={{ textAlign:'center', padding:30 }}><div style={S.spinner}/></div>
        ) : trends?.skills?.length > 0 ? (
          <TrendingSkills skills={trends.skills} />
        ) : (
          <p style={{ color:'#475569', fontSize:13 }}>Trends data unavailable.</p>
        )}
      </div>

      {/* Salary Insights */}
      <div style={{ ...S.card, marginTop:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={S.sectionTitle}>💰 Salary Insights</p>
          <div style={{ display:'flex', gap:8 }}>
            <select
              value={salaryRole}
              onChange={e => setSalRole(e.target.value)}
              style={S.roleSelect}
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <button onClick={() => loadSalary(salaryRole)} disabled={salaryLoading} style={S.analyzeBtn}>
              {salaryLoading ? '…' : 'Load'}
            </button>
          </div>
        </div>
        {salaryLoading ? (
          <div style={{ textAlign:'center', padding:30 }}><div style={S.spinner}/></div>
        ) : salary ? (
          <SalaryCard role={salary.role} data={salary.data} />
        ) : (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <p style={{ color:'#475569', fontSize:13, margin:'0 0 12px' }}>Select a role and click Load to see salary data.</p>
            <button onClick={() => loadSalary(salaryRole)} style={S.analyzeBtn}>Load Salary Data</button>
          </div>
        )}
      </div>

      {/* Skill Gap */}
      <div style={{ marginTop:20 }}>
        <SkillGapSection targetRole={targetRole} />
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  card: {
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:16, padding:'24px',
  },
  sectionTitle:{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 0', letterSpacing:'-0.2px' },
  roleSelect:{
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, color:'#e2e8f0', fontSize:12, padding:'6px 10px', cursor:'pointer', outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  analyzeBtn:{
    padding:'6px 14px', borderRadius:8, background:'rgba(99,102,241,0.15)',
    border:'1px solid rgba(99,102,241,0.35)', color:'#818cf8', fontSize:12,
    fontWeight:600, cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif",
  },
  salaryCard:{
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
    borderRadius:12, padding:'20px',
  },
  priorityCard:{
    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
    borderRadius:10, padding:'12px 16px', marginBottom:4,
  },
  spinner:{
    width:28, height:28, border:'3px solid rgba(255,255,255,0.08)',
    borderTop:'3px solid #6366f1', borderRadius:'50%',
    animation:'dp-spin 0.8s linear infinite', margin:'0 auto',
  },
}
