/**
 * pages/dashboard/SkillBattlePage.jsx
 *
 * DevPulse AI — Skill Battle Arena
 * State machine: "lobby" | "waiting" | "battle" | "results"
 * Dark glassmorphism, vanilla CSS-in-JS.
 * Polling-based matchmaking (no WebSockets).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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

// ── Level colour map ─────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  Intern: '#94a3b8', Junior: '#22d3ee', Mid: '#34d399',
  Senior: '#a78bfa', Principal: '#f59e0b', Legend: '#f97316',
}

// ── CSS confetti ─────────────────────────────────────────────────────────────
const CONFETTI_CSS = `
@keyframes dp-confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity:1 }
  100% { transform: translateY(300px) rotate(720deg); opacity:0 }
}
.dp-confetti-piece {
  position:fixed; top:0; width:10px; height:10px; border-radius:2px;
  animation: dp-confetti-fall 2.5s ease-in forwards;
  pointer-events:none; z-index:9999;
}
@keyframes dp-pulse-ring {
  0%   { transform:scale(1);   opacity:0.8 }
  50%  { transform:scale(1.15);opacity:0.3 }
  100% { transform:scale(1);   opacity:0.8 }
}
@keyframes dp-spin      { to { transform:rotate(360deg) } }
@keyframes dp-fadein    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes dp-slideup   { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
@keyframes dp-xp        { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
`

// ── Confetti burst ────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#6366f1','#a78bfa','#22c55e','#f59e0b','#f472b6','#22d3ee']
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div')
    el.className = 'dp-confetti-piece'
    el.style.left      = `${Math.random() * 100}vw`
    el.style.background = colors[Math.floor(Math.random() * colors.length)]
    el.style.animationDelay   = `${Math.random() * 1}s`
    el.style.animationDuration = `${1.8 + Math.random() * 1}s`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3500)
  }
}

// ── 30s countdown timer bar ───────────────────────────────────────────────────
function TimerBar({ seconds = 30, onTimeout }) {
  const [left, setLeft] = useState(seconds)
  const ref = useRef(null)
  useEffect(() => {
    setLeft(seconds)
    ref.current = setInterval(() => {
      setLeft(s => {
        if (s <= 1) { clearInterval(ref.current); onTimeout?.(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [seconds])
  const pct   = (left / seconds) * 100
  const color = left < 8 ? '#ef4444' : left < 15 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ flex:1, height:6, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:99, transition:'width 0.9s linear',
          width:`${pct}%`, background:color,
          boxShadow:`0 0 8px ${color}88`,
        }}/>
      </div>
      <span style={{ fontSize:14, fontWeight:800, color, minWidth:28 }}>{left}s</span>
    </div>
  )
}

// ── Score strip ───────────────────────────────────────────────────────────────
function ScoreStrip({ myScore, oppScore, total }) {
  return (
    <div style={S.scoreStrip}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>You</p>
        <p style={{ fontSize:22, fontWeight:800, color:'#818cf8' }}>{myScore}</p>
      </div>
      <div style={{ fontSize:14, color:'#334155' }}>of {total} ⚔️</div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:11, color:'#64748b', margin:'0 0 2px' }}>Opponent</p>
        <p style={{ fontSize:22, fontWeight:800, color:'#f87171' }}>
          {oppScore !== null ? oppScore : '?'}
        </p>
      </div>
    </div>
  )
}

// ── Leaderboard table ─────────────────────────────────────────────────────────
function LeaderboardTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/v1/battle/leaderboard')
      .then(r => r.json())
      .then(j => { if (j.success) setRows(j.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><div style={S.spinner}/></div>

  return (
    <div style={{ marginTop:8 }}>
      {rows.length === 0
        ? <p style={{ color:'#475569', fontSize:13 }}>No ranked players yet. Be the first!</p>
        : rows.map(r => {
          const lc = LEVEL_COLORS[r.level] || '#94a3b8'
          return (
            <div key={r.rank} style={S.leaderRow}>
              <span style={{ ...S.rankBadge, color: r.rank <= 3 ? '#f59e0b' : '#475569' }}>
                {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`}
              </span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', margin:0 }}>{r.username}</p>
                {r.target_role && <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>{r.target_role}</p>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:lc, background:`${lc}22`, border:`1px solid ${lc}44`, borderRadius:99, padding:'2px 8px' }}>
                  {r.level}
                </span>
                <span style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>{r.total_xp.toLocaleString()} XP</span>
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ── Daily challenge card ──────────────────────────────────────────────────────
function DailyChallengeCard({ onAnswer }) {
  const [challenge, setChallenge] = useState(null)
  const [answered,  setAnswered]  = useState(false)
  const [result,    setResult]    = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    authFetch('/api/v1/battle/daily')
      .then(r => r.json())
      .then(j => { if (j.success) setChallenge(j.data) })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (idx) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    try {
      const res  = await authFetch('/api/v1/battle/daily', { method:'POST', body:JSON.stringify({ answer:idx }) })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        if (json.data.correct) onAnswer?.(json.data.xp_gained)
      } else if (res.status === 409) {
        setResult({ correct:null, already:true })
      }
    } catch {}
  }

  if (loading) return <div style={S.dailyCard}><div style={S.spinner}/></div>
  if (!challenge) return (
    <div style={S.dailyCard}>
      <p style={{ color:'#475569', fontSize:13 }}>No daily challenge today.</p>
    </div>
  )

  return (
    <div style={S.dailyCard}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:20 }}>⚡</span>
        <div>
          <p style={{ fontSize:12, color:'#f59e0b', fontWeight:700, margin:0, textTransform:'uppercase' }}>Daily Challenge</p>
          <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{challenge.skill} · +25 XP</p>
        </div>
      </div>
      <p style={{ fontSize:14, color:'#e2e8f0', lineHeight:1.6, marginBottom:12 }}>{challenge.question}</p>
      {result?.already ? (
        <p style={{ fontSize:12, color:'#64748b', fontStyle:'italic' }}>✅ Already answered today. Come back tomorrow!</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(challenge.options || []).map((opt, i) => {
            const isSelected = selected === i
            const isCorrect  = result && i === result.correct_answer
            const isWrong    = result && isSelected && !result.correct
            return (
              <button
                key={i}
                onClick={() => handleSubmit(i)}
                disabled={answered}
                style={{
                  ...S.optBtn,
                  background: isCorrect ? 'rgba(34,197,94,0.12)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCorrect ? '#22c55e55' : isWrong ? '#ef444455' : isSelected ? '#818cf855' : 'rgba(255,255,255,0.07)'}`,
                  color: isCorrect ? '#4ade80' : isWrong ? '#f87171' : '#cbd5e1',
                  cursor: answered ? 'default' : 'pointer',
                }}
              >
                {isCorrect ? '✅ ' : isWrong ? '❌ ' : ''}{opt}
              </button>
            )
          })}
        </div>
      )}
      {result && !result.already && (
        <p style={{ fontSize:12, marginTop:10, color: result.correct ? '#4ade80' : '#94a3b8', fontStyle:'italic' }}>
          {result.correct ? `🎉 Correct! +${result.xp_gained} XP` : `😔 Not quite. ${result.explanation}`}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SkillBattlePage() {
  const [view,        setView]       = useState('lobby')
  const [activeTab,   setActiveTab]  = useState('challenge') // 'challenge' | 'leaderboard' | 'history'
  const [skillInput,  setSkillInput] = useState('')
  const [finding,     setFinding]    = useState(false)
  const [roomId,      setRoomId]     = useState(null)
  const [roomSkill,   setRoomSkill]  = useState('')
  const [waitingSecs, setWaitingSecs]= useState(0)
  const [questions,   setQuestions]  = useState([])
  const [currentQ,    setCurrentQ]   = useState(0)
  const [selected,    setSelected]   = useState(null)
  const [myAnswers,   setMyAnswers]  = useState([])
  const [myScore,     setMyScore]    = useState(0)
  const [oppScore,    setOppScore]   = useState(null)
  const [startTime,   setStartTime]  = useState(null)
  const [submitting,  setSubmitting] = useState(false)
  const [result,      setResult]     = useState(null)
  const [history,     setHistory]    = useState([])
  const [loadHist,    setLoadHist]   = useState(false)

  const pollRef    = useRef(null)
  const waitRef    = useRef(null)

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(pollRef.current)
    clearInterval(waitRef.current)
  }, [])

  // ── Find battle ───────────────────────────────────────────────────────────
  const handleFind = async () => {
    if (!skillInput.trim()) { toast.error('Enter a skill to battle on.'); return }
    setFinding(true)
    try {
      const res  = await authFetch('/api/v1/battle/find', {
        method:'POST', body:JSON.stringify({ skill:skillInput.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setRoomId(json.data.room_id)
      setRoomSkill(json.data.skill)
      if (json.data.status === 'active') {
        await joinActiveRoom(json.data.room_id)
      } else {
        setView('waiting')
        startWaiting(json.data.room_id)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setFinding(false)
    }
  }

  const joinActiveRoom = async (rid) => {
    const res  = await authFetch(`/api/v1/battle/room/${rid}`)
    const json = await res.json()
    if (!json.success) return
    const room = json.data
    if (room.status === 'active' && room.questions?.length > 0) {
      setQuestions(room.questions)
      setMyScore(0)
      setOppScore(room.opp_score)
      setCurrentQ(0)
      setSelected(null)
      setMyAnswers([])
      setStartTime(Date.now())
      setView('battle')
      startOpponentPoll(rid)
    }
  }

  // ── Waiting + poll for opponent ───────────────────────────────────────────
  const startWaiting = (rid) => {
    setWaitingSecs(0)
    clearInterval(waitRef.current)
    clearInterval(pollRef.current)

    // Increment waiting seconds counter
    waitRef.current = setInterval(() => {
      setWaitingSecs(s => s + 1)
    }, 1000)

    // Poll for opponent every 3s
    pollRef.current = setInterval(async () => {
      try {
        const res  = await authFetch(`/api/v1/battle/room/${rid}`)
        const json = await res.json()
        if (!json.success) return
        const room = json.data
        if (room.status === 'active' && room.questions?.length > 0) {
          clearInterval(pollRef.current)
          clearInterval(waitRef.current)
          setQuestions(room.questions)
          setMyScore(0)
          setOppScore(null)
          setCurrentQ(0)
          setSelected(null)
          setMyAnswers([])
          setStartTime(Date.now())
          setView('battle')
          startOpponentPoll(rid)
        }
      } catch {}
    }, 3000)
  }

  // ── Poll opponent score during battle ─────────────────────────────────────
  const startOpponentPoll = (rid) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res  = await authFetch(`/api/v1/battle/room/${rid}`)
        const json = await res.json()
        if (json.success && json.data.opp_score !== null) {
          setOppScore(json.data.opp_score)
        }
        if (json.data.status === 'done') clearInterval(pollRef.current)
      } catch {}
    }, 3000)
  }

  // ── Cancel waiting ────────────────────────────────────────────────────────
  const handleCancel = () => {
    clearInterval(pollRef.current)
    clearInterval(waitRef.current)
    setRoomId(null)
    setView('lobby')
  }

  // ── Answer question ───────────────────────────────────────────────────────
  const handleAnswer = (optIdx) => {
    if (selected !== null) return
    setSelected(optIdx)
  }

  // ── Next / auto-advance ───────────────────────────────────────────────────
  const handleNextQuestion = useCallback((autoAnswer = false) => {
    const finalAns  = autoAnswer ? -1 : selected
    const newAns    = [...myAnswers, finalAns]
    setMyAnswers(newAns)
    setSelected(null)

    const isLast = currentQ >= questions.length - 1
    if (isLast) {
      handleSubmitBattle(newAns)
    } else {
      setCurrentQ(q => q + 1)
    }
  }, [selected, myAnswers, currentQ, questions])

  // ── Submit battle ─────────────────────────────────────────────────────────
  const handleSubmitBattle = async (finalAnswers) => {
    setSubmitting(true)
    clearInterval(pollRef.current)
    const timeTaken = Math.round((Date.now() - (startTime || Date.now())) / 1000)
    try {
      const res  = await authFetch('/api/v1/battle/submit', {
        method:'POST',
        body:JSON.stringify({ room_id:roomId, answers:finalAnswers, time_taken:timeTaken }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setResult(json.data)
      setMyScore(json.data.score)
      setView('results')
      if (json.data.is_winner) spawnConfetti()
    } catch (err) {
      toast.error(err.message)
      setView('lobby')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setLoadHist(true)
    try {
      const res  = await authFetch('/api/v1/battle/history')
      const json = await res.json()
      if (json.success) setHistory(json.data)
    } catch {}
    setLoadHist(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <style>{CONFETTI_CSS}</style>

      {/* ── LOBBY ────────────────────────────────────────────────────────── */}
      {view === 'lobby' && (
        <div style={{ animation:'dp-fadein 0.3s ease-out' }}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>⚔️ Skill Battle Arena</h1>
            <p style={S.pageSub}>Challenge other devs to real-time skill battles. Win XP, climb the leaderboard.</p>
          </div>

          {/* Skill input + Find button */}
          <div style={S.findBox}>
            <div style={{ flex:1 }}>
              <label style={S.inputLabel}>Choose your battle skill</label>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFind()}
                placeholder="e.g. React, Python, Docker, PostgreSQL…"
                style={S.skillInput}
              />
            </div>
            <button
              onClick={handleFind}
              disabled={finding || !skillInput.trim()}
              style={{
                ...S.findBtn,
                opacity: (finding || !skillInput.trim()) ? 0.5 : 1,
                cursor:  (finding || !skillInput.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {finding ? <span style={S.spinnerInline}/> : '⚔️ Find Opponent'}
            </button>
          </div>

          {/* XP reward hint */}
          <div style={S.xpHint}>
            <span style={{ color:'#f59e0b' }}>🏆 Win</span> +150 XP
            &nbsp;·&nbsp;
            <span style={{ color:'#94a3b8' }}>Play</span> +50 XP
            &nbsp;·&nbsp;
            <span style={{ color:'#22c55e' }}>⚡ Daily</span> +25 XP
          </div>

          {/* Tab bar */}
          <div style={S.tabBar}>
            {[
              { id:'challenge',   label:'Daily Challenge ⚡' },
              { id:'leaderboard', label:'Leaderboard 🏆' },
              { id:'history',     label:'My Battles ⚔️' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                style={{
                  ...S.tabBtn,
                  background:  activeTab === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  borderBottom:`2px solid ${activeTab === t.id ? '#6366f1' : 'transparent'}`,
                  color:        activeTab === t.id ? '#a5b4fc' : '#64748b',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'challenge' && (
            <DailyChallengeCard onAnswer={(xp) => toast.success(`+${xp} XP from daily challenge! 🎉`)} />
          )}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'history' && (
            <div>
              {loadHist
                ? <div style={{ textAlign:'center', padding:40 }}><div style={S.spinner}/></div>
                : history.length === 0
                  ? <p style={{ color:'#475569', fontSize:13 }}>No battles yet. Challenge someone!</p>
                  : history.map((b, i) => {
                    const rc = b.result === 'win' ? '#22c55e' : b.result === 'loss' ? '#ef4444' : '#f59e0b'
                    return (
                      <div key={i} style={S.histRow}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', margin:0 }}>{b.skill}</p>
                          <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>{new Date(b.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:12, color:'#64748b' }}>Score: {b.my_score}</span>
                          <span style={{ fontSize:12, color:rc, fontWeight:700, background:`${rc}15`, border:`1px solid ${rc}44`, borderRadius:99, padding:'2px 10px' }}>
                            {b.result.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
            </div>
          )}
        </div>
      )}

      {/* ── WAITING ──────────────────────────────────────────────────────── */}
      {view === 'waiting' && (
        <div style={{ ...S.centeredView, animation:'dp-fadein 0.3s ease-out' }}>
          {/* Animated pulse rings */}
          <div style={S.pulseContainer}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                ...S.pulseRing,
                width: 80 + i * 44, height: 80 + i * 44,
                animationDelay: `${i * 0.4}s`,
                opacity: 0.6 - i * 0.15,
              }}/>
            ))}
            <div style={S.pulseCore}>⚔️</div>
          </div>

          <h2 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', marginTop:28, marginBottom:8 }}>
            Finding opponent for <span style={{ color:'#818cf8' }}>{roomSkill}</span>…
          </h2>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:4 }}>
            {waitingSecs < 30 ? `Searching… ${waitingSecs}s` : '⏳ No opponent found yet — still searching…'}
          </p>
          {waitingSecs >= 30 && (
            <p style={{ fontSize:12, color:'#f59e0b', marginBottom:16 }}>
              Try a popular skill like React or Python for faster matchmaking.
            </p>
          )}
          <button onClick={handleCancel} style={S.cancelBtn}>✕ Cancel</button>
        </div>
      )}

      {/* ── BATTLE ───────────────────────────────────────────────────────── */}
      {view === 'battle' && (
        <div style={{ maxWidth:680, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>
              ⚔️ {roomSkill} Battle
            </h2>
            <span style={{ fontSize:12, color:'#818cf8', fontWeight:600 }}>
              Question {currentQ + 1} of {questions.length}
            </span>
          </div>

          {/* Timer */}
          <TimerBar
            key={currentQ}
            seconds={30}
            onTimeout={() => handleNextQuestion(true)}
          />

          {/* Question card */}
          <div style={S.questionCard}>
            <p style={{ fontSize:15, color:'#f1f5f9', fontWeight:600, lineHeight:1.7, margin:0 }}>
              {questions[currentQ]?.question}
            </p>
          </div>

          {/* Options */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, margin:'16px 0' }}>
            {(questions[currentQ]?.options || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                style={{
                  ...S.optionBtn,
                  background: selected === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  border: selected === i ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
                  color: selected === i ? '#c7d2fe' : '#cbd5e1',
                  boxShadow: selected === i ? '0 0 14px rgba(99,102,241,0.3)' : 'none',
                  cursor: selected !== null ? 'default' : 'pointer',
                }}
              >
                <span style={{
                  ...S.optionLetter,
                  background: selected === i ? '#6366f1' : 'rgba(255,255,255,0.08)',
                }}>
                  {['A','B','C','D'][i]}
                </span>
                {opt}
              </button>
            ))}
          </div>

          {/* Score strip */}
          <ScoreStrip myScore={myScore} oppScore={oppScore} total={questions.length} />

          {/* Next button */}
          {selected !== null && (
            <button
              onClick={() => handleNextQuestion(false)}
              disabled={submitting}
              style={{ ...S.nextBtn, marginTop:12 }}
            >
              {submitting ? <span style={S.spinnerInline}/> : currentQ < questions.length - 1 ? 'Next Question →' : 'Submit Battle ✓'}
            </button>
          )}
        </div>
      )}

      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      {view === 'results' && result && (
        <div style={{ maxWidth:580, margin:'0 auto', animation:'dp-fadein 0.4s ease-out' }}>
          <div style={S.resultsCard}>
            {/* Banner */}
            <div style={{
              ...S.resultBanner,
              background: result.is_winner
                ? 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.05))'
                : result.is_tie
                  ? 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))'
                  : 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.03))',
              border:`1px solid ${result.is_winner ? '#22c55e44' : result.is_tie ? '#f59e0b44' : '#ef444433'}`,
            }}>
              <p style={{ fontSize:36, margin:'0 0 4px' }}>
                {result.is_winner ? '🏆' : result.is_tie ? '🤝' : '😤'}
              </p>
              <h2 style={{
                fontSize:24, fontWeight:800, margin:'0 0 4px',
                color: result.is_winner ? '#4ade80' : result.is_tie ? '#fbbf24' : '#f87171',
              }}>
                {result.is_winner ? 'You Won!' : result.is_tie ? 'It\'s a Tie!' : 'Better Luck Next Time'}
              </h2>
              <p style={{ fontSize:14, color:'#94a3b8', margin:0 }}>
                {roomSkill} Battle · {result.score}/{result.total} correct
              </p>
            </div>

            {/* XP chip */}
            <div style={{ display:'flex', justifyContent:'center', margin:'20px 0' }}>
              <span style={{ ...S.xpChip, animation:'dp-xp 0.6s ease-out' }}>
                +{result.xp_gained || 0} XP
              </span>
            </div>

            {/* Score breakdown */}
            <div style={S.scoreGrid}>
              <div style={S.scoreCell}>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Your Score</p>
                <p style={{ fontSize:28, fontWeight:800, color:'#818cf8', margin:0 }}>{result.score}</p>
              </div>
              <div style={{ ...S.scoreCell, borderLeft:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Questions</p>
                <p style={{ fontSize:28, fontWeight:800, color:'#e2e8f0', margin:0 }}>{result.total}</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10, marginTop:24, flexWrap:'wrap' }}>
              <button
                onClick={() => handleFind()}
                style={{ ...S.nextBtn, flex:1 }}
              >
                Rematch ⚔️
              </button>
              <button
                onClick={() => {
                  setSkillInput('')
                  setView('lobby')
                  setResult(null)
                  clearInterval(pollRef.current)
                }}
                style={{ ...S.backBtn, flex:1 }}
              >
                New Battle
              </button>
            </div>
            <button
              onClick={() => { setView('lobby'); setResult(null); setSkillInput('') }}
              style={{ ...S.backBtn, width:'100%', marginTop:8 }}
            >
              ← Back to Lobby
            </button>
          </div>
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

  findBox: {
    display:'flex', gap:12, alignItems:'flex-end',
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:16, padding:'18px 20px', marginBottom:10,
  },
  inputLabel: { fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 },
  skillInput: {
    width:'100%', padding:'12px 14px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:10, color:'#f1f5f9', fontSize:14, outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  findBtn: {
    display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap',
    padding:'12px 20px', borderRadius:12,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    color:'#fff', fontSize:14, fontWeight:700,
    boxShadow:'0 4px 18px rgba(99,102,241,0.4)',
  },
  xpHint: {
    fontSize:12, color:'#475569', marginBottom:20,
    display:'flex', gap:8, alignItems:'center',
  },
  tabBar: {
    display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)',
    marginBottom:20, gap:4,
  },
  tabBtn: {
    padding:'10px 16px', background:'transparent', border:'none',
    borderBottom:'2px solid transparent', cursor:'pointer',
    fontSize:13, fontWeight:600, transition:'all 0.15s',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  leaderRow: {
    display:'flex', alignItems:'center', gap:12,
    padding:'10px 14px', borderRadius:10, marginBottom:6,
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)',
  },
  rankBadge: { minWidth:32, fontWeight:800, fontSize:14 },
  histRow: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 14px', borderRadius:10, marginBottom:6,
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
  },
  dailyCard: {
    background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)',
    borderRadius:14, padding:'20px',
  },
  optBtn: {
    padding:'10px 14px', borderRadius:10, cursor:'pointer',
    fontSize:13, textAlign:'left', transition:'all 0.15s',
    fontFamily:"'Inter',system-ui,sans-serif", width:'100%',
  },

  // Waiting
  centeredView: { display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0' },
  pulseContainer: { position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center' },
  pulseRing: {
    position:'absolute', borderRadius:'50%',
    border:'2px solid rgba(99,102,241,0.4)',
    animation:'dp-pulse-ring 2s ease-in-out infinite',
  },
  pulseCore: {
    width:60, height:60, borderRadius:'50%',
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:24, zIndex:1,
    boxShadow:'0 0 30px rgba(99,102,241,0.5)',
  },
  cancelBtn: {
    padding:'10px 24px', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    color:'#94a3b8', fontSize:13, cursor:'pointer', marginTop:12,
  },

  // Battle
  questionCard: {
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
    borderRadius:14, padding:'22px',
  },
  optionBtn: {
    display:'flex', alignItems:'center', gap:12,
    padding:'13px 16px', borderRadius:12,
    textAlign:'left', fontSize:14, fontWeight:500,
    transition:'all 0.15s', width:'100%',
  },
  optionLetter: {
    width:28, height:28, borderRadius:8,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:12, fontWeight:800, flexShrink:0, transition:'background 0.15s',
    color:'#e2e8f0',
  },
  scoreStrip: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:12, padding:'12px 20px', marginTop:16,
  },
  nextBtn: {
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    width:'100%', padding:'14px', borderRadius:12,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    color:'#fff', fontSize:15, fontWeight:700,
    boxShadow:'0 4px 20px rgba(99,102,241,0.4)', cursor:'pointer',
  },
  backBtn: {
    padding:'12px 16px', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    color:'#94a3b8', fontSize:13, fontWeight:500, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
  },

  // Results
  resultsCard: {
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:18, padding:'28px 24px',
  },
  resultBanner: {
    borderRadius:14, padding:'24px', textAlign:'center',
  },
  scoreGrid: {
    display:'grid', gridTemplateColumns:'1fr 1fr',
    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:12, overflow:'hidden',
  },
  scoreCell: { padding:'16px', textAlign:'center' },
  xpChip: {
    fontSize:18, fontWeight:800, color:'#818cf8',
    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(129,140,248,0.35)',
    borderRadius:99, padding:'10px 24px',
    boxShadow:'0 0 24px rgba(99,102,241,0.35)',
    display:'inline-block',
  },

  spinner: {
    width:30, height:30, border:'3px solid rgba(255,255,255,0.08)',
    borderTop:'3px solid #6366f1', borderRadius:'50%',
    animation:'dp-spin 0.8s linear infinite', margin:'0 auto',
  },
  spinnerInline: {
    display:'inline-block', width:14, height:14,
    border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff',
    borderRadius:'50%', animation:'dp-spin 0.7s linear infinite',
  },
}
