/**
 * pages/dashboard/MyApplicationsPage.jsx
 *
 * DevPulse AI — Job Applications Tracker
 * Wired to: GET /api/candidates/me/applications
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

function authFetch(url, opts = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

const STATUS_CONFIG = {
  PENDING:     { label: 'Applied',     color: '#818cf8', bg: 'rgba(129,140,248,0.12)', emoji: '📤' },
  REVIEWING:   { label: 'Reviewing',   color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  emoji: '👀' },
  SHORTLISTED: { label: 'Shortlisted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   emoji: '⭐' },
  REJECTED:    { label: 'Rejected',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '❌' },
  HIRED:       { label: 'Hired 🎉',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🎉' },
  // legacy lowercase
  applied:     { label: 'Applied',     color: '#818cf8', bg: 'rgba(129,140,248,0.12)', emoji: '📤' },
  reviewing:   { label: 'Reviewing',   color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  emoji: '👀' },
  shortlisted: { label: 'Shortlisted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   emoji: '⭐' },
  rejected:    { label: 'Rejected',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '❌' },
  hired:       { label: 'Hired 🎉',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🎉' },
}

const FILTER_TABS = [
  { key: 'all',         label: 'All',         emoji: '📋' },
  { key: 'PENDING',     label: 'Applied',     emoji: '📤' },
  { key: 'SHORTLISTED', label: 'Shortlisted', emoji: '⭐' },
  { key: 'REVIEWING',   label: 'Reviewing',   emoji: '👀' },
  { key: 'REJECTED',    label: 'Rejected',    emoji: '❌' },
  { key: 'HIRED',       label: 'Hired',       emoji: '🎉' },
]

function Spinner() {
  return <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'dp-spin 0.8s linear infinite', margin: '0 auto' }} />
}

export default function MyApplicationsPage() {
  const [apps,    setApps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [error,   setError]   = useState(null)
  const LIMIT = 10

  const fetchApps = useCallback(async (pg = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT })
      const res  = await authFetch(`/api/candidates/me/applications?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to load applications')
      // Backend returns { success, data: [...], pagination: { total } }
      const list = Array.isArray(json.data) ? json.data : []
      setApps(list)
      setTotal(json.pagination?.total ?? list.length)
    } catch (err) {
      setError(err.message)
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApps(page) }, [fetchApps, page])

  // Normalize status key for lookup
  const normStatus = (s) => {
    if (!s) return 'applied'
    const upper = s.toUpperCase()
    if (STATUS_CONFIG[upper]) return upper
    return s.toLowerCase()
  }

  const filtered = filter === 'all'
    ? apps
    : apps.filter(a => normStatus(a.status) === filter || normStatus(a.status) === filter.toLowerCase())

  const counts = Object.keys(STATUS_CONFIG)
    .filter(k => k === k.toUpperCase())
    .reduce((acc, s) => {
      acc[s] = apps.filter(a => normStatus(a.status) === s || normStatus(a.status) === s.toLowerCase()).length
      return acc
    }, {})

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#f1f5f9' }}>
      <style>{`
        @keyframes dp-fadein { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dp-spin   { to { transform:rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>📋 Applications</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Track your job applications and interview pipeline.</p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'PENDING',     emoji: '📤', label: 'Applied' },
          { key: 'SHORTLISTED', emoji: '⭐', label: 'Shortlisted' },
          { key: 'REVIEWING',   emoji: '👀', label: 'Reviewing' },
          { key: 'REJECTED',    emoji: '❌', label: 'Rejected' },
          { key: 'HIRED',       emoji: '🎉', label: 'Hired' },
        ].map(({ key, emoji, label }) => {
          const cfg = STATUS_CONFIG[key]
          const active = filter === key
          return (
            <button
              key={key}
              onClick={() => setFilter(active ? 'all' : key)}
              style={{
                background: active ? cfg.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? cfg.color + '55' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 12, padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <p style={{ fontSize: 20, margin: '0 0 6px' }}>{emoji}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: cfg.color, margin: 0 }}>{counts[key] || 0}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{label}</p>
            </button>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
              background: filter === t.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === t.key ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: filter === t.key ? '#818cf8' : '#94a3b8', cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
        <button
          onClick={() => fetchApps(page)}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 99, fontSize: 12,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
          ⚠️ {error}
          <button onClick={() => fetchApps(page)} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13 }}>Retry</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spinner />
          <p style={{ color: '#64748b', marginTop: 14, fontSize: 13 }}>Loading applications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', animation: 'dp-fadein 0.4s ease-out' }}>
          <p style={{ fontSize: 48 }}>📋</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: '12px 0 6px' }}>
            {filter === 'all' ? 'No applications tracked yet' : `No ${filter.toLowerCase()} applications`}
          </p>
          <p style={{ fontSize: 13, color: '#475569' }}>
            {filter === 'all' ? 'Start applying to jobs and track your progress here.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'dp-fadein 0.3s ease-out' }}>
          {filtered.map(app => {
            const ns  = normStatus(app.status)
            const cfg = STATUS_CONFIG[ns] || STATUS_CONFIG.applied
            const date = app.appliedAt || app.applied_at || app.createdAt || app.created_at
            return (
              <div
                key={app.id}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Company initial */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: cfg.bg, border: `1px solid ${cfg.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: cfg.color,
                }}>
                  {(app.companyName || app.company_name || app.jobListing?.employerProfile?.companyName || '?')[0]?.toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.jobTitle || app.job_title || app.jobListing?.title || 'Position'}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
                    {app.companyName || app.company_name || app.jobListing?.employerProfile?.companyName || ''}
                  </p>
                  {(app.jobUrl || app.job_url || app.jobListing?.applicationUrl) && (
                    <a
                      href={app.jobUrl || app.job_url || app.jobListing?.applicationUrl}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none', display: 'block', marginTop: 4 }}
                    >
                      View job →
                    </a>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, color: cfg.color, background: cfg.bg,
                    border: `1px solid ${cfg.color}44`, borderRadius: 99,
                    padding: '4px 12px', fontWeight: 700,
                  }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  {date && (
                    <p style={{ fontSize: 10, color: '#334155', margin: '6px 0 0' }}>
                      {new Date(date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ padding: '8px 16px', color: '#64748b', fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
