/**
 * pages/CertVerifyPage.jsx
 *
 * Public certificate verification page — /cert/:cert_id (no auth required)
 * Shows: DevPulse logo, ✅ Authentic badge, skill, holder, score, date, cert ID.
 * LinkedIn share button.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function CertVerifyPage() {
  const { cert_id } = useParams()
  const [cert,    setCert]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch(`/api/v1/certs/${cert_id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setCert(j.data)
        else setError(j.message || 'Certificate not found.')
      })
      .catch(() => setError('Unable to verify certificate. Please try again.'))
      .finally(() => setLoading(false))
  }, [cert_id])

  const pageUrl   = window.location.href
  const linkedIn  = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`
  const issueDate = cert
    ? new Date(cert.issued_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : ''

  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-spin { to { transform:rotate(360deg) } }
        @keyframes dp-fadein { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dp-glow-pulse { 0%,100%{box-shadow:0 0 30px rgba(99,102,241,0.3),0 24px 80px rgba(0,0,0,0.5)} 50%{box-shadow:0 0 60px rgba(99,102,241,0.6),0 24px 80px rgba(0,0,0,0.5)} }
        @keyframes dp-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        * { box-sizing:border-box }
      `}</style>

      {/* Brand header */}
      <header style={S.header}>
        <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
          <div style={S.brandIcon}>⚡</div>
          <span style={S.brandName}>DevPulse AI</span>
        </a>
      </header>

      <div style={S.container}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ width:36, height:36, border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'dp-spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
            <p style={{ color:'#64748b', fontSize:14 }}>Verifying certificate…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign:'center', padding:'80px 0', animation:'dp-fadein 0.4s ease-out' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>❌</div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#f87171', margin:'0 0 8px' }}>Invalid Certificate</h1>
            <p style={{ fontSize:14, color:'#64748b', margin:'0 0 20px' }}>{error}</p>
            <code style={{ fontSize:12, color:'#818cf8', background:'rgba(99,102,241,0.1)', borderRadius:8, padding:'6px 12px' }}>{cert_id}</code>
          </div>
        )}

        {/* Certificate */}
        {!loading && cert && (
          <div style={{ animation:'dp-fadein 0.5s ease-out' }}>
            {/* ✅ Authentic badge */}
            <div style={S.authenticBadge}>
              <span style={{ fontSize:20 }}>✅</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#4ade80' }}>Authentic Certificate</span>
              <span style={{ fontSize:11, color:'#64748b' }}>Verified by DevPulse AI</span>
            </div>

            {/* Certificate card */}
            <div style={S.certCard}>
              {/* Rainbow top bar */}
              <div style={S.certTopBar}/>

              {/* Watermark grid pattern */}
              <div style={S.certWatermark} aria-hidden>
                {'⚡ '.repeat(60)}
              </div>

              {/* Content */}
              <div style={{ position:'relative', zIndex:1 }}>
                <p style={S.certFrom}>This is to certify that</p>

                <h1 style={S.certName}>{cert.holder_name || cert.seeker_name || 'Developer'}</h1>

                <p style={S.certHas}>has successfully demonstrated proficiency in</p>

                <div style={S.skillPill}>
                  <h2 style={S.certSkill}>{cert.skill_name}</h2>
                </div>

                {/* Score */}
                <div style={S.scoreSection}>
                  <div style={S.scoreBig}>
                    <span style={S.scoreVal}>{cert.score}</span>
                    <span style={{ fontSize:14, color:'#64748b' }}>/100</span>
                  </div>
                  <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Assessment Score</p>
                  <div style={S.scoreBar}>
                    <div style={{ ...S.scoreBarFill, width:`${cert.score}%` }}/>
                  </div>
                </div>

                {/* Date */}
                <p style={S.certDate}>Issued on {issueDate}</p>

                {/* Cert ID */}
                <div style={S.certIdBox}>
                  <p style={{ fontSize:10, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 4px' }}>Certificate ID</p>
                  <code style={{ fontSize:13, color:'#818cf8', fontWeight:700, letterSpacing:'0.5px' }}>{cert.unique_cert_id}</code>
                </div>
              </div>
            </div>

            {/* Share row */}
            <div style={S.shareRow}>
              <a
                href={linkedIn}
                target="_blank"
                rel="noreferrer"
                style={S.linkedInBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Share on LinkedIn
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(pageUrl)
                  // toast would need import — just use alert-free approach
                }}
                style={S.copyBtn}
              >
                📋 Copy Link
              </button>
            </div>

            {/* Footer note */}
            <p style={{ textAlign:'center', fontSize:12, color:'#334155', marginTop:16 }}>
              This certificate is permanently verifiable at <code style={{ color:'#818cf8' }}>{pageUrl}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:{
    minHeight:'100vh',
    background:'linear-gradient(135deg,#080b14 0%,#0f1729 60%,#080b14 100%)',
    fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', padding:'20px',
  },
  header:{
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:'8px 0 40px',
  },
  brandIcon:{
    width:36, height:36, borderRadius:10,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:18, boxShadow:'0 0 16px rgba(99,102,241,0.5)',
  },
  brandName:{ fontSize:18, fontWeight:800, color:'#f1f5f9' },
  container:{ maxWidth:540, margin:'0 auto' },
  authenticBadge:{
    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
    background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
    borderRadius:12, padding:'14px 20px', marginBottom:20,
    flexWrap:'wrap',
  },
  certCard:{
    background:'rgba(10,14,26,0.97)', border:'1px solid rgba(255,255,255,0.12)',
    borderRadius:20, padding:'40px 32px', textAlign:'center',
    position:'relative', overflow:'hidden',
    animation:'dp-glow-pulse 3s ease-in-out infinite',
  },
  certTopBar:{
    position:'absolute', top:0, left:0, right:0, height:5,
    background:'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f59e0b)',
    borderRadius:'20px 20px 0 0',
  },
  certWatermark:{
    position:'absolute', inset:0, fontSize:11, color:'rgba(99,102,241,0.04)',
    lineHeight:2.2, wordBreak:'break-all', pointerEvents:'none', userSelect:'none',
    overflow:'hidden',
  },
  certFrom:{ fontSize:14, color:'#475569', margin:'0 0 10px' },
  certName:{ fontSize:30, fontWeight:900, color:'#f1f5f9', margin:'0 0 10px', letterSpacing:'-0.5px' },
  certHas: { fontSize:13, color:'#475569', margin:'0 0 16px' },
  skillPill:{
    display:'inline-block',
    background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.35)',
    borderRadius:12, padding:'10px 24px', marginBottom:24,
  },
  certSkill:{ fontSize:22, fontWeight:800, color:'#a5b4fc', margin:0 },
  scoreSection:{ marginBottom:24 },
  scoreBig:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, marginBottom:6 },
  scoreVal:{ fontSize:40, fontWeight:900, color:'#22c55e' },
  scoreBar:{
    height:6, borderRadius:99, background:'rgba(255,255,255,0.07)',
    margin:'8px auto 0', maxWidth:200, overflow:'hidden',
  },
  scoreBarFill:{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#22c55e88,#22c55e)', transition:'width 1s ease' },
  certDate:{ fontSize:13, color:'#475569', margin:'0 0 20px' },
  certIdBox:{
    background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
    borderRadius:10, padding:'12px 16px', display:'inline-block',
  },
  shareRow:{
    display:'flex', gap:10, marginTop:20, justifyContent:'center',
  },
  linkedInBtn:{
    display:'flex', alignItems:'center', gap:8,
    background:'#0077b5', border:'none', borderRadius:10,
    color:'#fff', fontSize:13, fontWeight:600, padding:'10px 18px',
    cursor:'pointer', textDecoration:'none', fontFamily:"'Inter',system-ui,sans-serif",
    boxShadow:'0 4px 14px rgba(0,119,181,0.4)',
  },
  copyBtn:{
    display:'flex', alignItems:'center', gap:6,
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:10, color:'#94a3b8', fontSize:13, fontWeight:500, padding:'10px 16px',
    cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif",
  },
}
