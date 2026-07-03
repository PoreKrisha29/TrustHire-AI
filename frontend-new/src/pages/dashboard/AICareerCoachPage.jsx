/**
 * pages/dashboard/AICareerCoachPage.jsx
 *
 * DevPulse AI — "Pulse" Career Coach Chat
 * Fully client-side smart response engine — no backend needed.
 * Keyword-matched responses with realistic word-by-word streaming.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import useAuthStore from '@/stores/authStore'

// ── Smart local response engine ──────────────────────────────────────────────
const RESPONSES = [
  {
    keys: ['faang', 'big tech', 'google', 'meta', 'amazon', 'apple', 'netflix', 'microsoft'],
    reply: `🎯 **To land at FAANG**, focus on these pillars:

**1. DSA Mastery** — Solve 150-300 LeetCode problems. Prioritise: Arrays, Trees, Graphs, DP, Two Pointers, Sliding Window. Aim for Medium-Hard comfort.

**2. System Design** — For senior roles, this is 50% of the interview. Study: Consistent Hashing, CAP Theorem, Load Balancing, Database sharding, Caching (Redis), Message Queues (Kafka).

**3. Behavioural** — Use the STAR format. Prepare 8-10 stories covering: leadership, conflict, failure, impact. FAANG loves "Thinks big" and "Bias for action."

**4. Timeline** — Plan 3-6 months of prep. Apply to multiple FAANG companies simultaneously — each has a 12-month reapplication window.

💡 Pro tip: Mock interviews on Interviewing.io or Pramp are hugely underrated. Simulate real pressure.`,
  },
  {
    keys: ['salary', 'negotiate', 'compensation', 'offer', 'raise', 'pay', 'money'],
    reply: `💰 **Salary Negotiation Playbook:**

**Never accept the first offer.** 85% of employers have flexibility.

**Step 1 — Research:** Use Levels.fyi (tech), Glassdoor, and LinkedIn Salary. Know your market rate by YOE, role, and city.

**Step 2 — The counter:** "Thank you for the offer! Based on my research and experience, I was expecting something closer to [X]. Is there flexibility?" Always give a number 10-15% above your target.

**Step 3 — Negotiate the full package:** Base, bonus, equity (RSUs/options), signing bonus, remote policy, extra PTO. Equity often beats base.

**Step 4 — Competing offers:** Even a competing interview invite can boost your leverage. "I'm in late-stage interviews with another company" is a powerful signal.

📈 Average increase from negotiating: **15-20%** more total comp. Never skip this step.`,
  },
  {
    keys: ['senior', 'staff', 'principal', 'lead', 'promotion', 'level up'],
    reply: `🚀 **How to Break Into Senior Engineering:**

The jump from mid to senior is about **scope and impact**, not just technical skill.

**What seniors do differently:**
- Own problems end-to-end — from ambiguous requirement to production monitoring
- Mentor others proactively, not just when asked
- Write design docs that other teams rely on
- Push back on unclear requirements instead of just executing
- Think in systems — "What breaks at 10x scale?"

**Tactical steps:**
1. Identify a high-visibility project and volunteer to lead it
2. Write a technical RFC/design doc and get buy-in
3. Ask your manager: "What would Senior look like for me in 6 months?" Get specifics in writing
4. Track your impact with metrics ($, latency, reliability, team velocity)

**Timeline:** Most people hit Senior at 4-7 YOE. But YOE matters less than scope and evidence.`,
  },
  {
    keys: ['system design', 'architecture', 'design', 'scalab', 'distributed'],
    reply: `🏗️ **System Design Interview Guide:**

**The Framework (use every time):**
1. **Clarify requirements** — functional + non-functional (scale, latency, consistency)
2. **Estimate scale** — DAU, QPS, storage requirements
3. **High-level design** — Draw components: client → load balancer → API servers → DB → cache
4. **Deep dive** — Focus on the hardest parts (data model, bottlenecks)
5. **Trade-offs** — Show you understand CAP, consistency vs availability

**Must-know components:**
- **CDN** — Static assets, global low latency
- **Load Balancer** — Round-robin, consistent hashing, health checks
- **Cache (Redis)** — Read-through, write-through, TTL, cache invalidation
- **Message Queue (Kafka)** — Async processing, fan-out, durability
- **Database** — SQL vs NoSQL trade-offs, sharding strategies, replication

**Practice these:** URL Shortener, Twitter Feed, Uber, WhatsApp, Netflix, Google Docs

Recommended: Alex Xu's "System Design Interview" books (Vol 1 & 2).`,
  },
  {
    keys: ['learn', 'roadmap', 'next', 'skill', 'study', 'improve', 'what should'],
    reply: `📚 **Personalised Learning Roadmap (2024-2025):**

Based on market demand trends, here's what to prioritise:

**High-value skills right now:**
- **TypeScript** — Non-negotiable for frontend/full-stack. Adds 20%+ to salary.
- **AWS/Cloud** — Even basic S3, EC2, Lambda knowledge opens doors
- **System Design** — Required at mid-senior level everywhere
- **Python** — AI/ML adjacent roles, scripting, data pipelines

**Learning Stack (from 0 to hired):**
1. Pick ONE language to master (JS/TS or Python)
2. Build 3 real projects — aim for complexity (auth, DB, deployment)
3. Open source: 1 PR per month to visible projects
4. Document everything: blog posts, GitHub READMEs, LinkedIn updates

**Free resources:**
- Roadmap.sh — Visual learning paths
- CS50 (Harvard) — Fundamentals done right
- The Odin Project — Full stack web dev
- Neetcode.io — DSA for interviews

💡 Build → Document → Share. That loop beats grinding courses alone.`,
  },
  {
    keys: ['resume', 'cv', 'portfolio', 'linkedin'],
    reply: `📄 **Resume & Portfolio Checklist:**

**ATS-proof your resume:**
- Use simple formatting — no tables, columns, or graphics
- Mirror keywords from the job description
- One page for < 8 YOE, two max for senior+

**Impact-driven bullets (STAR format):**
❌ "Built a React dashboard"
✅ "Built a real-time React dashboard serving 50k daily users, reducing ops incident response time by 40%"

**Every bullet should have:** Action verb → What → Impact → Number

**Portfolio essentials:**
- 2-3 full-stack projects with live demos + GitHub links
- A README that explains what, why, and how
- Deployed — Vercel, Railway, Render are free

**LinkedIn:** "Open to Work" banner, 500+ connections, skills endorsed, 3 recommendations from colleagues. Post once/week about tech.

🎯 Aim for ATS score > 80% on every application (use Jobscan to check).`,
  },
  {
    keys: ['interview', 'prepare', 'coding', 'leetcode', 'dsa', 'algorithm'],
    reply: `💻 **Technical Interview Prep Plan:**

**8-week structured plan:**

**Weeks 1-2: Foundations**
- Arrays, Strings, Hash Maps, Two Pointers, Sliding Window
- Target: 30 Easy + 10 Medium problems

**Weeks 3-4: Trees & Graphs**
- Binary Trees, BST, BFS, DFS, Backtracking
- Target: 25 Medium problems

**Weeks 5-6: Advanced**
- Dynamic Programming, Heaps, Tries, Union-Find
- Target: 20 Medium + 10 Hard problems

**Weeks 7-8: Mock Interviews + Review**
- Full mock interviews on Pramp / Interviewing.io
- Timed practice: 20-25 min per problem

**Top 5 patterns by frequency:**
1. Sliding Window
2. Two Pointers
3. Tree BFS/DFS
4. Dynamic Programming
5. Binary Search

**FAANG target:** Solve ~200 problems total, comfortable with Mediums.`,
  },
  {
    keys: ['network', 'connect', 'referral', 'linkedin message', 'reach out'],
    reply: `🤝 **Networking That Actually Works:**

**The cold message template (high response rate):**

"Hi [Name], I noticed you work at [Company] as a [Role] — I'm currently [your situation] and exploring opportunities in [domain]. I'd love to hear about your experience there and any advice you have. Happy to keep it to 20 minutes! No worries if you're swamped."

**Key principles:**
- **Give before you ask** — comment on their posts, share useful resources first
- **Warm intros beat cold messages** 10x — find mutual connections
- **Be specific** — "I saw your talk on distributed systems" beats "I liked your profile"

**Where to network:**
- LinkedIn (DM after engaging with their posts)
- Local meetups / tech conferences
- Open source communities
- Discord servers for your tech stack

**The referral game:** An employee referral increases your interview chances by 6-9x at large companies. Getting one is worth 2 weeks of cold applying.`,
  },
  {
    keys: ['startup', 'founding', 'entrepreneur', 'own company', 'side project'],
    reply: `🚀 **Tech Career at a Startup vs FAANG:**

**Startup pros:**
- Massive scope early — you'll touch infra, product, and customers
- Equity upside (rare but real — look for Series A+ with traction)
- Faster promotions — 12-18 months vs 3-4 years at big tech
- Direct product impact visible immediately

**Startup cons:**
- Higher risk — 90% of startups fail within 10 years
- Less mentorship, established engineering culture
- Salary usually 10-30% below FAANG

**What to evaluate when joining a startup:**
1. Runway — "How many months of runway do you have?"
2. Revenue/growth — MRR, YoY growth rate
3. Founders — Have they built before? Domain expertise?
4. Equity — Shares outstanding, vesting cliff, strike price vs 409A

**Side projects:** Even if you work full-time, 5 hours/week on a side project compounds massively. Ship something, learn distribution, and your skills grow faster.`,
  },
  {
    keys: ['remote', 'work from home', 'wfh', 'hybrid', 'relocation'],
    reply: `🌍 **Navigating Remote Work in 2024:**

**The market reality:** ~30% of tech jobs are fully remote post-COVID, down from 60% in 2021. But the best remote roles pay San Francisco rates globally.

**How to land remote-first jobs:**
- Target companies with "remote-first" culture (not just "remote-friendly")
- Check: Remote.co, We Work Remotely, Arc.dev, Toptal
- Build async communication skills — clear written updates, documentation

**Async work skills that differentiate you:**
- Write excellent Slack/Notion updates (no "sync required" culture)
- Over-communicate progress and blockers in writing
- Time zone awareness — be responsive in a shared 4-hour window

**Negotiating remote:** At offer stage, ask: "Is this role eligible for full remote?" — easier to get a yes before you join than after.

**Location arbitrage:** Remote + HCOL salary + LCOL living = significant wealth acceleration. $150k in Austin ≈ $220k in SF, after taxes and cost of living.`,
  },
  {
    keys: ['burnout', 'stress', 'work life', 'toxic', 'quit', 'mental health'],
    reply: `🧘 **Dealing with Tech Burnout:**

Burnout is real and epidemic in engineering. Here's what actually helps:

**Immediate relief:**
- Take your PTO — actually disconnect, no Slack
- Identify the top 3 sources of stress and address one systematically
- Talk to your manager about workload — most managers prefer honesty to you quitting

**Structural fixes:**
- Set strict work hours and protect them
- "No meeting" blocks for deep work (Maker's Schedule)
- Automate repetitive tasks — if you're doing it twice, script it

**When to leave:** If the culture itself is toxic (not just a bad quarter), update your resume now. The job market for engineers is still strong. Don't wait until you're too depleted to job search effectively.

**Green flags in a new company:** Engineering-led culture, blameless post-mortems, psychological safety, sustainable on-call rotations.

Remember: **No job is worth your health.** Your skills travel with you — the company's problems don't have to.`,
  },
  {
    keys: ['open source', 'contribute', 'github', 'portfolio project'],
    reply: `🌟 **Open Source Contribution Strategy:**

**Why it works:** Visible code + reputation + network in one shot.

**How to start (without experience):**
1. **Start with issues labelled "good first issue"** — filter on GitHub
2. **Pick projects you already use** — motivation stays high
3. **Start small:** Fix a typo → Add a test → Fix a bug → Add a feature

**High-impact contribution path:**
- Fix a real bug (not docs) → gets noticed by maintainers
- Respond to issues — triage and reproduce bugs for maintainers
- Write missing tests — always needed, rarely fun, always merged

**Best places to find opportunities:**
- goodfirstissues.com
- up-for-grabs.net
- GitHub Explore → filter by language

**Portfolio impact:** 3-5 merged PRs to notable repos > 10 solo projects nobody uses. Hiring managers Google your GitHub.

🎯 Goal: One meaningful contribution per month. Compounding effect in 12 months is huge.`,
  },
]

const FALLBACK_REPLIES = [
  `Great question! As your AI career mentor, I'd say the most important thing is to **focus on outcomes over activities**. Track the impact of everything you do — job applications, learning, networking — and double down on what's working.\n\nWhat specific area would you like to dive deeper on? I can give you a detailed breakdown on anything from interview prep to salary negotiation to choosing your next tech stack. 🚀`,
  `That's something a lot of developers ask me about. The honest answer is that **consistency beats intensity**. 30 minutes of focused practice every day outperforms 8-hour weekend cramming sessions.\n\nTell me more about where you are right now — your years of experience, current stack, and target role — and I can give you a much more personalised recommendation. 💡`,
  `Really important topic! Here's my take: **the best career move is usually the one that maximises your learning rate**, not your immediate salary. Early in your career especially, optimise for scope, mentorship quality, and the calibre of your teammates.\n\nIs there a specific decision you're weighing? I can help you think through the trade-offs. 🎯`,
]

function getLocalReply(userMessage) {
  const lower = userMessage.toLowerCase()
  for (const { keys, reply } of RESPONSES) {
    if (keys.some(k => lower.includes(k))) return reply
  }
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]
}

// ── Word-by-word streaming effect ─────────────────────────────────────────────
function streamText(text, onChunk, onDone) {
  const words = text.split(' ')
  let i = 0
  const interval = setInterval(() => {
    if (i < words.length) {
      onChunk(words.slice(0, i + 1).join(' '))
      i++
    } else {
      clearInterval(interval)
      onDone()
    }
  }, 28)
  return () => clearInterval(interval)
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  "What skills do I need for FAANG? 🎯",
  "How do I negotiate a salary? 💰",
  "How to get my first senior role? 🚀",
  "Best way to prepare for system design? 🏗️",
  "How do I break into open source? 🌟",
  "How to avoid burnout? 🧘",
]

// ── Typing indicator ──────────────────────────────────────────────────────────
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

function PulseAvatar() {
  return (
    <div style={{
      width:32, height:32, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(135deg,#6366f1,#a78bfa)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:14, fontWeight:800, color:'#fff',
      boxShadow:'0 0 14px rgba(99,102,241,0.5)',
    }}>P</div>
  )
}

function MessageBubble({ msg, streaming }) {
  const isUser = msg.role === 'user'
  // Convert **bold** markdown to styled spans
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color:'#e2e8f0', fontWeight:700 }}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }
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
        }}>👤</div>
      )}
      <div style={{
        maxWidth:'75%',
        background: isUser ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.05)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding:'12px 16px',
        boxShadow: isUser ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
      }}>
        <p style={{
          fontSize:14, lineHeight:1.75, margin:0,
          color: isUser ? '#e0e7ff' : '#cbd5e1',
          whiteSpace:'pre-wrap', wordBreak:'break-word',
        }}>
          {renderContent(msg.content)}
          {streaming && <span style={{ display:'inline-block', width:2, height:14, background:'#818cf8', marginLeft:2, animation:'dp-blink 0.8s step-end infinite', verticalAlign:'middle' }}/>}
        </p>
        <p style={{ fontSize:10, color: isUser ? 'rgba(224,231,255,0.5)' : '#475569', margin:'6px 0 0', textAlign:'right' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AICareerCoachPage() {
  const [messages,   setMessages]  = useState([])
  const [input,      setInput]     = useState('')
  const [loading,    setLoading]   = useState(false)
  const [streaming,  setStreaming] = useState(false)
  const [msgUsed,    setMsgUsed]   = useState(0)
  const MSG_LIMIT = 50
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const stopStream     = useRef(null)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  useEffect(() => { inputRef.current?.focus() }, [])

  const sendMessage = useCallback((text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading || msgUsed >= MSG_LIMIT) return

    const userMsg = { role:'user', content:trimmed, ts:Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setMsgUsed(n => n + 1)

    // Simulate thinking delay then stream response
    setTimeout(() => {
      const reply = getLocalReply(trimmed)
      const aiMsg = { role:'assistant', content:'', ts:Date.now() }
      setMessages(prev => [...prev, aiMsg])
      setLoading(false)
      setStreaming(true)

      stopStream.current = streamText(
        reply,
        (partial) => setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: partial }
          return next
        }),
        () => {
          setStreaming(false)
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      )
    }, 800 + Math.random() * 400)
  }, [input, loading, msgUsed])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const remaining = Math.max(0, MSG_LIMIT - msgUsed)

  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-pulse{0%,80%,100%{transform:scale(0);opacity:0.3}40%{transform:scale(1);opacity:1}}
        @keyframes dp-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dp-spin{to{transform:rotate(360deg)}}
        @keyframes dp-blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ borderRadius:'50%', boxShadow:'0 0 20px rgba(99,102,241,0.4)', display:'inline-block' }}>
            <PulseAvatar />
          </div>
          <div>
            <h1 style={S.title}>Pulse — AI Career Coach</h1>
            <p style={S.subtitle}>Senior engineer mentor · Available 24/7</p>
          </div>
        </div>
        <div style={S.limitBadge}>
          <span style={{ color: remaining <= 5 ? '#ef4444' : '#94a3b8', fontSize:12 }}>
            {remaining} message{remaining !== 1 ? 's' : ''} left today
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div style={S.messagesArea}>
        {messages.length === 0 && !loading && (
          <div style={{ padding:'40px 0', animation:'dp-fadein 0.4s ease-out' }}>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ margin:'0 auto 16px', width:64, height:64, borderRadius:'50%', boxShadow:'0 0 20px rgba(99,102,241,0.4)', display:'inline-flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#6366f1,#a78bfa)', fontSize:28, fontWeight:800, color:'#fff' }}>P</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', margin:'0 0 6px' }}>
                Hey {user?.full_name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p style={{ fontSize:14, color:'#64748b', maxWidth:400, margin:'0 auto' }}>
                I'm Pulse, your AI career mentor. Ask me anything about your career, skills, job search, or interviews.
              </p>
            </div>
            <p style={{ fontSize:12, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, fontWeight:600 }}>Quick prompts</p>
            <div style={S.promptGrid}>
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)} style={S.promptChip}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} streaming={streaming && i === messages.length - 1 && m.role === 'assistant'} />
        ))}

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

      {/* Input bar */}
      <div style={S.inputBar}>
        <div style={S.inputRow}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={msgUsed >= MSG_LIMIT ? "Daily limit reached. Come back tomorrow." : "Ask Pulse anything… (Enter to send, Shift+Enter for newline)"}
            rows={1}
            disabled={loading || streaming || msgUsed >= MSG_LIMIT}
            style={{ ...S.textarea, opacity: msgUsed >= MSG_LIMIT ? 0.5 : 1 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || streaming || msgUsed >= MSG_LIMIT}
            style={{
              ...S.sendBtn,
              opacity: (!input.trim() || loading || streaming || msgUsed >= MSG_LIMIT) ? 0.4 : 1,
              cursor:  (!input.trim() || loading || streaming || msgUsed >= MSG_LIMIT) ? 'not-allowed' : 'pointer',
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
  page: { fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', display:'flex', flexDirection:'column', height:'calc(100vh - 80px)', overflow:'hidden' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 0 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 },
  title:   { fontSize:18, fontWeight:800, margin:0, letterSpacing:'-0.3px' },
  subtitle:{ fontSize:12, color:'#64748b', margin:'2px 0 0' },
  limitBadge: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:99, padding:'6px 14px' },
  messagesArea: { flex:1, overflowY:'auto', padding:'20px 0', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.07) transparent' },
  promptGrid: { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, maxWidth:600 },
  promptChip: { background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px', color:'#c7d2fe', fontSize:13, cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:"'Inter',system-ui,sans-serif" },
  inputBar: { flexShrink:0, padding:'16px 0 0', borderTop:'1px solid rgba(255,255,255,0.06)' },
  inputRow: { display:'flex', gap:10, alignItems:'flex-end' },
  textarea: { flex:1, padding:'12px 16px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#f1f5f9', fontSize:14, lineHeight:1.6, outline:'none', resize:'none', fontFamily:"'Inter',system-ui,sans-serif", maxHeight:120, overflowY:'auto' },
  sendBtn: { width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:20, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(99,102,241,0.4)', flexShrink:0, transition:'opacity 0.15s' },
  spinnerInline: { display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'dp-spin 0.7s linear infinite' },
}
