/**
 * pages/dashboard/SkillGenomePage.jsx
 *
 * DevPulse AI — Skill Genome
 * Domain sidebar filter + skill grid + bottom drawer on click.
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

function authFetch(url, opts = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

// ── Domain colour map ─────────────────────────────────────────────────────────
const DOMAIN_COLORS = {
  'Web Frontend': '#818cf8',
  'Backend':      '#34d399',
  'DevOps':       '#f59e0b',
  'Databases':    '#22d3ee',
  'Mobile':       '#f472b6',
  'Data / ML':    '#a78bfa',
  'Tools':        '#94a3b8',
}

// ── Status helpers ────────────────────────────────────────────────────────────
function getSkillStatus(userSkills, skillName) {
  const sk = (userSkills || []).find(s => s.skill_name === skillName)
  if (!sk) return 'locked'
  if (sk.is_certified) return 'certified'
  if (sk.is_self_marked) return 'known'
  return 'locked'
}

function StatusIcon({ status }) {
  if (status === 'certified') return <span style={{ fontSize: 16 }}>✅</span>
  if (status === 'known')     return <span style={{ fontSize: 16 }}>✋</span>
  return <span style={{ fontSize: 16, opacity: 0.4 }}>🔒</span>
}

// ── Skill card ────────────────────────────────────────────────────────────────
function SkillCard({ skill, domain, status, xpContrib, onClick, selected }) {
  const domainColor = DOMAIN_COLORS[domain] || '#818cf8'
  return (
    <div
      onClick={onClick}
      style={{
        ...S.skillCard,
        border: selected
          ? `1px solid ${domainColor}`
          : status === 'certified'
            ? `1px solid ${domainColor}55`
            : '1px solid rgba(255,255,255,0.07)',
        boxShadow: status === 'certified'
          ? `0 0 16px ${domainColor}33`
          : selected
            ? `0 0 12px ${domainColor}44`
            : 'none',
        background: status === 'certified'
          ? `rgba(${domainColor === '#818cf8' ? '129,140,248' : '52,211,153'},0.07)`
          : 'rgba(255,255,255,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: 1.3 }}>
          {skill}
        </p>
        <StatusIcon status={status} />
      </div>
      {xpContrib > 0 && (
        <span style={{
          marginTop: 8, display: 'inline-block',
          fontSize: 10, color: domainColor,
          background: `${domainColor}22`, border: `1px solid ${domainColor}44`,
          borderRadius: 99, padding: '2px 8px', fontWeight: 600,
        }}>
          +{xpContrib} XP
        </span>
      )}
    </div>
  )
}

// ── Bottom drawer ─────────────────────────────────────────────────────────────
function SkillDrawer({ skill, domain, status, onMarkKnown, onClose, loading }) {
  const domainColor = DOMAIN_COLORS[domain] || '#818cf8'
  const DESCRIPTIONS = {
    React: 'A JavaScript library for building component-based UIs. Essential for modern web frontends.',
    PostgreSQL: 'A powerful open-source relational database with advanced SQL features and JSON support.',
    Docker: 'Containerisation platform enabling consistent dev/prod environments and microservices.',
    Python: 'Versatile, readable language powering backend, data science, and AI applications.',
    default: `${skill} is a key skill in the ${domain} domain, highly valued by top tech employers.`,
  }
  const desc = DESCRIPTIONS[skill] || DESCRIPTIONS.default

  return (
    <div style={S.drawer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{skill}</h3>
            <span style={{
              fontSize: 11, color: domainColor,
              background: `${domainColor}22`, border: `1px solid ${domainColor}44`,
              borderRadius: 99, padding: '2px 10px',
            }}>
              {domain}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>{desc}</p>
        </div>
        <button onClick={onClose} style={S.closeBtn} aria-label="Close">✕</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={onMarkKnown}
          disabled={loading || status === 'certified'}
          style={{
            ...S.actionBtn,
            background: status === 'known' || status === 'certified'
              ? `rgba(${status === 'certified' ? '99,102,241' : '99,102,241'},0.15)`
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${status === 'known' ? domainColor : 'rgba(255,255,255,0.12)'}`,
            color: status === 'certified' ? '#64748b' : '#e2e8f0',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '…' : status === 'certified' ? '✅ Certified' : status === 'known' ? '✋ Mark as Unknown' : '✋ Mark as Known'}
        </button>

        <a href={`/learn-certify?skill=${encodeURIComponent(skill)}`} style={S.certifyBtn}>
          🎯 Certify this skill →
        </a>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SkillGenomePage() {
  const [catalog,     setCatalog]     = useState({})
  const [userSkills,  setUserSkills]  = useState([])
  const [domain,      setDomain]      = useState('All Domains')
  const [selected,    setSelected]    = useState(null)  // { skill, domain }
  const [toggling,    setToggling]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [targetRole,  setTargetRole]  = useState('Full Stack')

  useEffect(() => {
    Promise.all([
      authFetch('/api/v1/skills/catalog').then(r => r.json()),
      authFetch('/api/v1/skills/').then(r => r.json()),
    ]).then(([cat, usk]) => {
      if (cat.success) setCatalog(cat.data)
      if (usk.success) setUserSkills(Object.values(usk.data).flat())
    }).finally(() => setLoading(false))
  }, [])

  const handleMarkKnown = useCallback(async () => {
    if (!selected) return
    setToggling(true)
    try {
      const res  = await authFetch('/api/v1/skills/mark-known', {
        method: 'POST',
        body:   JSON.stringify({ skill_name: selected.skill, domain: selected.domain }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      // Update local userSkills
      setUserSkills(prev => {
        const exists = prev.find(s => s.skill_name === selected.skill)
        if (exists) {
          return prev.map(s =>
            s.skill_name === selected.skill
              ? { ...s, is_self_marked: json.data.is_self_marked }
              : s
          )
        }
        return [...prev, {
          skill_name: selected.skill,
          domain: selected.domain,
          is_self_marked: true,
          is_certified: false,
          xp_contribution: 0,
        }]
      })

      toast.success(json.data.is_self_marked ? `✋ ${selected.skill} marked as known!` : `${selected.skill} unmarked`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setToggling(false)
    }
  }, [selected])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalKnown = userSkills.filter(s => s.is_self_marked || s.is_certified).length
  const totalCert  = userSkills.filter(s => s.is_certified).length
  const domains    = Object.keys(catalog)
  const allSkills  = Object.entries(catalog).flatMap(([d, sks]) => sks.map(s => ({ skill: s, domain: d })))

  // Coverage for target role
  const roleDomainMap = {
    'Full Stack': ['Web Frontend', 'Backend', 'Databases'],
    'Frontend':   ['Web Frontend', 'Tools'],
    'Backend':    ['Backend', 'Databases', 'Tools'],
    'DevOps':     ['DevOps', 'Tools'],
    'Data Engineer': ['Data / ML', 'Databases', 'Tools'],
  }
  const roleDomains    = roleDomainMap[targetRole] || []
  const roleSkills     = allSkills.filter(s => roleDomains.includes(s.domain))
  const roleKnown      = roleSkills.filter(s => {
    const st = getSkillStatus(userSkills, s.skill)
    return st === 'known' || st === 'certified'
  }).length
  const coveragePct    = roleSkills.length > 0 ? Math.round((roleKnown / roleSkills.length) * 100) : 0

  // Filter skills for grid
  const gridSkills = domain === 'All Domains'
    ? allSkills
    : allSkills.filter(s => s.domain === domain)

  const selStatus    = selected ? getSkillStatus(userSkills, selected.skill) : 'locked'
  const selXp        = selected ? (userSkills.find(s => s.skill_name === selected.skill)?.xp_contribution || 0) : 0

  return (
    <div style={S.page}>
      <style>{`@keyframes dp-fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes dp-slideup{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>🧬 Skill Genome</h1>
        <p style={S.pageSub}>Map your technical skillset across 7 domains</p>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>Known</span>
          <span style={{ color: '#22d3ee', fontWeight: 700 }}>{totalKnown}</span>
        </div>
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>Certified</span>
          <span style={{ color: '#22c55e', fontWeight: 700 }}>{totalCert}</span>
        </div>
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>Coverage for</span>
          <select
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            style={S.roleSelect}
          >
            {Object.keys(roleDomainMap).map(r => <option key={r}>{r}</option>)}
          </select>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{coveragePct}%</span>
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <p style={S.sidebarTitle}>Domain Filter</p>
          {['All Domains', ...domains].map(d => {
            const color = DOMAIN_COLORS[d] || '#94a3b8'
            const active = domain === d
            return (
              <button
                key={d}
                onClick={() => setDomain(d)}
                style={{
                  ...S.domainBtn,
                  background: active ? `${color}22` : 'transparent',
                  border: active ? `1px solid ${color}55` : '1px solid transparent',
                  color: active ? color : '#94a3b8',
                }}
              >
                {d !== 'All Domains' && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 8, flexShrink: 0 }}/>
                )}
                {d}
              </button>
            )
          })}
        </aside>

        {/* Skill grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={S.spinner}/><p style={{ color: '#64748b', marginTop: 12 }}>Loading skill catalog…</p>
            </div>
          ) : (
            <>
              <div style={S.grid}>
                {gridSkills.map(({ skill, domain: d }) => {
                  const st   = getSkillStatus(userSkills, skill)
                  const xp   = userSkills.find(s => s.skill_name === skill)?.xp_contribution || 0
                  const isSel = selected?.skill === skill
                  return (
                    <SkillCard
                      key={`${d}-${skill}`}
                      skill={skill}
                      domain={d}
                      status={st}
                      xpContrib={xp}
                      selected={isSel}
                      onClick={() => setSelected(isSel ? null : { skill, domain: d })}
                    />
                  )
                })}
              </div>

              {/* Legend */}
              <div style={S.legend}>
                <span>🔒 Not mapped</span>
                <span>✋ Self-marked</span>
                <span>✅ AI-certified</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <SkillDrawer
          skill={selected.skill}
          domain={selected.domain}
          status={selStatus}
          xpContrib={selXp}
          loading={toggling}
          onMarkKnown={handleMarkKnown}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { fontFamily: "'Inter',system-ui,sans-serif", color: '#f1f5f9', paddingBottom: 100 },
  pageHeader:{ marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' },
  pageSub:   { fontSize: 13, color: '#94a3b8', margin: '4px 0 0' },
  statsBar:  {
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '12px 20px', marginBottom: 24,
  },
  statPill:  { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  roleSelect:{
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', fontSize: 12, padding: '2px 6px', cursor: 'pointer',
    outline: 'none',
  },
  body:      { display: 'flex', gap: 20, alignItems: 'flex-start' },
  sidebar:   {
    width: 180, flexShrink: 0,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, position: 'sticky', top: 20,
  },
  sidebarTitle:{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 },
  domainBtn: {
    display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
    padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s', marginBottom: 3,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 10, marginBottom: 16,
  },
  skillCard: {
    borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
    transition: 'all 0.2s',
    animation: 'dp-fadein 0.3s ease-out',
  },
  legend: {
    display: 'flex', gap: 20, fontSize: 12, color: '#475569',
    marginTop: 8,
  },
  drawer: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
    background: 'rgba(15,15,30,0.97)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px 16px 0 0',
    padding: '24px 28px', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
    animation: 'dp-slideup 0.3s ease-out',
  },
  actionBtn: {
    padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  certifyBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14,
  },
  spinner: {
    width: 32, height: 32, border: '3px solid rgba(255,255,255,0.08)',
    borderTop: '3px solid #6366f1', borderRadius: '50%',
    animation: 'dp-spin 0.8s linear infinite', margin: '0 auto',
  },
}
