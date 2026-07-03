/**
 * pages/dashboard/UserProfilePage.jsx
 *
 * DevPulse AI — Full User Profile (3 tabs: Edit | Achievements | Account)
 * Connects to /api/v1/profile/ GET+PATCH and /api/v1/auth/me
 */

import { useState, useEffect } from 'react'
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

const LEVEL_COLORS = {
  Intern:'#94a3b8', Junior:'#22d3ee', Mid:'#34d399',
  Senior:'#a78bfa', Principal:'#f59e0b', Legend:'#f97316',
}

const TARGET_ROLES = [
  'Frontend Developer','Backend Developer','Full Stack Developer',
  'DevOps Engineer','Data Engineer','ML Engineer',
  'Mobile Developer','Product Manager','Security Engineer','QA Engineer',
]

// ── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', radius = 8, mb = 0 }) {
  return (
    <div style={{ height:h, width:w, borderRadius:radius, background:'rgba(255,255,255,0.06)', marginBottom:mb, animation:'dp-shimmer 1.5s linear infinite', backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 100%)', backgroundSize:'200% 100%' }}/>
  )
}

// ── XP progress bar ──────────────────────────────────────────────────────────
const XP_LEVELS = [0,500,1500,3500,7000,12000]
const XP_LABELS = ['Intern','Junior','Mid','Senior','Principal','Legend']
function XpBar({ xp, level }) {
  const idx    = XP_LABELS.indexOf(level)
  const next   = idx < XP_LABELS.length-1 ? XP_LEVELS[idx+1] : XP_LEVELS[idx]
  const cur    = XP_LEVELS[idx] || 0
  const pct    = idx >= XP_LABELS.length-1 ? 100 : Math.min(100, ((xp - cur) / (next - cur)) * 100)
  const lc     = LEVEL_COLORS[level] || '#818cf8'
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:11, color:lc, fontWeight:700 }}>{level}</span>
        {idx < XP_LABELS.length-1 && (
          <span style={{ fontSize:11, color:'#475569' }}>{(next-xp).toLocaleString()} XP to {XP_LABELS[idx+1]}</span>
        )}
      </div>
      <div style={{ height:6, borderRadius:99, background:'rgba(255,255,255,0.07)' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:`linear-gradient(90deg,${lc}88,${lc})`, transition:'width 0.8s ease', boxShadow:`0 0 8px ${lc}66` }}/>
      </div>
    </div>
  )
}

// ── Edit Profile Tab ─────────────────────────────────────────────────────────
function EditTab({ profile, onSaved }) {
  const [form,   setForm]   = useState({
    full_name:    profile?.full_name    || '',
    headline:     profile?.headline     || '',
    location:     profile?.location     || '',
    phone:        profile?.phone        || '',
    target_role:  profile?.devpulse_profile?.target_role  || '',
    github_url:   profile?.devpulse_profile?.github_url   || '',
    linkedin_url: profile?.devpulse_profile?.linkedin_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [dirty,  setDirty]  = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]:v })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await authFetch('/api/v1/profile/', { method:'PATCH', body:JSON.stringify(form) })
      const json = await res.json()
      if (json.success !== false) { toast.success('Profile saved ✓'); setDirty(false); onSaved?.(json.data) }
      else throw new Error(json.message)
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={S.grid2}>
        <Field label="Full Name" value={form.full_name}    onChange={v => set('full_name',v)}    placeholder="Your full name"/>
        <Field label="Location"  value={form.location}     onChange={v => set('location',v)}     placeholder="City, Country"/>
      </div>
      <Field label="Headline" value={form.headline} onChange={v => set('headline',v)} placeholder="e.g. Full Stack Dev · React · Python"/>
      <Field label="Phone"    value={form.phone}    onChange={v => set('phone',v)}    placeholder="+1 555 000 0000"/>
      <div>
        <label style={S.label}>Target Role</label>
        <select value={form.target_role} onChange={e => set('target_role',e.target.value)} style={S.select}>
          <option value="">— Select target role —</option>
          {TARGET_ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <Field label="GitHub URL"   value={form.github_url}   onChange={v => set('github_url',v)}   placeholder="https://github.com/…" type="url"/>
      <Field label="LinkedIn URL" value={form.linkedin_url} onChange={v => set('linkedin_url',v)} placeholder="https://linkedin.com/in/…" type="url"/>
      <button onClick={handleSave} disabled={!dirty||saving} style={{ ...S.saveBtn, opacity:(!dirty||saving)?0.5:1, cursor:(!dirty||saving)?'not-allowed':'pointer' }}>
        {saving ? 'Saving…' : 'Save Changes ✓'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type='text' }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={S.input}/>
    </div>
  )
}

// ── Achievements Tab ─────────────────────────────────────────────────────────
function AchievementsTab({ badges = [], certs = [] }) {
  const certUrl = (id) => `${window.location.origin}/cert/${id}`
  const liShare = (cert) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl(cert.unique_cert_id))}`
  return (
    <div>
      {/* Badges */}
      <p style={S.achieveSection}>🏅 Badges ({badges.length})</p>
      {badges.length === 0
        ? <p style={{ color:'#475569', fontSize:13, marginBottom:20 }}>No badges yet. Complete quizzes, win battles, and maintain streaks!</p>
        : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {badges.map((b, i) => (
              <div key={i} style={S.badgeChip}>
                <span style={{ fontSize:18 }}>{b.badge_icon}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', margin:0 }}>{b.badge_name}</p>
                  <p style={{ fontSize:10, color:'#475569', margin:0 }}>{b.earned_at ? new Date(b.earned_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Certificates */}
      <p style={S.achieveSection}>🎓 Certificates ({certs.length})</p>
      {certs.length === 0
        ? <p style={{ color:'#475569', fontSize:13 }}>No certificates yet. Take a quiz to earn one!</p>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {certs.map((c, i) => (
              <div key={i} style={S.certRow}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:0 }}>{c.skill_name}</p>
                  <p style={{ fontSize:11, color:'#475569', margin:'3px 0 0' }}>
                    ID: <code style={{ color:'#818cf8' }}>{c.unique_cert_id}</code>
                    {' · '}
                    {c.issued_at ? new Date(c.issued_at).toLocaleDateString() : ''}
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#22c55e', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:99, padding:'3px 10px' }}>{c.score}%</span>
                  <a href={certUrl(c.unique_cert_id)} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#818cf8', textDecoration:'none', whiteSpace:'nowrap' }}>View →</a>
                  <a href={liShare(c)} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#64748b', textDecoration:'none', whiteSpace:'nowrap' }}>Share 🔗</a>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ profile, onDeleteRequest }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const tier = profile?.tier || 'free'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={S.accountRow}>
        <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Email</p>
        <p style={{ fontSize:13, color:'#e2e8f0', margin:0, fontWeight:500 }}>{profile?.email}</p>
      </div>
      <div style={S.accountRow}>
        <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Plan</p>
        <span style={{ fontSize:12, color: tier==='pro'?'#f59e0b':'#818cf8', background: tier==='pro'?'rgba(245,158,11,0.1)':'rgba(99,102,241,0.1)', border:`1px solid ${tier==='pro'?'rgba(245,158,11,0.3)':'rgba(99,102,241,0.3)'}`, borderRadius:99, padding:'3px 12px', fontWeight:700 }}>
          {tier === 'pro' ? '⭐ Pro' : 'Free'}
        </span>
      </div>

      {tier === 'free' && (
        <div style={S.upgradeCard}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>Upgrade to Premium</p>
            <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Unlimited coaching, unlimited quizzes, PDF export, advanced market intel.</p>
          </div>
          <button style={S.upgradeBtn}>$12/mo →</button>
        </div>
      )}

      {/* Danger zone */}
      <div style={S.dangerZone}>
        <p style={{ fontSize:12, fontWeight:700, color:'#ef4444', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 10px' }}>Danger Zone</p>
        <p style={{ fontSize:13, color:'#64748b', margin:'0 0 12px' }}>Permanently deletes your account and all data. This cannot be undone.</p>
        <button onClick={() => setShowDeleteModal(true)} style={S.deleteBtn}>Delete Account</button>
      </div>

      {showDeleteModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <p style={{ fontSize:28, textAlign:'center', marginBottom:12 }}>⚠️</p>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', textAlign:'center', margin:'0 0 8px' }}>Delete Account?</h3>
            <p style={{ fontSize:13, color:'#94a3b8', textAlign:'center', margin:'0 0 20px' }}>This will permanently delete all your data, XP, certs, and projects. This cannot be undone.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ ...S.saveBtn, flex:1, background:'rgba(255,255,255,0.06)', boxShadow:'none' }}>Cancel</button>
              <button onClick={() => { setShowDeleteModal(false); toast.error('Contact support to delete your account.') }} style={{ ...S.deleteBtn, flex:1 }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('edit')

  useEffect(() => {
    authFetch('/api/v1/profile/')
      .then(r => r.json())
      .then(j => { if (j.success) setProfile(j.data) })
      .finally(() => setLoading(false))
  }, [])

  const dp    = profile?.devpulse_profile || {}
  const level = dp.level || 'Intern'
  const lc    = LEVEL_COLORS[level] || '#818cf8'
  const xp    = dp.total_xp || 0

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', maxWidth:800 }}>
      <style>{`
        @keyframes dp-spin{to{transform:rotate(360deg)}}
        @keyframes dp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>

      <h1 style={{ fontSize:24, fontWeight:800, margin:'0 0 24px', letterSpacing:'-0.4px' }}>👤 Profile</h1>

      {/* Left card + Right tabs layout */}
      <div style={S.layout}>
        {/* ── Left: avatar + stats ── */}
        <div style={S.leftCard}>
          {loading ? (
            <><Skeleton h={80} w={80} radius={40} mb={12}/><Skeleton h={18} mb={8}/><Skeleton h={12} w="60%" mb={16}/></>
          ) : (
            <>
              <div style={{ ...S.avatar, background:`linear-gradient(135deg,${lc}88,${lc})` }}>
                {(profile?.full_name || 'D')[0].toUpperCase()}
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:'12px 0 4px', textAlign:'center' }}>{profile?.full_name}</p>
              <p style={{ fontSize:12, color:'#64748b', textAlign:'center', margin:'0 0 6px' }}>{profile?.headline || 'Developer'}</p>
              <span style={{ fontSize:11, color:lc, background:`${lc}22`, border:`1px solid ${lc}44`, borderRadius:99, padding:'3px 12px', fontWeight:700 }}>{level}</span>

              {/* XP bar */}
              <div style={{ width:'100%', marginTop:16 }}>
                <XpBar xp={xp} level={level}/>
                <p style={{ fontSize:11, color:'#475569', textAlign:'center', marginTop:6 }}>{xp.toLocaleString()} XP total</p>
              </div>

              {/* Stats row */}
              <div style={S.statsRow}>
                {[
                  { val: profile?.certificates?.length || 0, label:'Certs' },
                  { val: dp.streak_days || 0, label:'Streak' },
                  { val: dp.career_health_score || 0, label:'Health' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center', flex:1 }}>
                    <p style={{ fontSize:18, fontWeight:800, color:'#818cf8', margin:0 }}>{s.val}</p>
                    <p style={{ fontSize:10, color:'#475569', margin:0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right: tabs ── */}
        <div style={{ flex:1 }}>
          {/* Tab bar */}
          <div style={S.tabBar}>
            {[
              { id:'edit',    label:'Edit Profile' },
              { id:'achieve', label:'Achievements' },
              { id:'account', label:'Account' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                ...S.tabBtn,
                color:        tab===t.id ? '#c7d2fe' : '#64748b',
                borderBottom: `2px solid ${tab===t.id ? '#6366f1' : 'transparent'}`,
                background:   tab===t.id ? 'rgba(99,102,241,0.08)' : 'transparent',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={S.tabContent}>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Skeleton h={14} w="40%" mb={4}/><Skeleton h={36} mb={12}/>
                <Skeleton h={14} w="40%" mb={4}/><Skeleton h={36} mb={12}/>
                <Skeleton h={14} w="40%" mb={4}/><Skeleton h={36}/>
              </div>
            ) : (
              <>
                {tab==='edit'    && <EditTab profile={profile} onSaved={p => setProfile(p)}/>}
                {tab==='achieve' && <AchievementsTab badges={profile?.badges} certs={profile?.certificates}/>}
                {tab==='account' && <AccountTab profile={profile}/>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  layout: { display:'flex', gap:20, alignItems:'flex-start' },
  leftCard:{
    width:220, flexShrink:0,
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:16, padding:'24px 16px',
    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
  },
  avatar:{
    width:72, height:72, borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:28, fontWeight:800, color:'#fff',
    boxShadow:'0 0 24px rgba(99,102,241,0.3)',
  },
  statsRow:{
    display:'flex', width:'100%', marginTop:16, gap:0,
    borderTop:'1px solid rgba(255,255,255,0.07)',
    paddingTop:14,
  },
  tabBar:{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:0 },
  tabBtn:{
    padding:'12px 18px', border:'none', borderBottom:'2px solid transparent',
    cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  tabContent:{
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
    borderTop:'none', borderRadius:'0 0 14px 14px', padding:'24px',
  },
  // Form
  grid2:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  label:{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 },
  input:{
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  select:{
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, color:'#e2e8f0', fontSize:13, outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif", cursor:'pointer',
  },
  saveBtn:{
    padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
    boxShadow:'0 4px 18px rgba(99,102,241,0.4)', fontFamily:"'Inter',system-ui,sans-serif", width:'100%',
  },
  // Achievements
  achieveSection:{ fontSize:13, fontWeight:700, color:'#94a3b8', margin:'0 0 12px' },
  badgeChip:{
    display:'flex', alignItems:'center', gap:10,
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:10, padding:'8px 12px',
  },
  certRow:{
    display:'flex', alignItems:'center', gap:12,
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:10, padding:'12px 14px',
  },
  // Account
  accountRow:{
    display:'flex', justifyContent:'space-between', alignItems:'center',
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:10, padding:'12px 16px',
  },
  upgradeCard:{
    display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
    background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)',
    borderRadius:12, padding:'16px',
  },
  upgradeBtn:{
    padding:'8px 16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
    whiteSpace:'nowrap', fontFamily:"'Inter',system-ui,sans-serif",
  },
  dangerZone:{
    background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)',
    borderRadius:10, padding:'16px',
  },
  deleteBtn:{
    padding:'10px 18px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
    borderRadius:8, color:'#f87171', fontSize:13, fontWeight:600, cursor:'pointer',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  // Modal
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal:{ background:'rgba(12,14,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'28px', maxWidth:400, width:'100%' },
}
