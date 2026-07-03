/**
 * pages/dashboard/MyApplicationsPage.jsx
 *
 * DevPulse AI — Job Applications Tracker 📋
 * Basic list of the user's job_applications from the Django backend.
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

const STATUS_CONFIG = {
  applied:     { label:'Applied',     color:'#818cf8', bg:'rgba(129,140,248,0.12)' },
  shortlisted: { label:'Shortlisted', color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
  rejected:    { label:'Rejected',    color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  hired:       { label:'Hired 🎉',    color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
}

export default function MyApplicationsPage() {
  const [apps,    setApps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    // Note: This endpoint will be built in Part 8 or can be added to urls.py
    // For now we attempt and gracefully handle if missing
    authFetch('/api/v1/applications/')
      .then(r => r.json())
      .then(j => { if (j.success) setApps(j.data) })
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  const counts = ['applied','shortlisted','rejected','hired'].reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s).length
    return acc
  }, {})

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9' }}>
      <style>{`@keyframes dp-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes dp-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, margin:0 }}>📋 Applications</h1>
        <p style={{ fontSize:13, color:'#64748b', margin:'4px 0 0' }}>Track your job applications and interview pipeline.</p>
      </div>

      {/* Status summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { key:'applied',     emoji:'📤', label:'Applied' },
          { key:'shortlisted', emoji:'⭐', label:'Shortlisted' },
          { key:'rejected',    emoji:'❌', label:'Rejected' },
          { key:'hired',       emoji:'🎉', label:'Hired' },
        ].map(({ key, emoji, label }) => {
          const cfg = STATUS_CONFIG[key]
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              style={{
                background: filter === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                border:`1px solid ${filter === key ? cfg.color + '55' : 'rgba(255,255,255,0.07)'}`,
                borderRadius:12, padding:'14px', textAlign:'left', cursor:'pointer',
              }}
            >
              <p style={{ fontSize:20, margin:'0 0 6px' }}>{emoji}</p>
              <p style={{ fontSize:22, fontWeight:800, color:cfg.color, margin:0 }}>{counts[key] || 0}</p>
              <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{label}</p>
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,0.08)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'dp-spin 0.8s linear infinite', margin:'0 auto' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <p style={{ fontSize:36 }}>📋</p>
          <p style={{ fontSize:15, fontWeight:600, color:'#e2e8f0', margin:'8px 0 4px' }}>
            {filter === 'all' ? 'No applications tracked yet' : `No ${filter} applications`}
          </p>
          <p style={{ fontSize:13, color:'#475569' }}>Start applying and track your progress here.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, animation:'dp-fadein 0.3s ease-out' }}>
          {filtered.map(app => {
            const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied
            return (
              <div key={app.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:0 }}>{app.job_title}</p>
                  <p style={{ fontSize:13, color:'#64748b', margin:'3px 0 0' }}>{app.company_name}</p>
                  {app.job_url && (
                    <a href={app.job_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#818cf8', textDecoration:'none', display:'block', marginTop:4 }}>
                      View job →
                    </a>
                  )}
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:11, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}44`, borderRadius:99, padding:'4px 12px', fontWeight:700 }}>
                    {cfg.label}
                  </span>
                  <p style={{ fontSize:10, color:'#334155', margin:'6px 0 0' }}>
                    {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
