/**
 * pages/dashboard/SkillGenomePage.jsx
 *
 * DevPulse AI — Skill Genome
 * Skills pulled from candidate profile (GET /api/candidates/me).
 * Skill catalog is local — no /api/v1/skills endpoint exists.
 * Mark-known updates candidate profile (PUT /api/candidates/me).
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

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

// ── Hardcoded skill catalog (grouped by domain) ───────────────────────────────
const SKILL_CATALOG = {
  'Web Frontend': ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Redux', 'GraphQL'],
  'Backend':      ['Node.js', 'Express', 'Django', 'FastAPI', 'Spring Boot', 'Go', 'Rust', 'PHP', 'Ruby on Rails', 'NestJS'],
  'Databases':    ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Elasticsearch', 'Cassandra', 'Supabase', 'Firebase', 'DynamoDB'],
  'DevOps':       ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform', 'Linux', 'Nginx', 'GitHub Actions'],
  'Mobile':       ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Expo', 'Ionic', 'Android SDK', 'iOS SDK', 'Capacitor', 'Xamarin'],
  'Data / ML':    ['Python', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Spark', 'Jupyter', 'SQL', 'Power BI'],
  'Tools':        ['Git', 'VS Code', 'Jira', 'Figma', 'Postman', 'Webpack', 'Vite', 'Jest', 'Storybook', 'Linux CLI'],
}

const DOMAIN_COLORS = {
  'Web Frontend': '#818cf8',
  'Backend':      '#34d399',
  'DevOps':       '#f59e0b',
  'Databases':    '#22d3ee',
  'Mobile':       '#f472b6',
  'Data / ML':    '#a78bfa',
  'Tools':        '#94a3b8',
}

const ROLE_DOMAINS = {
  'Full Stack':    ['Web Frontend', 'Backend', 'Databases'],
  'Frontend':      ['Web Frontend', 'Tools'],
  'Backend':       ['Backend', 'Databases', 'Tools'],
  'DevOps':        ['DevOps', 'Tools'],
  'Data Engineer': ['Data / ML', 'Databases', 'Tools'],
  'Mobile':        ['Mobile', 'Tools'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeSkillName(s) {
  if (typeof s === 'string') return s.trim()
  return (s?.skill || s?.name || s?.label || '').trim()
}

function Spinner({ size = 32 }) {
  return <div style={{ width: size, height: size, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'dp-spin 0.8s linear infinite', margin: '0 auto' }} />
}

// ── Skill card ────────────────────────────────────────────────────────────────
function SkillCard({ skill, domain, known, onClick, selected }) {
  const color = DOMAIN_COLORS[domain] || '#818cf8'
  return (
    <div
      onClick={onClick}
      title={skill}
      style={{
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        transition: 'all 0.2s', animation: 'dp-fadein 0.3s ease-out',
        border: selected
          ? `1px solid ${color}`
          : known
            ? `1px solid ${color}55`
            : '1px solid rgba(255,255,255,0.07)',
        background: known ? `${color}10` : 'rgba(255,255,255,0.03)',
        boxShadow: selected ? `0 0 14px ${color}44` : known ? `0 0 10px ${color}22` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: 1.3, flex: 1, paddingRight: 4 }}>
          {skill}
        </p>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{known ? '✅' : <span style={{ opacity: 0.3 }}>🔒</span>}</span>
      </div>
      <span style={{
        marginTop: 8, display: 'inline-block',
        fontSize: 10, color, background: `${color}22`,
        border: `1px solid ${color}44`, borderRadius: 99, padding: '2px 8px', fontWeight: 600,
      }}>
        {domain.split(' ')[0]}
      </span>
    </div>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function SkillDrawer({ skill, domain, known, onToggle, onClose, saving }) {
  const color = DOMAIN_COLORS[domain] || '#818cf8'
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0',
      padding: '24px 28px', boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
      animation: 'dp-slideup 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{skill}</h3>
            <span style={{ fontSize: 11, color, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 99, padding: '2px 10px' }}>
              {domain}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, lineHeight: 1.6, maxWidth: 500 }}>
            {skill} is a key skill in the <strong style={{ color }}>{domain}</strong> domain, highly valued by tech employers.
            {known ? ' You have this marked as known.' : ' Mark it as known to track your expertise.'}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}
          aria-label="Close"
        >✕</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          onClick={onToggle}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            background: known ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.15)',
            border: `1px solid ${known ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
            color: known ? '#f87171' : '#818cf8', transition: 'all 0.15s',
          }}
        >
          {saving ? '…' : known ? '✋ Remove from My Skills' : '✋ Mark as Known'}
        </button>
        <a
          href={`/dashboard/learn?skill=${encodeURIComponent(skill)}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}
        >
          🎯 Learn this skill →
        </a>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SkillGenomePage() {
  const [profileSkills, setProfileSkills] = useState([])  // string[] from backend
  const [domain,        setDomain]        = useState('All Domains')
  const [selected,      setSelected]      = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [targetRole,    setTargetRole]    = useState('Full Stack')
  const [search,        setSearch]        = useState('')

  // Load candidate profile to get their skill list
  useEffect(() => {
    authFetch('/api/candidates/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j?.success && j.data?.skills) {
          const normalized = (j.data.skills || []).map(normalizeSkillName).filter(Boolean)
          setProfileSkills(normalized)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isKnown = useCallback((skill) =>
    profileSkills.some(s => s.toLowerCase() === skill.toLowerCase())
  , [profileSkills])

  // Toggle skill in backend profile
  const handleToggle = useCallback(async () => {
    if (!selected) return
    setSaving(true)
    try {
      let updatedSkills
      if (isKnown(selected.skill)) {
        updatedSkills = profileSkills.filter(s => s.toLowerCase() !== selected.skill.toLowerCase())
      } else {
        updatedSkills = [...profileSkills, selected.skill]
      }

      const res  = await authFetch('/api/candidates/me', {
        method: 'PUT',
        body: JSON.stringify({ skills: updatedSkills }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Update failed')

      setProfileSkills(updatedSkills)
      toast.success(isKnown(selected.skill)
        ? `Removed ${selected.skill} from your skills`
        : `✋ ${selected.skill} added to your skills!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }, [selected, profileSkills, isKnown])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const domains    = Object.keys(SKILL_CATALOG)
  const allSkills  = Object.entries(SKILL_CATALOG).flatMap(([d, sks]) => sks.map(s => ({ skill: s, domain: d })))

  const totalKnown = profileSkills.length
  const totalInCatalog = allSkills.filter(({ skill }) => isKnown(skill)).length

  const roleDomainList = ROLE_DOMAINS[targetRole] || []
  const roleSkills     = allSkills.filter(s => roleDomainList.includes(s.domain))
  const roleKnown      = roleSkills.filter(s => isKnown(s.skill)).length
  const coveragePct    = roleSkills.length > 0 ? Math.round((roleKnown / roleSkills.length) * 100) : 0

  // Filter for grid
  let gridSkills = domain === 'All Domains' ? allSkills : allSkills.filter(s => s.domain === domain)
  if (search.trim()) {
    const q = search.toLowerCase()
    gridSkills = gridSkills.filter(s => s.skill.toLowerCase().includes(q))
  }

  const selectedKnown = selected ? isKnown(selected.skill) : false

  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-fadein  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dp-slideup { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dp-spin    { to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>🧬 Skill Genome</h1>
        <p style={S.pageSub}>Map your technical skillset across {domains.length} domains</p>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>Known in Profile</span>
          <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 18 }}>{totalKnown}</span>
        </div>
        <div style={S.divider} />
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>In Catalog</span>
          <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>{totalInCatalog}</span>
        </div>
        <div style={S.divider} />
        <div style={S.statPill}>
          <span style={{ color: '#94a3b8' }}>Coverage for</span>
          <select
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            style={S.roleSelect}
          >
            {Object.keys(ROLE_DOMAINS).map(r => <option key={r}>{r}</option>)}
          </select>
          <span style={{
            color: coveragePct >= 70 ? '#22c55e' : coveragePct >= 40 ? '#f59e0b' : '#ef4444',
            fontWeight: 700, fontSize: 18,
          }}>{coveragePct}%</span>
        </div>

        {/* Coverage bar */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${coveragePct}%`, borderRadius: 99,
              background: coveragePct >= 70 ? '#22c55e' : coveragePct >= 40 ? '#f59e0b' : '#6366f1',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <p style={S.sidebarTitle}>Domain Filter</p>
          {['All Domains', ...domains].map(d => {
            const color  = DOMAIN_COLORS[d] || '#94a3b8'
            const active = domain === d
            const count  = d === 'All Domains'
              ? allSkills.filter(s => isKnown(s.skill)).length
              : (SKILL_CATALOG[d] || []).filter(sk => isKnown(sk)).length
            const total  = d === 'All Domains' ? allSkills.length : (SKILL_CATALOG[d] || []).length
            return (
              <button
                key={d}
                onClick={() => { setDomain(d); setSelected(null) }}
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
                <span style={{ flex: 1 }}>{d}</span>
                <span style={{ fontSize: 10, color: active ? color : '#475569', marginLeft: 4 }}>
                  {count}/{total}
                </span>
              </button>
            )
          })}
        </aside>

        {/* Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              style={S.searchInput}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spinner />
              <p style={{ color: '#64748b', marginTop: 14 }}>Loading your skill profile…</p>
            </div>
          ) : (
            <>
              {gridSkills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                  No skills match "{search}"
                </div>
              ) : (
                <div style={S.grid}>
                  {gridSkills.map(({ skill, domain: d }) => (
                    <SkillCard
                      key={`${d}-${skill}`}
                      skill={skill}
                      domain={d}
                      known={isKnown(skill)}
                      selected={selected?.skill === skill}
                      onClick={() => setSelected(selected?.skill === skill ? null : { skill, domain: d })}
                    />
                  ))}
                </div>
              )}

              {/* Legend */}
              <div style={S.legend}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>✅ <span>In your profile</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🔒 <span style={{ opacity: 0.5 }}>Not yet added</span></span>
                <span style={{ color: '#475569', fontSize: 11 }}>
                  Click any skill to toggle it
                </span>
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
          known={selectedKnown}
          saving={saving}
          onToggle={handleToggle}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { fontFamily: "'Inter',system-ui,sans-serif", color: '#f1f5f9', paddingBottom: 120 },
  pageHeader:{ marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' },
  pageSub:   { fontSize: 13, color: '#94a3b8', margin: '4px 0 0' },
  statsBar:  {
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '14px 20px', marginBottom: 24,
  },
  statPill:  { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  divider:   { width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 },
  roleSelect:{
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', fontSize: 12, padding: '2px 6px', cursor: 'pointer', outline: 'none',
  },
  body:      { display: 'flex', gap: 20, alignItems: 'flex-start' },
  sidebar:   {
    width: 185, flexShrink: 0,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, position: 'sticky', top: 20,
  },
  sidebarTitle: { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 },
  domainBtn: {
    display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
    padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s', marginBottom: 3,
  },
  searchInput: {
    width: '100%', padding: '10px 14px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#f1f5f9', fontSize: 13, outline: 'none',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 10, marginBottom: 16,
  },
  legend: {
    display: 'flex', gap: 20, fontSize: 12, color: '#64748b', marginTop: 8, flexWrap: 'wrap',
  },
}
