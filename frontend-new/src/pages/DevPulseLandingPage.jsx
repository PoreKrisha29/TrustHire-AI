/**
 * pages/DevPulseLandingPage.jsx
 *
 * DevPulse AI — Full marketing landing page.
 * Sections: Hero → Stats → Features → How It Works → Pricing → Footer CTA
 * Sticky navbar · Dark glassmorphism · Vanilla CSS-in-JS
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useThemeStore from '@/stores/theme.store'

// ── Animated grid background ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={S.gridBg} aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute',inset:0 }}>
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
      {/* Gradient overlay */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)',
      }}/>
    </div>
  )
}

// ── Floating particle dots ────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    left: `${5 + (i * 4.7) % 90}%`,
    top: `${10 + (i * 7.3) % 80}%`,
    size: 2 + (i % 3),
    delay: i * 0.3,
    dur: 3 + (i % 4),
  }))
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }} aria-hidden>
      {particles.map((p, i) => (
        <div key={i} style={{
          position:'absolute', left:p.left, top:p.top,
          width:p.size, height:p.size, borderRadius:'50%',
          background:'rgba(129,140,248,0.6)',
          animation:`dp-float ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
        }}/>
      ))}
    </div>
  )
}

// ── Dashboard preview mockup (CSS art) ───────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={S.mockup}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }}/>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b' }}/>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }}/>
        <div style={{ flex:1, height:6, borderRadius:99, background:'rgba(255,255,255,0.08)', marginLeft:8 }}/>
      </div>
      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
        {[
          { label:'Career Score', val:'84', color:'#22c55e' },
          { label:'Level', val:'Senior', color:'#a78bfa' },
          { label:'XP', val:'3,400', color:'#818cf8' },
        ].map(s => (
          <div key={s.label} style={S.mockCard}>
            <p style={{ fontSize:14, fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
            <p style={{ fontSize:9, color:'#475569', margin:0 }}>{s.label}</p>
          </div>
        ))}
      </div>
      {/* Skill bars */}
      {[
        { label:'React', pct:88, color:'#818cf8' },
        { label:'Python', pct:74, color:'#34d399' },
        { label:'Docker', pct:61, color:'#f59e0b' },
      ].map(s => (
        <div key={s.label} style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:10, color:'#94a3b8' }}>{s.label}</span>
            <span style={{ fontSize:10, color:s.color }}>{s.pct}%</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.07)' }}>
            <div style={{ height:'100%', width:`${s.pct}%`, borderRadius:99, background:s.color, boxShadow:`0 0 6px ${s.color}` }}/>
          </div>
        </div>
      ))}
      {/* Badge row */}
      <div style={{ display:'flex', gap:6, marginTop:12 }}>
        {['🏆 React', '⚔️ 12 Battles', '🎓 5 Certs'].map(b => (
          <span key={b} style={{ fontSize:9, color:'#818cf8', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:99, padding:'3px 8px' }}>{b}</span>
        ))}
      </div>
    </div>
  )
}

// ── Sticky navbar ─────────────────────────────────────────────────────────────
function Navbar({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav style={{ ...S.navbar, background: scrolled ? 'rgba(8,11,20,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={S.navLogo}>⚡</div>
        <span style={S.navBrand}>DevPulse AI</span>
      </div>
      <div style={S.navLinks}>
        {['Features','Pricing'].map(l => (
          <a key={l} href={`#${l.toLowerCase()}`} style={S.navLink}>{l}</a>
        ))}
        <button onClick={() => navigate('/login')} style={S.navLinkBtn}>Login</button>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width:34, height:34, borderRadius:9,
            border:'1px solid rgba(255,255,255,0.15)',
            background:'rgba(255,255,255,0.06)',
            cursor:'pointer', fontSize:16,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'transform 0.15s',
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button onClick={() => navigate('/register')} style={S.getStartedBtn}>Get Started →</button>
      </div>
    </nav>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:'📄', title:'Resume Forge', desc:'AI rewrites your resume bullets in STAR format, optimized for each job and ATS systems.', color:'#818cf8' },
  { icon:'🧬', title:'Skill Genome', desc:'Visual map of every skill you know. Self-mark, certify, and discover gaps at a glance.', color:'#34d399' },
  { icon:'🧠', title:'AI Career Coach', desc:'Pulse — your personal senior engineer mentor. Concise, direct, 24/7.', color:'#a78bfa' },
  { icon:'🎤', title:'Mock Interviews', desc:'Practice technical, HR, and system design rounds. Get real-time AI scoring and feedback.', color:'#22d3ee' },
  { icon:'⚔️', title:'Skill Battle', desc:'Real-time 1v1 MCQ battles with other devs. Win XP, climb the leaderboard.', color:'#f59e0b' },
  { icon:'📊', title:'Market Pulse', desc:'Live salary benchmarks, trending skill demand, and your personalized skill gap analysis.', color:'#f472b6' },
]

// ── Pricing plan card ─────────────────────────────────────────────────────────
function PlanCard({ name, price, features, cta, highlight, navigate }) {
  return (
    <div style={{
      ...S.planCard,
      border: highlight ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.07)',
      background: highlight ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
      boxShadow: highlight ? '0 0 40px rgba(99,102,241,0.2)' : 'none',
    }}>
      {highlight && <div style={S.popularBadge}>Most Popular</div>}
      <p style={{ fontSize:14, fontWeight:700, color:'#94a3b8', margin:'0 0 8px' }}>{name}</p>
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:20 }}>
        {price === 0
          ? <span style={{ fontSize:36, fontWeight:800, color:'#f1f5f9' }}>Free</span>
          : <>
              <span style={{ fontSize:36, fontWeight:800, color:'#f1f5f9' }}>${price}</span>
              <span style={{ fontSize:14, color:'#64748b' }}>/mo</span>
            </>}
      </div>
      <ul style={{ listStyle:'none', margin:'0 0 24px', padding:0, display:'flex', flexDirection:'column', gap:10 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display:'flex', gap:8, fontSize:13, color:'#94a3b8' }}>
            <span style={{ color:'#22c55e', flexShrink:0 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/register')}
        style={{ ...S.planBtn, background: highlight ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)', border: highlight ? 'none' : '1px solid rgba(255,255,255,0.1)', boxShadow: highlight ? '0 4px 20px rgba(99,102,241,0.4)' : 'none' }}
      >
        {cta}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DevPulseLandingPage() {
  const navigate = useNavigate()

  return (
    <div style={S.page}>
      <style>{`
        @keyframes dp-float { from{transform:translateY(0)} to{transform:translateY(-12px)} }
        @keyframes dp-fadein { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dp-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        * { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior: smooth }
        ::-webkit-scrollbar { width:5px } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px }
        a { text-decoration:none }
      `}</style>

      <Navbar navigate={navigate} />

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section style={S.hero}>
        <GridBackground />
        <Particles />
        <div style={S.heroInner}>
          <div style={S.heroLeft}>
            <div style={S.heroBadge}>⚡ AI-Powered Career OS for Developers</div>
            <h1 style={S.heroH1}>
              Level Up Your<br/>
              <span style={S.gradientText}>Dev Career</span>
            </h1>
            <p style={S.heroSub}>
              AI-powered resume, skill genome, mock interviews, and real-time skill battles —
              all in one platform built for engineers.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button onClick={() => navigate('/register')} style={S.ctaPrimary}>
                Get Started Free →
              </button>
              <a href="#features" style={S.ctaGhost}>
                See How It Works ↓
              </a>
            </div>
            <p style={{ fontSize:12, color:'#334155', marginTop:14 }}>No credit card required · Always free tier</p>
          </div>
          <div style={S.heroRight}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Section 2: Stats bar ─────────────────────────────────────────── */}
      <section style={S.statsBar}>
        {[
          { val:'10,000+', label:'Developers' },
          { val:'500+',    label:'Tracked Skills' },
          { val:'50,000+', label:'Certs Issued' },
        ].map(s => (
          <div key={s.label} style={S.statItem}>
            <p style={S.statVal}>{s.val}</p>
            <p style={S.statLabel}>{s.label}</p>
          </div>
        ))}
      </section>

      {/* ── Section 3: Features grid ─────────────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={S.sectionInner}>
          <p style={S.sectionEyebrow}>Everything you need</p>
          <h2 style={S.sectionH2}>One platform. Full career stack.</h2>
          <div style={S.featGrid}>
            {FEATURES.map(f => (
              <div key={f.title} style={S.featCard}>
                <div style={{ ...S.featIcon, background:`${f.color}18`, border:`1px solid ${f.color}44` }}>
                  <span style={{ fontSize:24 }}>{f.icon}</span>
                </div>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:'0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: How it works ──────────────────────────────────────── */}
      <section style={{ ...S.section, background:'rgba(255,255,255,0.02)' }}>
        <div style={S.sectionInner}>
          <p style={S.sectionEyebrow}>How it works</p>
          <h2 style={S.sectionH2}>Three steps to career growth</h2>
          <div style={S.stepsRow}>
            {[
              { n:'01', icon:'📄', title:'Upload Resume', desc:'AI parses your resume, scores it against ATS, and rewrites your bullets for maximum impact.' },
              { n:'02', icon:'🎓', title:'Learn & Certify', desc:'Take AI-generated quizzes, earn XP, and get verified skill certificates for your portfolio.' },
              { n:'03', icon:'⚔️', title:'Battle & Grow', desc:'Compete in real-time skill battles, climb the leaderboard, and attract top tech recruiters.' },
            ].map((step, i) => (
              <div key={step.n} style={S.stepCard}>
                <div style={S.stepNum}>{step.n}</div>
                <div style={{ fontSize:32, marginBottom:12 }}>{step.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:'0 0 8px' }}>{step.title}</h3>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, margin:0 }}>{step.desc}</p>
                {i < 2 && <div style={S.stepArrow}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Pricing ───────────────────────────────────────────── */}
      <section id="pricing" style={S.section}>
        <div style={S.sectionInner}>
          <p style={S.sectionEyebrow}>Pricing</p>
          <h2 style={S.sectionH2}>Start free. Scale when ready.</h2>
          <div style={S.pricingGrid}>
            <PlanCard
              name="Free" price={0} highlight={false} navigate={navigate}
              cta="Get Started Free"
              features={[
                'Resume upload & ATS scoring',
                '5 quiz attempts per day',
                '10 AI coach messages/day',
                'Public portfolio & cert page',
                'Battle Arena access',
                'Skill Genome mapping',
              ]}
            />
            <PlanCard
              name="Premium" price={12} highlight={true} navigate={navigate}
              cta="Upgrade to Premium"
              features={[
                'Everything in Free',
                'Unlimited quiz attempts',
                'Unlimited AI coaching',
                'Priority ATS scoring',
                'Custom resume templates',
                'PDF resume export',
                'Advanced Market Intel',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Section 6: Footer CTA ────────────────────────────────────────── */}
      <section style={S.footerCta}>
        <div style={S.footerCtaGlow}/>
        <h2 style={{ fontSize:32, fontWeight:800, color:'#f1f5f9', margin:'0 0 12px', letterSpacing:'-0.5px' }}>
          Start building your dev career today
        </h2>
        <p style={{ fontSize:16, color:'#64748b', margin:'0 0 28px' }}>
          Join 10,000+ developers who are levelling up with AI.
        </p>
        <button onClick={() => navigate('/register')} style={S.ctaPrimary}>
          Sign Up Free — No Card Required →
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={S.navLogo}>⚡</div>
          <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>DevPulse AI</span>
        </div>
        <p style={{ fontSize:12, color:'#334155' }}>
          © {new Date().getFullYear()} DevPulse AI · Built for engineers, by engineers.
        </p>
      </footer>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { background:'#080b14', color:'#f1f5f9', fontFamily:"'Inter',system-ui,sans-serif", overflowX:'hidden' },

  // Navbar
  navbar:{
    position:'fixed', top:0, left:0, right:0, zIndex:100,
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 5%', height:64, transition:'background 0.3s',
    borderBottom:'1px solid rgba(255,255,255,0.04)',
  },
  navLogo:{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 0 12px rgba(99,102,241,0.4)' },
  navBrand:{ fontSize:16, fontWeight:800, color:'#f1f5f9' },
  navLinks:{ display:'flex', alignItems:'center', gap:24 },
  navLink:{ fontSize:13, color:'#64748b', textDecoration:'none', transition:'color 0.15s', fontFamily:"'Inter',system-ui,sans-serif" },
  navLinkBtn:{ fontSize:13, color:'#94a3b8', background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif" },
  getStartedBtn:{ fontSize:13, fontWeight:600, color:'#fff', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif", boxShadow:'0 0 16px rgba(99,102,241,0.4)' },

  // Hero
  hero:{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden', paddingTop:64 },
  gridBg:{ position:'absolute', inset:0, overflow:'hidden' },
  heroInner:{ maxWidth:1200, margin:'0 auto', padding:'80px 5%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center', width:'100%', position:'relative', zIndex:1 },
  heroLeft:{ display:'flex', flexDirection:'column', gap:20, animation:'dp-fadein 0.6s ease-out' },
  heroRight:{ display:'flex', justifyContent:'center', animation:'dp-fadein 0.8s ease-out' },
  heroBadge:{ fontSize:12, color:'#818cf8', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:99, padding:'6px 14px', display:'inline-block', width:'fit-content', fontWeight:600 },
  heroH1:{ fontSize:56, fontWeight:900, lineHeight:1.08, letterSpacing:'-1.5px' },
  gradientText:{ background:'linear-gradient(135deg,#6366f1,#a78bfa,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  heroSub:{ fontSize:18, color:'#64748b', lineHeight:1.7, maxWidth:480 },
  ctaPrimary:{ padding:'14px 28px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 28px rgba(99,102,241,0.5)', fontFamily:"'Inter',system-ui,sans-serif", transition:'transform 0.15s', whiteSpace:'nowrap' },
  ctaGhost:{ padding:'14px 24px', background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, color:'#94a3b8', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif", display:'flex', alignItems:'center', whiteSpace:'nowrap', textDecoration:'none' },

  // Mockup
  mockup:{ width:300, background:'rgba(15,23,42,0.9)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:20, boxShadow:'0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.2)', animation:'dp-glow 3s ease-in-out infinite' },
  mockCard:{ background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'10px', textAlign:'center' },

  // Stats
  statsBar:{ borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)', display:'flex', justifyContent:'center', gap:80, padding:'28px 5%' },
  statItem:{ textAlign:'center' },
  statVal:{ fontSize:28, fontWeight:900, background:'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 },
  statLabel:{ fontSize:13, color:'#64748b' },

  // Section
  section:{ padding:'80px 0' },
  sectionInner:{ maxWidth:1200, margin:'0 auto', padding:'0 5%' },
  sectionEyebrow:{ fontSize:12, fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 },
  sectionH2:{ fontSize:36, fontWeight:800, color:'#f1f5f9', marginBottom:48, letterSpacing:'-0.5px' },

  // Features
  featGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 },
  featCard:{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'24px', transition:'border-color 0.2s, transform 0.2s' },
  featIcon:{ width:52, height:52, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 },

  // Steps
  stepsRow:{ display:'flex', alignItems:'flex-start', gap:0, position:'relative' },
  stepCard:{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'28px 24px', textAlign:'center', position:'relative' },
  stepNum:{ fontSize:11, fontWeight:800, color:'#6366f1', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:99, padding:'3px 10px', display:'inline-block', marginBottom:16 },
  stepArrow:{ position:'absolute', right:-16, top:'50%', transform:'translateY(-50%)', fontSize:20, color:'#334155', zIndex:1, background:'#080b14', padding:'0 4px' },

  // Pricing
  pricingGrid:{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20, maxWidth:680 },
  planCard:{ borderRadius:16, padding:'28px', position:'relative', overflow:'hidden' },
  popularBadge:{ position:'absolute', top:16, right:16, fontSize:10, color:'#818cf8', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:99, padding:'3px 10px', fontWeight:700 },
  planBtn:{ width:'100%', padding:'12px', borderRadius:10, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif" },

  // Footer CTA
  footerCta:{ textAlign:'center', padding:'100px 5%', position:'relative', overflow:'hidden', borderTop:'1px solid rgba(255,255,255,0.05)' },
  footerCtaGlow:{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(99,102,241,0.15),transparent)', pointerEvents:'none' },
  footer:{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'28px 5%', textAlign:'center' },
}
