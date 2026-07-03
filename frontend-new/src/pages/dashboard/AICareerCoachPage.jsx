/**
 * pages/dashboard/AICareerCoachPage.jsx
 *
 * DevPulse AI — "Pulse" Career Coach Chat
 * Full-height chat UI: messages area + fixed input bar.
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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

// ── Quick prompt suggestions ────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  "What skills do I need for FAANG? 🎯",
  "Review my career roadmap 🗺️",
  "How do I negotiate a salary? 💰",
  "What should I learn next? 📚",
  "How to get my first senior role? 🚀",
  "Best way to prepare for system design? 🏗️",
]

// ── 3-dot typing indicator ──────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', padding:'14px 16px' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:8, height:8, borderRadius:'50%', background:'#818cf8',
          animation:`dp-pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
        }}/>
      ))}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────
function PulseAvatar() {
  return (
    <div style={{
      width:32, height:32, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(135deg,#6366f1,#a78bfa)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:14, fontWeight:800, color:'#fff',
      boxShadow:'0 0 14px rgba(99,102,241,0.5)',
    }}>
      P
    </div>
  )
}

// ── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display:'flex', flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems:'flex-start', gap:10, marginBottom:16,
      animation:'dp-fadein 0.25s ease-out',
    }}>
      {!isUser && <PulseAvatar />}
      {isUser && (
        <div style={{
          width:32, height:32, borderRadius:'50%', flexShrink:0,
          background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, color:'#94a3b8',
        }}>
          👤
        </div>
      )}
      <div style={{
        maxWidth:'72%',
        background: isUser
          ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
          : 'rgba(255,255,255,0.05)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding:'12px 16px',
        boxShadow: isUser ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
      }}>
        <p style={{
          fontSize:14, lineHeight:1.7, margin:0,
          color: isUser ? '#e0e7ff' : '#cbd5e1',
          whiteSpace:'pre-wrap', wordBreak:'break-word',
        }}>
          {msg.content}
        </p>
        <p style={{ fontSize:10, color: isUser ? 'rgba(224,231,255,0.5)' : '#475569', margin:'6px 0 0', textAlign:'right' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AICareerCoachPage() {
  const [messages,      setMessages]     = useState([])
  const [input,         setInput]        = useState('')
  const [loading,       setLoading]      = useState(false)
  const [msgUsed,       setMsgUsed]      = useState(0)
  const [msgLimit,      setMsgLimit]     = useState(10)
  const [rateLimited,   setRateLimited]  = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const user = useAuthStore(s => s.user)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Build history for API (last 12 turns for context window)
  const buildHistory = (msgs) =>
    msgs.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading || rateLimited) return

    const userMsg = { role:'user', content:trimmed, ts:Date.now() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const res  = await authFetch('/api/v1/coach/message', {
        method: 'POST',
        body:   JSON.stringify({ message:trimmed, history:buildHistory(messages) }),
      })
      const json = await res.json()

      if (res.status === 429) {
        setRateLimited(true)
        setMessages(prev => [...prev, {
          role:'assistant',
          content:`⚠️ You've reached your daily message limit (${json.messages_limit}/day on free plan). Come back tomorrow or upgrade to Pro!`,
          ts: Date.now(),
        }])
        return
      }

      if (!json.success) throw new Error(json.message)

      setMsgUsed(json.messages_used || 0)
      setMsgLimit(json.messages_limit || 10)
      setMessages(prev => [...prev, {
        role:'assistant', content:json.response, ts:Date.now(),
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:`❌ ${err.message || 'Something went wrong. Try again.'}`,
        ts: Date.now(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, messages, loading, rateLimited])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const remaining = Math.max(0, msgLimit - msgUsed)

  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-pulse{0%,80%,100%{transform:scale(0);opacity:0.3}40%{transform:scale(1);opacity:1}}
        @keyframes dp-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dp-spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={S.pulseGlow}>
            <PulseAvatar />
          </div>
          <div>
            <h1 style={S.title}>Pulse — AI Career Coach</h1>
            <p style={S.subtitle}>Senior engineer mentor · Available 24/7</p>
          </div>
        </div>
        <div style={S.limitBadge}>
          <span style={{ color: remaining <= 2 ? '#ef4444' : '#94a3b8', fontSize:12 }}>
            {remaining} message{remaining !== 1 ? 's' : ''} left today
          </span>
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div style={S.messagesArea}>

        {/* Welcome / suggestions (only shown before first message) */}
        {messages.length === 0 && !loading && (
          <div style={{ padding:'40px 0', animation:'dp-fadein 0.4s ease-out' }}>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ ...S.pulseGlow, margin:'0 auto 16px', width:64, height:64 }}>
                <div style={{
                  width:64, height:64, borderRadius:'50%',
                  background:'linear-gradient(135deg,#6366f1,#a78bfa)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:28, fontWeight:800, color:'#fff',
                }}>P</div>
              </div>
              <h2 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', margin:'0 0 6px' }}>
                Hey {user?.full_name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p style={{ fontSize:14, color:'#64748b', maxWidth:400, margin:'0 auto' }}>
                I'm Pulse, your AI career mentor. Ask me anything about your career, skills, or job search.
              </p>
            </div>
            <p style={{ fontSize:12, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, fontWeight:600 }}>
              Quick prompts
            </p>
            <div style={S.promptGrid}>
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  style={S.promptChip}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}>
            <PulseAvatar />
            <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'4px 16px 16px 16px' }}>
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div style={S.inputBar}>
        <div style={S.inputRow}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={rateLimited ? "Daily limit reached. Come back tomorrow." : "Ask Pulse anything… (Enter to send, Shift+Enter for newline)"}
            rows={1}
            disabled={loading || rateLimited}
            style={{
              ...S.textarea,
              opacity: rateLimited ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || rateLimited}
            style={{
              ...S.sendBtn,
              opacity: (!input.trim() || loading || rateLimited) ? 0.4 : 1,
              cursor:  (!input.trim() || loading || rateLimited) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <span style={S.spinnerInline}/> : '→'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'#334155', textAlign:'center', marginTop:8 }}>
          Pulse uses your certified skills, level, and career target to personalise responses.
        </p>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "'Inter',system-ui,sans-serif",
    color: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 80px)',  // account for sidebar header
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  title:   { fontSize:18, fontWeight:800, margin:0, letterSpacing:'-0.3px' },
  subtitle:{ fontSize:12, color:'#64748b', margin:'2px 0 0' },
  limitBadge: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 99,
    padding: '6px 14px',
  },
  pulseGlow: {
    borderRadius: '50%',
    boxShadow: '0 0 20px rgba(99,102,241,0.4)',
    display: 'inline-block',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 0',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.07) transparent',
  },
  promptGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    maxWidth: 600,
  },
  promptChip: {
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#c7d2fe',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontFamily: "'Inter',system-ui,sans-serif",
  },
  inputBar: {
    flexShrink: 0,
    padding: '16px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  inputRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 1.6,
    outline: 'none',
    resize: 'none',
    fontFamily: "'Inter',system-ui,sans-serif",
    maxHeight: 120,
    overflowY: 'auto',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none',
    color: '#fff', fontSize: 20, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
  spinnerInline: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
    borderRadius: '50%', animation: 'dp-spin 0.7s linear infinite',
  },
}
