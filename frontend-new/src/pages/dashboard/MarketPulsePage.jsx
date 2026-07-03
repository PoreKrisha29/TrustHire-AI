/**
 * pages/dashboard/MarketPulsePage.jsx
 *
 * DevPulse AI — Market Pulse 📊
 * Trending skills bar chart + Salary Insights + Skill Gap Analyzer.
 * Fully client-side mock implementation.
 * Vanilla CSS-in-JS, dark glassmorphism.
 */

import { useState, useEffect } from 'react'
import useAuthStore from '@/stores/authStore'

const ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Data Engineer', 'ML Engineer', 'Product Manager',
  'Mobile Developer', 'Security Engineer', 'QA Engineer',
]

const MARKET_TRENDS_MOCK = {
  skills: [
    { name: 'TypeScript', demand_pct: 88, delta_week: 2.4 },
    { name: 'React', demand_pct: 85, delta_week: 1.2 },
    { name: 'Python', demand_pct: 79, delta_week: -0.5 },
    { name: 'Node.js', demand_pct: 74, delta_week: 0.8 },
    { name: 'PostgreSQL', demand_pct: 70, delta_week: 1.5 },
    { name: 'Docker', demand_pct: 68, delta_week: 0.4 },
    { name: 'Kubernetes', demand_pct: 55, delta_week: 3.1 },
    { name: 'FastAPI', demand_pct: 48, delta_week: 1.9 },
  ]
}

const SALARY_DATA_MOCK = {
  'Frontend Developer': { median: 115000, p25: 90000, p75: 145000, currency: 'USD', top_companies: ['Google', 'Meta', 'Vercel', 'Stripe'] },
  'Backend Developer': { median: 125000, p25: 100000, p75: 160000, currency: 'USD', top_companies: ['Amazon', 'Netflix', 'Supabase', 'HashiCorp'] },
  'Full Stack Developer': { median: 120000, p25: 95000, p75: 150000, currency: 'USD', top_companies: ['Stripe', 'Airbnb', 'GitHub', 'Linear'] },
  'DevOps Engineer': { median: 135000, p25: 105000, p75: 170000, currency: 'USD', top_companies: ['AWS', 'Datadog', 'Cloudflare', 'Sentry'] },
  'Data Engineer': { median: 130000, p25: 102000, p75: 165000, currency: 'USD', top_companies: ['Snowflake', 'Databricks', 'Uber', 'Scale AI'] },
  'ML Engineer': { median: 160000, p25: 125000, p75: 210000, currency: 'USD', top_companies: ['OpenAI', 'Anthropic', 'Google Brain', 'NVIDIA'] },
  'Product Manager': { median: 140000, p25: 110000, p75: 180000, currency: 'USD', top_companies: ['Atlassian', 'Microsoft', 'Productboard', 'Figma'] },
  'Mobile Developer': { median: 118000, p25: 92000, p75: 148000, currency: 'USD', top_companies: ['Apple', 'Uber', 'Airbnb', 'Duolingo'] },
  'Security Engineer': { median: 142000, p25: 112000, p75: 185000, currency: 'USD', top_companies: ['CrowdStrike', 'Okta', 'Palantir', 'Cloudflare'] },
  'QA Engineer': { median: 85000, p25: 65000, p75: 105000, currency: 'USD', top_companies: ['BrowserStack', 'Microsoft', 'QA Wolf', 'Applitools'] },
}

const SKILL_GAPS_MOCK = {
  'Frontend Developer': {
    target_role: 'Frontend Developer',
    user_skills: ['React', 'JavaScript', 'CSS3'],
    data: {
      priority_skill: 'TypeScript',
      missing: ['TypeScript', 'Next.js', 'System Design'],
      recommended_order: ['TypeScript', 'Next.js', 'System Design']
    }
  },
  'Backend Developer': {
    target_role: 'Backend Developer',
    user_skills: ['Python', 'PostgreSQL'],
    data: {
      priority_skill: 'Node.js',
      missing: ['Node.js', 'Docker', 'Redis', 'System Design'],
      recommended_order: ['Node.js', 'Docker', 'Redis', 'System Design']
    }
  },
  'Full Stack Developer': {
    target_role: 'Full Stack Developer',
    user_skills: ['React', 'Python', 'PostgreSQL'],
    data: {
      priority_skill: 'TypeScript',
      missing: ['TypeScript', 'Node.js', 'Docker', 'Redis'],
      recommended_order: ['TypeScript', 'Node.js', 'Docker', 'Redis']
    }
  },
  'DevOps Engineer': {
    target_role: 'DevOps Engineer',
    user_skills: ['Docker'],
    data: {
      priority_skill: 'Kubernetes',
      missing: ['Kubernetes', 'Git', 'System Design'],
      recommended_order: ['Kubernetes', 'Git', 'System Design']
    }
  },
  'Data Engineer': {
    target_role: 'Data Engineer',
    user_skills: ['Python', 'PostgreSQL'],
    data: {
      priority_skill: 'Pandas',
      missing: ['Pandas', 'Docker', 'System Design'],
      recommended_order: ['Pandas', 'Docker', 'System Design']
    }
  },
  'ML Engineer': {
    target_role: 'ML Engineer',
    user_skills: ['Python'],
    data: {
      priority_skill: 'Scikit-learn',
      missing: ['Scikit-learn', 'Pandas', 'System Design'],
      recommended_order: ['Scikit-learn', 'Pandas', 'System Design']
    }
  },
  'Product Manager': {
    target_role: 'Product Manager',
    user_skills: [],
    data: {
      priority_skill: 'System Design',
      missing: ['System Design', 'Git'],
      recommended_order: ['System Design', 'Git']
    }
  },
  'Mobile Developer': {
    target_role: 'Mobile Developer',
    user_skills: ['React'],
    data: {
      priority_skill: 'React Native',
      missing: ['React Native', 'TypeScript', 'System Design'],
      recommended_order: ['React Native', 'TypeScript', 'System Design']
    }
  },
  'Security Engineer': {
    target_role: 'Security Engineer',
    user_skills: ['Docker', 'Git'],
    data: {
      priority_skill: 'System Design',
      missing: ['System Design', 'Kubernetes'],
      recommended_order: ['System Design', 'Kubernetes']
    }
  },
  'QA Engineer': {
    target_role: 'QA Engineer',
    user_skills: ['React', 'JavaScript'],
    data: {
      priority_skill: 'Git',
      missing: ['Git', 'TypeScript', 'Docker'],
      recommended_order: ['Git', 'TypeScript', 'Docker']
    }
  },
}

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
    await new Promise(resolve => setTimeout(resolve, 500))
    const mockData = SKILL_GAPS_MOCK[role] || SKILL_GAPS_MOCK['Full Stack Developer']
    setGap(mockData)
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
    // Load local mock trends
    setTimeout(() => {
      setTrends(MARKET_TRENDS_MOCK)
      setUpdated(new Date())
      setLdTrends(false)
    }, 400)
  }, [])

  const loadSalary = async (role = salaryRole) => {
    setSalaryLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    const mockSal = SALARY_DATA_MOCK[role]
    if (mockSal) {
      setSalary({
        role,
        data: mockSal
      })
    }
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
