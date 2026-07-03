/**
 * pages/dashboard/MyResumePage.jsx
 *
 * DevPulse AI — Resume Forge
 * 6-step wizard: Upload → Enhance → ATS Score → Template → Download → Drafts
 * Dark glassmorphism, vanilla CSS-in-JS only.
 */

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

const API = '/api/v1/resume'

// ── API helper ──────────────────────────────────────────────────────────────
function authFetch(url, options = {}) {
  const token = useAuthStore.getState().token
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

// ── Step labels ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, icon: '📄', label: 'Upload' },
  { id: 2, icon: '✨', label: 'Enhance' },
  { id: 3, icon: '🎯', label: 'ATS Score' },
  { id: 4, icon: '🎨', label: 'Template' },
  { id: 5, icon: '⬇️', label: 'Download' },
  { id: 6, icon: '📁', label: 'Drafts' },
]

// ── Template options ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Indigo sidebar + clean layout',
    preview: ['#6366f1', '#4f46e5', '#e0e7ff'],
  },
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional single-column',
    preview: ['#1e293b', '#334155', '#f1f5f9'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Ultra-clean, no colour',
    preview: ['#374151', '#6b7280', '#f9fafb'],
  },
]

// ── Score ring component ─────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, Math.min(100, score))
  const dash  = (pct / 100) * circ
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Category bar ─────────────────────────────────────────────────────────────
function CategoryBar({ label, value }) {
  const color = value >= 75 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#cbd5e1' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          borderRadius: 99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 1s ease',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', mb = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 8, marginBottom: mb,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
      backgroundSize: '200% 100%',
      animation: 'dp-shimmer 1.5s linear infinite',
    }} />
  )
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, color = '#6366f1' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 500,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      margin: '2px 3px',
    }}>{label}</span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyResumePage() {
  const [step,         setStep]         = useState(1)
  const [dragging,     setDragging]     = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [parsed,       setParsed]       = useState(null)
  const [jobDesc,      setJobDesc]      = useState('')
  const [enhancing,    setEnhancing]    = useState(false)
  const [enhanced,     setEnhanced]     = useState(null)
  const [atsChecking,  setAtsChecking]  = useState(false)
  const [atsReport,    setAtsReport]    = useState(null)
  const [template,     setTemplate]     = useState('modern')
  const [downloading,  setDownloading]  = useState(false)
  const [drafts,       setDrafts]       = useState([])
  const [draftsLoaded, setDraftsLoaded] = useState(false)

  const fileInputRef = useRef(null)

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      toast.error('Only PDF and DOCX files are supported.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('resume', file)
      const res = await authFetch(`${API}/upload`, { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Upload failed')
      setParsed(json.data)
      toast.success('Resume parsed successfully! ✨')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  // ── Enhance ─────────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!jobDesc.trim()) { toast.error('Paste a job description first.'); return }
    setEnhancing(true)
    try {
      const res = await authFetch(`${API}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDesc }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Enhancement failed')
      setEnhanced(json.data)
      toast.success('Resume enhanced with AI! 🚀')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnhancing(false)
    }
  }

  // ── ATS Check ───────────────────────────────────────────────────────────
  const handleAts = async () => {
    if (!jobDesc.trim()) { toast.error('Job description is needed for ATS check.'); return }
    setAtsChecking(true)
    try {
      const res = await authFetch(`${API}/check-ats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDesc }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'ATS check failed')
      setAtsReport(json.data)
      toast.success(`ATS Score: ${json.data.total_score}/100`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAtsChecking(false)
    }
  }

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = async (useEnhanced = false) => {
    setDownloading(true)
    try {
      const res = await authFetch(`${API}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, use_enhanced: useEnhanced }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || 'Download failed')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `resume_devpulse.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloading(false)
    }
  }

  // ── Copy plain text ──────────────────────────────────────────────────────
  const handleCopyText = () => {
    if (!parsed) return
    const text = [
      parsed.name, parsed.email, parsed.phone, '',
      parsed.summary, '',
      'SKILLS', (parsed.skills || []).join(', '), '',
      'EXPERIENCE',
      ...(parsed.experience || []).flatMap(e => [
        `${e.role} @ ${e.company} (${e.duration})`,
        ...(e.bullets || []).map(b => `• ${b}`),
        '',
      ]),
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  // ── Load drafts ──────────────────────────────────────────────────────────
  const loadDrafts = async () => {
    if (draftsLoaded) return
    try {
      const res  = await authFetch(`${API}/drafts`)
      const json = await res.json()
      if (json.success) setDrafts(json.data)
    } catch {}
    setDraftsLoaded(true)
  }

  const handleSetActive = async (draftId) => {
    await authFetch(`${API}/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })
    setDrafts(ds => ds.map(d => ({ ...d, is_active: d.id === draftId })))
    toast.success('Draft set as active!')
  }

  const handleNewDraft = async () => {
    if (!parsed) { toast.error('Upload a resume first.'); return }
    const res  = await authFetch(`${API}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Draft ${new Date().toLocaleDateString()}`, template_id: template }),
    })
    const json = await res.json()
    if (json.success) {
      setDrafts(ds => [json.data, ...ds])
      toast.success('New draft created!')
    }
  }

  // ── Navigate steps ───────────────────────────────────────────────────────
  const goTo = (s) => {
    if (s === 6 && !draftsLoaded) loadDrafts()
    setStep(s)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes dp-spin { to { transform: rotate(360deg); } }
        @keyframes dp-fadein {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>
            <span style={{ color: '#818cf8' }}>⚡</span> Resume Forge
          </h1>
          <p style={S.pageSubtitle}>AI-powered resume wizard — parse, enhance, score, download</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={S.stepper}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={S.stepperItem} onClick={() => goTo(s.id)}>
            <div style={{
              ...S.stepCircle,
              background: step === s.id
                ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                : step > s.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
              border: step === s.id ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.1)',
              boxShadow: step === s.id ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
            </div>
            <span style={{
              ...S.stepLabel,
              color: step === s.id ? '#c7d2fe' : '#64748b',
              fontWeight: step === s.id ? 600 : 400,
            }}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div style={{
                ...S.stepConnector,
                background: step > s.id ? '#6366f1' : 'rgba(255,255,255,0.08)',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={S.card}>

        {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={S.stepContent}>
            <h2 style={S.stepTitle}>Upload Your Resume</h2>
            <p style={S.stepDesc}>PDF or DOCX — we'll parse it with AI instantly.</p>

            {/* Drop zone */}
            <div
              style={{
                ...S.dropZone,
                borderColor: dragging ? '#6366f1' : 'rgba(255,255,255,0.12)',
                background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {uploading ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={S.spinner} />
                  <p style={{ color: '#94a3b8', marginTop: 12 }}>Parsing with AI…</p>
                </div>
              ) : (
                <>
                  <div style={S.uploadIcon}>☁️</div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>
                    Drag & drop your resume
                  </p>
                  <p style={{ color: '#64748b', fontSize: 13 }}>or click to browse</p>
                  <p style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>PDF, DOCX · Max 10MB</p>
                </>
              )}
            </div>

            {/* Parsed preview */}
            {parsed && (
              <div style={S.parsedCard}>
                <div style={S.parsedRow}>
                  <div>
                    <p style={S.parsedName}>{parsed.name}</p>
                    <p style={S.parsedMeta}>{parsed.email}  ·  {parsed.phone}</p>
                  </div>
                  <div style={S.successBadge}>✓ Parsed</div>
                </div>

                {parsed.skills?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={S.parsedLabel}>Skills ({parsed.skills.length})</p>
                    <div style={{ marginTop: 4 }}>
                      {parsed.skills.slice(0, 12).map((sk, i) => (
                        <Chip key={i} label={typeof sk === 'string' ? sk : sk.skill || sk.name} />
                      ))}
                      {parsed.skills.length > 12 && <Chip label={`+${parsed.skills.length - 12} more`} color="#64748b" />}
                    </div>
                  </div>
                )}

                {parsed.experience?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={S.parsedLabel}>Experience</p>
                    {parsed.experience.slice(0, 3).map((e, i) => (
                      <div key={i} style={S.expRow}>
                        <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{e.role}</span>
                        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>@ {e.company} · {e.duration}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button style={S.nextBtn} onClick={() => goTo(2)}>
                  Continue to Enhancement →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Enhance ────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={S.stepContent}>
            <h2 style={S.stepTitle}>AI Enhancement</h2>
            <p style={S.stepDesc}>Paste the target job description to rewrite your bullets in STAR format.</p>

            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here…"
              style={S.textarea}
              rows={7}
            />

            <button
              style={{ ...S.gradientBtn, opacity: enhancing ? 0.7 : 1 }}
              onClick={handleEnhance}
              disabled={enhancing}
            >
              {enhancing ? <><span style={S.spinnerInline} /> Enhancing…</> : '✨ Enhance with AI'}
            </button>

            {enhancing && (
              <div style={{ marginTop: 20 }}>
                <Skeleton h={14} mb={10} />
                <Skeleton h={14} w="80%" mb={10} />
                <Skeleton h={14} w="90%" mb={10} />
              </div>
            )}

            {enhanced && !enhancing && (
              <>
                {/* Keyword coverage */}
                <div style={S.sectionBlock}>
                  <p style={S.blockTitle}>Keyword Coverage</p>
                  <div>
                    <p style={{ fontSize: 12, color: '#4ade80', marginBottom: 4 }}>✓ Matched</p>
                    {enhanced.keyword_coverage?.matched?.map((kw, i) => (
                      <Chip key={i} label={kw} color="#22c55e" />
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 12, color: '#f87171', marginBottom: 4 }}>✗ Missing</p>
                    {enhanced.keyword_coverage?.missing?.map((kw, i) => (
                      <Chip key={i} label={kw} color="#ef4444" />
                    ))}
                  </div>
                </div>

                {/* Summary comparison */}
                {enhanced.enhanced_summary && (
                  <div style={S.sectionBlock}>
                    <p style={S.blockTitle}>Enhanced Summary</p>
                    <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
                      {enhanced.enhanced_summary}
                    </p>
                  </div>
                )}

                {/* Bullet comparisons */}
                {enhanced.enhanced_experience?.map((exp, i) => (
                  <div key={i} style={S.sectionBlock}>
                    <p style={S.blockTitle}>{exp.role} @ {exp.company}</p>
                    <div style={S.bulletGrid}>
                      <div>
                        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>ORIGINAL</p>
                        {(exp.original_bullets || []).map((b, j) => (
                          <p key={j} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>• {b}</p>
                        ))}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#818cf8', marginBottom: 6 }}>ENHANCED ✨</p>
                        {(exp.enhanced_bullets || []).map((b, j) => (
                          <p key={j} style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 6, lineHeight: 1.5 }}>• {b}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <button style={S.nextBtn} onClick={() => goTo(3)}>
                  Check ATS Score →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: ATS Score ──────────────────────────────────────────── */}
        {step === 3 && (
          <div style={S.stepContent}>
            <h2 style={S.stepTitle}>ATS Compatibility Score</h2>
            <p style={S.stepDesc}>See how well your resume performs with applicant tracking systems.</p>

            {!atsReport && (
              <button
                style={{ ...S.gradientBtn, opacity: atsChecking ? 0.7 : 1 }}
                onClick={handleAts}
                disabled={atsChecking}
              >
                {atsChecking ? <><span style={S.spinnerInline} /> Analysing…</> : '🎯 Check ATS Score'}
              </button>
            )}

            {atsChecking && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <div style={S.spinner} />
                <p style={{ color: '#94a3b8', marginTop: 12 }}>Analysing resume against job description…</p>
              </div>
            )}

            {atsReport && !atsChecking && (
              <>
                <ScoreRing score={atsReport.total_score} />

                <div style={{ marginTop: 28 }}>
                  <p style={S.blockTitle}>Breakdown</p>
                  {[
                    ['Keyword Match',    atsReport.breakdown?.keyword_match],
                    ['Formatting',       atsReport.breakdown?.formatting],
                    ['Experience Fit',   atsReport.breakdown?.experience],
                    ['Skills Coverage',  atsReport.breakdown?.skills_coverage],
                    ['Education',        atsReport.breakdown?.education],
                  ].map(([label, val]) => (
                    <CategoryBar key={label} label={label} value={val ?? 0} />
                  ))}
                </div>

                {atsReport.issues?.length > 0 && (
                  <div style={{ ...S.sectionBlock, marginTop: 20 }}>
                    <p style={S.blockTitle}>⚠️ Issues</p>
                    {atsReport.issues.map((iss, i) => (
                      <p key={i} style={{ fontSize: 13, color: '#fbbf24', marginBottom: 6 }}>⚠ {iss}</p>
                    ))}
                  </div>
                )}

                {atsReport.recommendations?.length > 0 && (
                  <div style={{ ...S.sectionBlock, marginTop: 12 }}>
                    <p style={S.blockTitle}>✅ Recommendations</p>
                    {atsReport.recommendations.map((rec, i) => (
                      <p key={i} style={{ fontSize: 13, color: '#86efac', marginBottom: 6 }}>✓ {rec}</p>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.secondaryBtn, flex: 1 }} onClick={() => setAtsReport(null)}>
                    Re-check
                  </button>
                  <button style={{ ...S.nextBtn, flex: 2 }} onClick={() => goTo(4)}>
                    Pick Template →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 4: Template ───────────────────────────────────────────── */}
        {step === 4 && (
          <div style={S.stepContent}>
            <h2 style={S.stepTitle}>Choose Template</h2>
            <p style={S.stepDesc}>Pick a style for your PDF download.</p>

            <div style={S.templateGrid}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  style={{
                    ...S.templateCard,
                    border: template === t.id
                      ? '2px solid #818cf8'
                      : '2px solid rgba(255,255,255,0.08)',
                    boxShadow: template === t.id
                      ? '0 0 20px rgba(129,140,248,0.3)'
                      : 'none',
                  }}
                  onClick={() => setTemplate(t.id)}
                >
                  {/* Mini preview */}
                  <div style={{ ...S.templatePreview, background: t.preview[0] }}>
                    <div style={{ width: '35%', height: '100%', background: t.preview[1], borderRadius: '6px 0 0 6px' }} />
                    <div style={{ flex: 1, padding: '6px 8px' }}>
                      <div style={{ height: 6, borderRadius: 3, background: t.preview[2], opacity: 0.8, marginBottom: 4 }} />
                      <div style={{ height: 4, borderRadius: 3, background: t.preview[2], opacity: 0.5, marginBottom: 4 }} />
                      <div style={{ height: 4, borderRadius: 3, background: t.preview[2], opacity: 0.4, width: '70%' }} />
                    </div>
                  </div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.name}</p>
                  <p style={{ color: '#64748b', fontSize: 12 }}>{t.desc}</p>
                  {template === t.id && (
                    <div style={{ marginTop: 8, color: '#818cf8', fontSize: 12, fontWeight: 600 }}>✓ Selected</div>
                  )}
                </div>
              ))}
            </div>

            <button style={S.nextBtn} onClick={() => goTo(5)}>
              Go to Download →
            </button>
          </div>
        )}

        {/* ── STEP 5: Download ───────────────────────────────────────────── */}
        {step === 5 && (
          <div style={S.stepContent}>
            <h2 style={S.stepTitle}>Download Your Resume</h2>
            <p style={S.stepDesc}>Template: <strong style={{ color: '#818cf8' }}>{template.charAt(0).toUpperCase() + template.slice(1)}</strong></p>

            <div style={S.downloadGrid}>
              <div style={S.downloadCard}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Original PDF</p>
                <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Your parsed resume as-is</p>
                <button
                  style={{ ...S.gradientBtn, opacity: downloading ? 0.7 : 1, width: '100%' }}
                  onClick={() => handleDownload(false)}
                  disabled={downloading}
                >
                  {downloading ? <><span style={S.spinnerInline} /> Generating…</> : '⬇ Download PDF'}
                </button>
              </div>

              {enhanced && (
                <div style={S.downloadCard}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Enhanced PDF</p>
                  <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>With AI-improved bullets</p>
                  <button
                    style={{ ...S.gradientBtn, opacity: downloading ? 0.7 : 1, width: '100%' }}
                    onClick={() => handleDownload(true)}
                    disabled={downloading}
                  >
                    {downloading ? <><span style={S.spinnerInline} /> Generating…</> : '⬇ Enhanced PDF'}
                  </button>
                </div>
              )}

              <div style={S.downloadCard}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Plain Text</p>
                <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Copy to clipboard</p>
                <button
                  style={{ ...S.secondaryBtn, width: '100%' }}
                  onClick={handleCopyText}
                  disabled={!parsed}
                >
                  📋 Copy Plain Text
                </button>
              </div>
            </div>

            <button style={{ ...S.nextBtn, marginTop: 24 }} onClick={() => goTo(6)}>
              Manage Drafts →
            </button>
          </div>
        )}

        {/* ── STEP 6: Drafts ─────────────────────────────────────────────── */}
        {step === 6 && (
          <div style={S.stepContent}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ ...S.stepTitle, marginBottom: 4 }}>Saved Drafts</h2>
                <p style={S.stepDesc}>Manage your resume versions.</p>
              </div>
              <button style={S.gradientBtn} onClick={handleNewDraft}>+ New Draft</button>
            </div>

            {drafts.length === 0 ? (
              <div style={S.emptyState}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📁</p>
                <p style={{ color: '#64748b' }}>No drafts yet. Create one after uploading your resume.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {drafts.map(d => (
                  <div key={d.id} style={S.draftCard}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ color: '#e2e8f0', fontWeight: 600 }}>{d.title}</p>
                        {d.is_active && (
                          <span style={{ fontSize: 10, color: '#818cf8', background: 'rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(129,140,248,0.3)' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b' }}>
                        Template: {d.template_id}
                        {d.ats_score != null && <> · ATS: <span style={{ color: '#f59e0b' }}>{d.ats_score}</span></>}
                        {' · '}{new Date(d.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!d.is_active && (
                      <button
                        style={S.secondaryBtn}
                        onClick={() => handleSetActive(d.id)}
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#f1f5f9',
    minHeight: '100vh',
    padding: '0 0 40px',
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 28,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  stepperItem: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s',
  },
  stepLabel: {
    fontSize: 11,
    marginLeft: 6,
    marginRight: 6,
    whiteSpace: 'nowrap',
  },
  stepConnector: {
    height: 2,
    width: 32,
    borderRadius: 1,
    transition: 'background 0.3s',
    flexShrink: 0,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: '32px 28px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
    animation: 'dp-fadein 0.35s ease-out',
  },
  stepContent: {
    animation: 'dp-fadein 0.3s ease-out',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 6px',
  },
  stepDesc: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '0 0 20px',
  },
  dropZone: {
    border: '2px dashed',
    borderRadius: 14,
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  uploadIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  parsedCard: {
    marginTop: 20,
    background: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12,
    padding: 20,
  },
  parsedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parsedName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0,
  },
  parsedMeta: {
    fontSize: 12,
    color: '#64748b',
    margin: '3px 0 0',
  },
  parsedLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  successBadge: {
    fontSize: 12,
    color: '#4ade80',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    padding: '4px 10px',
    borderRadius: 99,
    fontWeight: 600,
  },
  expRow: {
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: 13,
  },
  textarea: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#f1f5f9',
    fontSize: 13,
    resize: 'vertical',
    outline: 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: 'border-box',
    lineHeight: 1.6,
    marginBottom: 14,
  },
  gradientBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 24px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  nextBtn: {
    marginTop: 20,
    display: 'block',
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  secondaryBtn: {
    padding: '10px 18px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  sectionBlock: {
    marginTop: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 16,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 10px',
  },
  bulletGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
    marginBottom: 20,
  },
  templateCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  templatePreview: {
    height: 70,
    borderRadius: 8,
    marginBottom: 12,
    display: 'flex',
    overflow: 'hidden',
  },
  downloadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
    marginTop: 8,
  },
  downloadCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
  },
  draftCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '14px 16px',
    transition: 'background 0.15s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#64748b',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'dp-spin 0.8s linear infinite',
    margin: '0 auto',
  },
  spinnerInline: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'dp-spin 0.7s linear infinite',
  },
}
