/**
 * pages/dashboard/MockInterviewPage.jsx
 *
 * DevPulse AI — Mock Interview
 * State machine: "setup" → "interview" → "results"
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState } from 'react'
import { toast } from 'sonner'

// ── Local question bank (role × round_type) ─────────────────────────────
const INTERVIEW_QUESTIONS = {
  technical: {
    'Frontend Dev':  [
      'Explain the difference between controlled and uncontrolled components in React.',
      'How does the browser rendering pipeline work? What triggers a reflow vs repaint?',
      'Describe the CSS box model and how box-sizing affects layout.',
      'What are Web Workers and when would you use them?',
      'Explain how you would optimise a React application that re-renders too frequently.',
    ],
    'Backend Dev':   [
      'Explain the difference between SQL INNER JOIN, LEFT JOIN and FULL OUTER JOIN.',
      'How would you design a rate-limiting system for a public REST API?',
      'What is the N+1 query problem and how do you avoid it?',
      'Describe how you would implement JWT authentication from scratch.',
      'How does database indexing work and what are the trade-offs?',
    ],
    'Full Stack':    [
      'Walk me through how a browser request travels from the URL bar to a response on screen.',
      'How would you design a real-time notification system?',
      'Explain CORS and how you would handle it correctly in a full-stack app.',
      'What is the difference between REST and GraphQL? When would you choose each?',
      'How would you implement optimistic UI updates?',
    ],
    'DevOps':        [
      'Explain the difference between a Docker image and a Docker container.',
      'How does Kubernetes handle pod scheduling and what factors affect it?',
      'Describe a CI/CD pipeline you have built or maintained.',
      'What are the key differences between horizontal and vertical scaling?',
      'How would you diagnose a sudden spike in CPU usage on a production server?',
    ],
    'Data Engineer': [
      'Explain the difference between a data warehouse and a data lake.',
      'What is the CAP theorem and how does it apply to distributed databases?',
      'Describe how you would build a real-time data pipeline.',
      'What are window functions in SQL and give an example use case.',
      'How would you handle late-arriving data in a streaming pipeline?',
    ],
  },
  hr: {
    default: [
      'Tell me about a time you had a conflict with a teammate. How did you resolve it?',
      'Describe a project where you had to learn something completely new under a tight deadline.',
      'What is your approach when you disagree with a technical decision made by your manager?',
      'Tell me about a time you failed. What did you learn from it?',
      'How do you prioritise tasks when you have multiple deadlines competing for your time?',
    ],
  },
  system_design: {
    'Frontend Dev':  [
      'Design a scalable component library that can be shared across multiple React apps.',
      'How would you design a client-side caching strategy for a high-traffic dashboard?',
      'Design a drag-and-drop kanban board with real-time collaboration.',
      'How would you architect a micro-frontend system?',
      'Design a performant infinite scroll feed with live updates.',
    ],
    default: [
      'Design a URL shortener like bit.ly. Walk me through the architecture.',
      'How would you design a distributed job queue system?',
      'Design a notification delivery system that handles 1M users.',
      'How would you design a scalable file upload service?',
      'Design a real-time collaborative document editor.',
    ],
  },
}

// ── Model answers for feedback ───────────────────────────────────────
const MODEL_ANSWERS = {
  'Explain the difference between controlled and uncontrolled components in React.': 'A controlled component derives its value from React state and updates via onChange handlers. An uncontrolled component stores its value in the DOM, accessed via refs. Controlled components are preferred for complex forms needing validation or conditional rendering.',
  'Explain the difference between SQL INNER JOIN, LEFT JOIN and FULL OUTER JOIN.': 'INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table plus matching rows from the right (NULLs for no match). FULL OUTER JOIN returns all rows from both tables, with NULLs where there is no match on either side.',
  'Design a URL shortener like bit.ly. Walk me through the architecture.': 'Use a hash function (base-62 encoding of an auto-increment ID) to create short codes. Store mappings in a relational DB. Add a Redis cache layer for read-heavy lookups (99% of traffic is reads). Use a CDN for the redirect responses. For analytics, push click events to a Kafka topic consumed by a separate analytics service.',
}

// ── Local grading engine ───────────────────────────────────────────
function gradeAnswer(question, answer, roundType) {
  const len    = answer.trim().split(/\s+/).length
  const lower  = answer.toLowerCase()

  // Keywords that indicate quality
  const techKw = ['because', 'example', 'used', 'implemented', 'difference', 'however', 'performance', 'scalab', 'cach', 'index', 'async', 'state', 'component', 'database', 'api', 'server', 'client', 'deploy', 'test']
  const hrKw   = ['team', 'communic', 'resolved', 'learned', 'outcome', 'collaborat', 'challenge', 'result', 'decided', 'approach', 'priorit', 'deadline', 'feedback']

  const keywords = roundType === 'hr' ? hrKw : techKw
  const kwHits   = keywords.filter(kw => lower.includes(kw)).length

  // Scoring: length (max 4) + keyword coverage (max 4) + structure (max 2)
  const lenScore = Math.min(4, Math.floor(len / 30))
  const kwScore  = Math.min(4, kwHits)
  const hasExample = lower.includes('example') || lower.includes('instance') || lower.includes('once') || lower.includes('when i') ? 1 : 0
  const hasClear   = len > 20 && (lower.endsWith('.') || lower.endsWith('!')) ? 1 : 0

  const raw   = lenScore + kwScore + hasExample + hasClear
  const score = Math.max(1, Math.min(10, raw + (len > 10 ? 1 : 0)))

  const feedbacks = [
    score >= 8 ? 'Excellent response! Clear, detailed, and well-structured with concrete examples.' : null,
    score >= 6 ? 'Good answer with solid understanding. Adding a concrete example would make it even stronger.' : null,
    score >= 4 ? 'Decent start, but could use more depth. Try the STAR format: Situation, Task, Action, Result.' : null,
    'The answer is too brief. Interviewers expect detailed explanations with real-world examples.',
  ].filter(Boolean)

  return {
    score,
    feedback: feedbacks[0],
    model_answer: MODEL_ANSWERS[question] || `A strong answer should explain the core concept clearly, compare alternatives if applicable, and back claims with a real-world example from your experience. Aim for 3-5 sentences minimum.`,
  }
}

function getQuestions(roleId, roundType) {
  const bank = INTERVIEW_QUESTIONS[roundType]
  if (!bank) return INTERVIEW_QUESTIONS.technical.default || []
  return bank[roleId] || bank.default || Object.values(INTERVIEW_QUESTIONS.technical)[0]
}

// ── Config ────────────────────────────────────────────────────────────────────
const ROLES = [
  { id: 'Frontend Dev',   icon: '🎨', color: '#818cf8', desc: 'React, CSS, JS, Performance' },
  { id: 'Backend Dev',    icon: '⚙️', color: '#34d399', desc: 'APIs, Databases, Architecture' },
  { id: 'Full Stack',     icon: '🌐', color: '#22d3ee', desc: 'End-to-end product development' },
  { id: 'DevOps',         icon: '🚀', color: '#f59e0b', desc: 'CI/CD, Docker, Kubernetes, Cloud' },
  { id: 'Data Engineer',  icon: '📊', color: '#a78bfa', desc: 'Pipelines, SQL, ML Ops' },
]

const ROUNDS = [
  { id: 'technical',     label: 'Technical',      icon: '💻', desc: 'Implementation & debugging' },
  { id: 'hr',            label: 'HR / Behavioural',icon: '🤝', desc: 'Culture fit & soft skills' },
  { id: 'system_design', label: 'System Design',  icon: '🏗️', desc: 'Scalability & architecture' },
]

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 8 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 48, height: 48, borderRadius: '50%',
      background: `${color}22`, border: `2px solid ${color}`,
      fontSize: 18, fontWeight: 800, color,
      boxShadow: `0 0 14px ${color}44`,
    }}>
      {score}
    </div>
  )
}

// ── Score ring (results) ──────────────────────────────────────────────────────
function ReadinessRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 12px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{pct}</span>
        <span style={{ fontSize:11, color:'#64748b' }}>Readiness</span>
      </div>
    </div>
  )
}

// ── Feedback drawer (slides up) ───────────────────────────────────────────────
function FeedbackDrawer({ grade, onNext, isLast, loading }) {
  const [showModel, setShowModel] = useState(false)
  return (
    <div style={S.drawer}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16 }}>
        <ScoreBadge score={grade.score} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12, color:'#818cf8', fontWeight:700, margin:'0 0 6px' }}>AI FEEDBACK</p>
          <p style={{ fontSize:14, color:'#cbd5e1', lineHeight:1.6, margin:0 }}>{grade.feedback}</p>
        </div>
      </div>
      <button
        onClick={() => setShowModel(v => !v)}
        style={S.modelToggle}
      >
        {showModel ? '▼ Hide Model Answer' : '▶ Show Model Answer'}
      </button>
      {showModel && (
        <div style={S.modelAnswer}>
          <p style={{ fontSize:12, color:'#818cf8', fontWeight:700, marginBottom:6 }}>MODEL ANSWER</p>
          <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7, margin:0 }}>{grade.model_answer}</p>
        </div>
      )}
      <button
        onClick={onNext}
        disabled={loading}
        style={{ ...S.nextBtn, marginTop:16, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <><span style={S.spinnerInline}/> Grading…</> : isLast ? 'View Results →' : 'Next Question →'}
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export default function MockInterviewPage() {
  const [view,       setView]     = useState('setup')
  const [role,       setRole]     = useState(null)
  const [roundType,  setRound]    = useState(null)
  const [starting,   setStarting] = useState(false)

  // Interview state (all client-side)
  const [questions,   setQuestions]  = useState([])
  const [questionIdx, setQIdx]       = useState(0)
  const [currentQ,    setCurrentQ]   = useState('')
  const [userAnswer,  setUserAnswer] = useState('')
  const [grade,       setGrade]      = useState(null)
  const [submitting,  setSubmitting] = useState(false)
  const [showDrawer,  setShowDrawer] = useState(false)
  const [isLast,      setIsLast]     = useState(false)
  const [gradedAll,   setGradedAll]  = useState([])

  // Results
  const [result,     setResult]   = useState(null)
  const [sessions,   setSessions] = useState([])

  // ── Start interview (client-side) ──────────────────────────────────────
  const handleStart = () => {
    if (!role || !roundType) { toast.error('Select a role and round type.'); return }
    setStarting(true)
    setTimeout(() => {
      const qs = getQuestions(role.id, roundType.id)
      setQuestions(qs)
      setQIdx(0)
      setCurrentQ(qs[0])
      setUserAnswer('')
      setGrade(null)
      setShowDrawer(false)
      setIsLast(qs.length === 1)
      setGradedAll([])
      setResult(null)
      setView('interview')
      setStarting(false)
    }, 600)
  }

  // ── Submit answer (client-side grader) ────────────────────────────────────
  const handleSubmitFull = () => {
    if (!userAnswer.trim()) { toast.error('Please type an answer.'); return }
    setSubmitting(true)
    setTimeout(() => {
      const graded = gradeAnswer(currentQ, userAnswer, roundType.id)
      const newGradedAll = [...gradedAll, { question: currentQ, ai_score: graded.score, ai_feedback: graded.feedback, model_answer: graded.model_answer }]
      setGradedAll(newGradedAll)
      setGrade(graded)
      const last = questionIdx >= questions.length - 1
      setIsLast(last)
      setShowDrawer(true)
      if (last) {
        const avgScore  = Math.round(newGradedAll.reduce((s, a) => s + a.ai_score, 0) / newGradedAll.length)
        const readiness = Math.round(avgScore * 10)
        setResult({ readiness_score: readiness, xp_gained: readiness, answers: newGradedAll })
      }
      setSubmitting(false)
    }, 900)
  }

  // ── Next question ─────────────────────────────────────────────────────────
  const handleNextQuestion = () => {
    if (isLast) { setView('results'); return }
    const nextIdx = questionIdx + 1
    setQIdx(nextIdx)
    setCurrentQ(questions[nextIdx])
    setUserAnswer('')
    setGrade(null)
    setShowDrawer(false)
    setIsLast(nextIdx >= questions.length - 1)
  }

  // Sessions from localStorage
  const loadSessions = () => {
    try { setSessions(JSON.parse(localStorage.getItem('dp_interview_sessions') || '[]')) } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes dp-slideup{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── SETUP ────────────────────────────────────────────────────────── */}
      {view === 'setup' && (
        <div style={{ maxWidth:700, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>🎤 Mock Interview</h1>
            <p style={S.pageSub}>AI-powered interview simulation with real-time feedback</p>
          </div>

          {/* Role selection */}
          <p style={S.sectionLabel}>Select Role</p>
          <div style={S.roleGrid}>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r)}
                style={{
                  ...S.roleCard,
                  border: role?.id === r.id ? `2px solid ${r.color}` : '2px solid rgba(255,255,255,0.08)',
                  background: role?.id === r.id ? `${r.color}15` : 'rgba(255,255,255,0.03)',
                  boxShadow: role?.id === r.id ? `0 0 18px ${r.color}33` : 'none',
                }}
              >
                <span style={{ fontSize:28, marginBottom:8 }}>{r.icon}</span>
                <p style={{ fontSize:13, fontWeight:700, color: role?.id === r.id ? r.color : '#e2e8f0', margin:'0 0 4px' }}>{r.id}</p>
                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{r.desc}</p>
              </button>
            ))}
          </div>

          {/* Round type */}
          <p style={{ ...S.sectionLabel, marginTop:24 }}>Round Type</p>
          <div style={S.roundGrid}>
            {ROUNDS.map(rd => (
              <button
                key={rd.id}
                onClick={() => setRound(rd)}
                style={{
                  ...S.roundCard,
                  border: roundType?.id === rd.id ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
                  background: roundType?.id === rd.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  boxShadow: roundType?.id === rd.id ? '0 0 16px rgba(99,102,241,0.25)' : 'none',
                }}
              >
                <span style={{ fontSize:22, marginBottom:6 }}>{rd.icon}</span>
                <p style={{ fontSize:13, fontWeight:700, color: roundType?.id === rd.id ? '#c7d2fe' : '#e2e8f0', margin:'0 0 3px' }}>{rd.label}</p>
                <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{rd.desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={!role || !roundType || starting}
            style={{
              ...S.startInterviewBtn,
              opacity: (!role || !roundType || starting) ? 0.5 : 1,
              cursor:  (!role || !roundType || starting) ? 'not-allowed' : 'pointer',
              marginTop:28,
            }}
          >
            {starting ? <><span style={S.spinnerInline}/> Starting…</> : 'Start Interview →'}
          </button>
        </div>
      )}

      {/* ── INTERVIEW ────────────────────────────────────────────────────── */}
      {view === 'interview' && (
        <div style={{ maxWidth:700, margin:'0 auto', animation:'dp-fadein 0.3s ease-out', paddingBottom:showDrawer?320:40 }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <p style={{ fontSize:12, color:'#818cf8', fontWeight:700, margin:0 }}>
                {role?.icon} {role?.id} — {roundType?.label}
              </p>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:'4px 0 0' }}>
                Question {questionIdx + 1} of {questions.length}
              </h2>
            </div>
            <button onClick={() => setView('setup')} style={S.backBtn}>✕ End</button>
          </div>

          {/* Progress */}
          <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.07)', marginBottom:24 }}>
            <div style={{
              height:'100%', borderRadius:99, transition:'width 0.4s',
              width:`${((questionIdx + 1) / questions.length) * 100}%`,
              background:'linear-gradient(90deg,#6366f1,#8b5cf6)',
            }}/>
          </div>

          {/* Question card */}
          <div style={S.questionCard}>
            <p style={{ fontSize:16, color:'#f1f5f9', fontWeight:600, lineHeight:1.7, margin:0 }}>
              {currentQ}
            </p>
          </div>

          {/* Answer textarea */}
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            placeholder="Type your answer here… Be as detailed as possible. Use examples from your experience."
            rows={7}
            disabled={showDrawer}
            style={{ ...S.textarea, opacity: showDrawer ? 0.5 : 1 }}
          />

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:11, color:'#475569' }}>{userAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
            <span style={{ fontSize:11, color:'#475569' }}>Aim for 50+ words for a strong answer</span>
          </div>

          {!showDrawer && (
            <button
              onClick={handleSubmitFull}
              disabled={submitting || !userAnswer.trim()}
              style={{
                ...S.nextBtn,
                opacity: (submitting || !userAnswer.trim()) ? 0.5 : 1,
              }}
            >
              {submitting ? <><span style={S.spinnerInline}/> Grading with AI…</> : 'Submit Answer →'}
            </button>
          )}

          {/* Feedback drawer */}
          {showDrawer && grade && (
            <FeedbackDrawer
              grade={grade}
              onNext={handleNextQuestion}
              isLast={isLast}
              loading={false}
            />
          )}
        </div>
      )}

      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      {view === 'results' && result && (
        <div style={{ maxWidth:680, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          <div style={S.resultsCard}>
            <ReadinessRing score={result.readiness_score} />

            <h2 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', textAlign:'center', margin:'0 0 6px' }}>
              Interview Complete
            </h2>
            <p style={{ color:'#94a3b8', fontSize:14, textAlign:'center', margin:'0 0 16px' }}>
              {role?.id} — {roundType?.label} Round
            </p>

            {/* XP chip */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <span style={S.xpChip}>+{result.xp_gained} XP awarded 🚀</span>
            </div>

            {/* Strengths / Weaknesses derived from scores */}
            {result.answers && (() => {
              const sorted = [...result.answers].sort((a, b) => b.ai_score - a.ai_score)
              const strong = sorted.slice(0, 2).map(a => a.question.slice(0, 40) + '…')
              const weak   = sorted.slice(-2).map(a => a.question.slice(0, 40) + '…')
              return (
                <div style={S.swGrid}>
                  <div style={S.swCard}>
                    <p style={{ fontSize:12, color:'#22c55e', fontWeight:700, margin:'0 0 8px' }}>💪 Strongest</p>
                    {strong.map((s, i) => <p key={i} style={{ fontSize:12, color:'#86efac', margin:'0 0 4px' }}>• {s}</p>)}
                  </div>
                  <div style={S.swCard}>
                    <p style={{ fontSize:12, color:'#ef4444', fontWeight:700, margin:'0 0 8px' }}>⚠️ Needs Work</p>
                    {weak.map((w, i) => <p key={i} style={{ fontSize:12, color:'#fca5a5', margin:'0 0 4px' }}>• {w}</p>)}
                  </div>
                </div>
              )
            })()}

            {/* Per-question scores */}
            <div style={{ marginTop:20 }}>
              <p style={S.sectionLabel}>Question Breakdown</p>
              {(result.answers || []).map((a, i) => (
                <div key={i} style={S.answerRow}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 4px', fontWeight:600 }}>Q{i+1}: {a.question.slice(0, 60)}…</p>
                    <p style={{ fontSize:11, color:'#475569', margin:0, fontStyle:'italic' }}>{a.ai_feedback?.slice(0, 80)}…</p>
                  </div>
                  <ScoreBadge score={a.ai_score} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button
                onClick={() => { setView('setup'); setRole(null); setRound(null); setResult(null) }}
                style={{ ...S.nextBtn, flex:1 }}
              >
                Practice Again
              </button>
              <button
                onClick={() => { loadSessions(); setView('history') }}
                style={{ ...S.backBtn, flex:1, textAlign:'center' }}
              >
                View History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ──────────────────────────────────────────────────────── */}
      {view === 'history' && (
        <div style={{ maxWidth:700, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
            <button onClick={() => setView('setup')} style={S.backBtn}>← Back</button>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', margin:0 }}>Interview History</h2>
          </div>
          {loadingSess ? (
            <div style={{ textAlign:'center', padding:40 }}><div style={S.spinner}/></div>
          ) : sessions.length === 0 ? (
            <p style={{ color:'#475569' }}>No past sessions yet.</p>
          ) : (
            sessions.map(s => {
              const color = (s.readiness_score||0) >= 70 ? '#22c55e' : (s.readiness_score||0) >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={s.id} style={S.historyCard}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', margin:0 }}>{s.role}</p>
                    <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0' }}>
                      {s.round_type} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : 'In progress'}
                    </p>
                  </div>
                  {s.readiness_score != null && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ height:6, width:80, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${s.readiness_score}%`, background:color, borderRadius:99 }}/>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color }}>{s.readiness_score}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:       { fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', paddingBottom:40 },
  pageHeader: { marginBottom:24 },
  pageTitle:  { fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.4px' },
  pageSub:    { fontSize:13, color:'#94a3b8', margin:'4px 0 0' },
  sectionLabel:{ fontSize:12, fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 12px' },
  roleGrid:   { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 },
  roleCard:   {
    display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
    padding:'16px 8px', borderRadius:14, cursor:'pointer', transition:'all 0.2s',
  },
  roundGrid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  roundCard:  {
    display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
    padding:'18px 12px', borderRadius:14, cursor:'pointer', transition:'all 0.2s',
  },
  startInterviewBtn:{
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    width:'100%', padding:'16px', borderRadius:14,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    color:'#fff', fontSize:16, fontWeight:700,
    boxShadow:'0 6px 24px rgba(99,102,241,0.45)', cursor:'pointer',
  },
  backBtn:    {
    padding:'10px 16px', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    color:'#94a3b8', fontSize:13, fontWeight:500, cursor:'pointer',
  },
  questionCard:{
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
    borderRadius:14, padding:'24px', marginBottom:20,
  },
  textarea:   {
    width:'100%', padding:'16px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:12, color:'#f1f5f9', fontSize:14, outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif", lineHeight:1.7, resize:'vertical',
    marginBottom:14,
  },
  nextBtn:    {
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    width:'100%', padding:'14px', borderRadius:12,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    color:'#fff', fontSize:15, fontWeight:700,
    boxShadow:'0 4px 20px rgba(99,102,241,0.4)', cursor:'pointer',
  },
  drawer:     {
    position:'fixed', bottom:0, left:0, right:0, zIndex:100,
    background:'rgba(10,10,20,0.97)', backdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.09)', borderRadius:'16px 16px 0 0',
    padding:'24px 28px', boxShadow:'0 -24px 60px rgba(0,0,0,0.6)',
    animation:'dp-slideup 0.3s ease-out',
  },
  modelToggle:{
    padding:'8px 14px', borderRadius:8, background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.09)', color:'#64748b', fontSize:12,
    cursor:'pointer', marginBottom:10, width:'100%', textAlign:'left',
  },
  modelAnswer:{
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:10, padding:14, marginBottom:4,
  },
  resultsCard:{
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:18, padding:'32px 28px',
  },
  swGrid:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  swCard:     {
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:10, padding:14,
  },
  answerRow:  {
    display:'flex', alignItems:'center', gap:14,
    padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)',
  },
  historyCard:{
    display:'flex', alignItems:'center', justifyContent:'space-between',
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:10, padding:'14px 16px', marginBottom:10,
  },
  xpChip:     {
    fontSize:15, fontWeight:800, color:'#818cf8',
    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(129,140,248,0.35)',
    borderRadius:99, padding:'8px 20px', boxShadow:'0 0 20px rgba(99,102,241,0.3)',
  },
  spinner:    {
    width:32, height:32, border:'3px solid rgba(255,255,255,0.08)',
    borderTop:'3px solid #6366f1', borderRadius:'50%',
    animation:'dp-spin 0.8s linear infinite', margin:'0 auto',
  },
  spinnerInline:{
    display:'inline-block', width:14, height:14,
    border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff',
    borderRadius:'50%', animation:'dp-spin 0.7s linear infinite',
  },
}
