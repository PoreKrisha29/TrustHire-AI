/**
 * pages/dashboard/LearnCertifyPage.jsx
 *
 * DevPulse AI — Learn & Certify
 * State machine: "catalog" → "quiz" → "results"
 * Fully client-side: questions from local bank, certs in localStorage.
 * Dark glassmorphism, vanilla CSS-in-JS.
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

// ── localStorage cert helpers ────────────────────────────────────────────────
const CERTS_KEY = 'dp_certs_v1'
function loadCerts() {
  try { return JSON.parse(localStorage.getItem(CERTS_KEY) || '[]') } catch { return [] }
}
function saveCert(cert) {
  const certs = loadCerts().filter(c => c.skill_name !== cert.skill_name)
  localStorage.setItem(CERTS_KEY, JSON.stringify([cert, ...certs]))
}

// ── Skill catalog ────────────────────────────────────────────────────────────
const SKILL_CATALOG = [
  { skill: 'React',         domain: 'Web Frontend', difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'TypeScript',    domain: 'Web Frontend', difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Next.js',       domain: 'Web Frontend', difficulty: 'hard',   time: '10 min', xp: 200 },
  { skill: 'CSS3',          domain: 'Web Frontend', difficulty: 'easy',   time: '6 min',  xp: 200 },
  { skill: 'Python',        domain: 'Backend',      difficulty: 'easy',   time: '6 min',  xp: 200 },
  { skill: 'Django',        domain: 'Backend',      difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'FastAPI',       domain: 'Backend',      difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Node.js',       domain: 'Backend',      difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'PostgreSQL',    domain: 'Databases',    difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'MongoDB',       domain: 'Databases',    difficulty: 'easy',   time: '6 min',  xp: 200 },
  { skill: 'Redis',         domain: 'Databases',    difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Docker',        domain: 'DevOps',       difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Kubernetes',    domain: 'DevOps',       difficulty: 'hard',   time: '10 min', xp: 200 },
  { skill: 'Git',           domain: 'Tools',        difficulty: 'easy',   time: '5 min',  xp: 200 },
  { skill: 'System Design', domain: 'Tools',        difficulty: 'hard',   time: '12 min', xp: 200 },
  { skill: 'React Native',  domain: 'Mobile',       difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Pandas',        domain: 'Data / ML',    difficulty: 'medium', time: '8 min',  xp: 200 },
  { skill: 'Scikit-learn',  domain: 'Data / ML',    difficulty: 'hard',   time: '10 min', xp: 200 },
]

// ── Question bank (5 per skill, answer index 0-based) ────────────────────────
const QUESTION_BANK = {
  'React': [
    { question: 'What hook is used to manage local state in a functional component?', options: ['useEffect', 'useState', 'useRef', 'useContext'], answer: 1, explanation: 'useState is the primary hook for local component state.' },
    { question: 'What does the dependency array in useEffect control?', options: ['Component styling', 'When the effect re-runs', 'Props validation', 'Server requests'], answer: 1, explanation: 'The dependency array determines when the effect executes.' },
    { question: 'What is the virtual DOM used for in React?', options: ['Direct DOM manipulation', 'Server-side rendering', 'Efficiently updating the real DOM', 'Styling components'], answer: 2, explanation: 'React uses the virtual DOM to batch and minimise real DOM updates.' },
    { question: 'What is the purpose of React keys in lists?', options: ['Styling list items', 'Tracking list items for efficient re-renders', 'Sorting list items', 'Filtering list items'], answer: 1, explanation: 'Keys help React identify which items changed, added, or removed.' },
    { question: 'Which method correctly lifts state up?', options: ['Passing state to child via props', 'Moving state to a common parent and passing callbacks', 'Using global variables', 'Using localStorage'], answer: 1, explanation: 'Lifting state means moving it to the closest common ancestor.' },
  ],
  'TypeScript': [
    { question: 'What keyword is used to define a TypeScript interface?', options: ['type', 'interface', 'class', 'struct'], answer: 1, explanation: 'interface defines the shape of an object in TypeScript.' },
    { question: 'What does the "?" operator mean after a property name?', options: ['Required property', 'Optional property', 'Nullable type', 'Generic type'], answer: 1, explanation: 'The ? marks a property as optional.' },
    { question: 'What is a union type in TypeScript?', options: ['A type that is both A and B', 'A type that can be A or B', 'An array type', 'A class type'], answer: 1, explanation: 'Union types (A | B) allow a value to be one of several types.' },
    { question: 'How do you assert a type in TypeScript?', options: ['value as Type', 'type(value)', 'cast<Type>(value)', 'value::Type'], answer: 0, explanation: 'Type assertions use the "as" keyword.' },
    { question: 'What does the "readonly" modifier do?', options: ['Makes a property invisible', 'Prevents a property from being changed', 'Makes a property optional', 'Converts to string'], answer: 1, explanation: 'readonly prevents reassignment after initial assignment.' },
  ],
  'Python': [
    { question: 'What is the output of: print(type([]))?', options: ['<class list>', "<class 'list'>", 'list', 'Array'], answer: 1, explanation: "type() returns the class object, printed as <class 'list'>" },
    { question: 'Which keyword is used for list comprehension?', options: ['for', 'map', 'filter', 'lambda'], answer: 0, explanation: 'List comprehensions use for: [x for x in range(10)]' },
    { question: 'What does the "self" parameter refer to?', options: ['The class itself', 'The instance of the class', 'The parent class', 'A static method'], answer: 1, explanation: 'self refers to the current instance of the class.' },
    { question: 'Which Python data structure is immutable?', options: ['list', 'dict', 'tuple', 'set'], answer: 2, explanation: 'Tuples are immutable — they cannot be changed after creation.' },
    { question: 'What does pip stand for?', options: ['Python Installation Package', 'Pip Installs Packages', 'Python Index Package', 'Package Installer for Python'], answer: 3, explanation: 'pip stands for "Package Installer for Python".' },
  ],
  'Docker': [
    { question: 'What does a Dockerfile define?', options: ['Network configuration', 'Instructions to build a Docker image', 'Container runtime settings', 'Volume mounts only'], answer: 1, explanation: 'A Dockerfile contains all commands to assemble an image.' },
    { question: 'Which command runs a Docker container?', options: ['docker start', 'docker run', 'docker exec', 'docker build'], answer: 1, explanation: 'docker run creates and starts a new container from an image.' },
    { question: 'What is a Docker volume used for?', options: ['Networking', 'Persisting data outside the container', 'Building images faster', 'Port mapping'], answer: 1, explanation: 'Volumes persist data independently of the container lifecycle.' },
    { question: 'What does docker-compose do?', options: ['Builds a single container', 'Defines and runs multi-container applications', 'Pushes images to a registry', 'Monitors container performance'], answer: 1, explanation: 'docker-compose orchestrates multiple containers via a YAML file.' },
    { question: 'What is the base layer in a Docker image called?', options: ['FROM layer', 'Base image', 'Root layer', 'Init layer'], answer: 1, explanation: 'The FROM instruction specifies the base image to build upon.' },
  ],
  'PostgreSQL': [
    { question: 'What SQL clause filters groups after aggregation?', options: ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'], answer: 2, explanation: 'HAVING filters after GROUP BY, WHERE filters before aggregation.' },
    { question: 'What does an INNER JOIN return?', options: ['All rows from left table', 'Matching rows from both tables', 'All rows from both tables', 'All rows from right table'], answer: 1, explanation: 'INNER JOIN returns only rows where the condition matches in both tables.' },
    { question: 'What is a primary key?', options: ['A foreign key reference', 'A unique identifier for each row', 'An indexed column', 'A nullable column'], answer: 1, explanation: 'Primary keys uniquely identify each row and cannot be NULL.' },
    { question: 'What does EXPLAIN do in PostgreSQL?', options: ['Lists all tables', 'Shows query execution plan', 'Creates an index', 'Copies data'], answer: 1, explanation: 'EXPLAIN shows how PostgreSQL plans to execute a query.' },
    { question: 'What data type stores JSON natively in PostgreSQL?', options: ['TEXT', 'VARCHAR', 'JSONB', 'BLOB'], answer: 2, explanation: 'JSONB stores JSON in a binary format for efficient querying.' },
  ],
  'Git': [
    { question: 'What does "git rebase" do?', options: ['Merges branches', 'Reapplies commits on top of another base', 'Deletes commits', 'Creates a branch'], answer: 1, explanation: 'Rebase moves a sequence of commits to a new base commit.' },
    { question: 'What command undoes the last commit but keeps changes staged?', options: ['git revert HEAD', 'git reset --soft HEAD~1', 'git checkout HEAD~1', 'git stash'], answer: 1, explanation: 'git reset --soft HEAD~1 undoes the commit but keeps changes staged.' },
    { question: 'What is a git stash?', options: ['A remote branch', 'A temporary shelf for uncommitted changes', 'A merge commit', 'A tag'], answer: 1, explanation: 'git stash saves changes temporarily so you can switch contexts.' },
    { question: 'What does "origin" refer to in git?', options: ['The first commit', 'The default remote repository name', 'The main branch', 'A local alias'], answer: 1, explanation: 'By convention, origin is the name of the remote you cloned from.' },
    { question: 'What does git cherry-pick do?', options: ['Selects files to stage', 'Applies a specific commit from another branch', 'Creates a new branch', 'Squashes commits'], answer: 1, explanation: 'cherry-pick applies the changes from a specific commit.' },
  ],
  'Node.js': [
    { question: 'What is the event loop in Node.js?', options: ['A DOM manipulation method', 'The mechanism that handles asynchronous operations', 'A templating engine', 'A database driver'], answer: 1, explanation: 'The event loop allows Node.js to perform non-blocking I/O.' },
    { question: 'What does "require" do in CommonJS?', options: ['Imports an ES module', 'Synchronously loads a module', 'Fetches a URL', 'Creates a class'], answer: 1, explanation: 'require() synchronously loads and caches a CommonJS module.' },
    { question: 'Which module is used for file system operations in Node.js?', options: ['path', 'os', 'fs', 'http'], answer: 2, explanation: 'The fs (file system) module provides file I/O operations.' },
    { question: 'What does process.env contain?', options: ['Node version', 'Environment variables', 'Command-line arguments', 'File system paths'], answer: 1, explanation: 'process.env provides access to environment variables.' },
    { question: 'What is middleware in Express.js?', options: ['A database layer', 'Functions that execute between request and response', 'A templating engine', 'A routing file'], answer: 1, explanation: 'Middleware functions have access to req, res, and next().' },
  ],
}

// ── Generate questions for any skill ─────────────────────────────────────────
function generateQuestions(skillName) {
  const bank = QUESTION_BANK[skillName]
  if (bank) return bank
  // Generic fallback questions
  return [
    { question: `Which best describes a core use case of ${skillName}?`, options: [`Building web UIs`, `Data processing and automation`, `Cloud infrastructure`, `${skillName} is primarily for networking`], answer: 1, explanation: `${skillName} has many applications in modern software development.` },
    { question: `${skillName} is primarily associated with which domain?`, options: [`Frontend UI`, `Backend services`, `DevOps and infrastructure`, `All of the above`], answer: 3, explanation: `${skillName} spans multiple domains in software engineering.` },
    { question: `What is a best practice when using ${skillName}?`, options: [`Ignoring documentation`, `Following official style guides`, `Avoiding version control`, `Skipping tests`], answer: 1, explanation: `Following official guides ensures consistent and maintainable code.` },
    { question: `What does a "dependency" mean in the context of ${skillName}?`, options: [`A bug`, `An external library or module required`, `A configuration file`, `A deployment step`], answer: 1, explanation: `Dependencies are external packages your project relies on.` },
    { question: `When would you use ${skillName} over alternatives?`, options: [`When performance is not a concern`, `When it provides the best fit for the use case`, `Never — alternatives are always better`, `Only in large enterprise projects`], answer: 1, explanation: `Technology choice should always be based on the specific use case.` },
  ]
}

const DOMAIN_COLORS = {
  'Web Frontend': '#818cf8', 'Backend': '#34d399',  'DevOps': '#f59e0b',
  'Databases':    '#22d3ee', 'Mobile':  '#f472b6',  'Data / ML': '#a78bfa', 'Tools': '#94a3b8',
}
const DIFF_DOTS = { easy: 1, medium: 2, hard: 3 }

// ── Animated score ring ───────────────────────────────────────────────────────
function ScoreRing({ pct, passed }) {
  const r    = 54, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = passed ? '#22c55e' : '#ef4444'
  return (
    <div style={{ position:'relative', width:140, height:140, margin:'0 auto 12px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition:'stroke-dasharray 1s ease', filter:`drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{pct}%</span>
        <span style={{ fontSize:11, color:'#64748b' }}>{passed ? 'PASS' : 'FAIL'}</span>
      </div>
    </div>
  )
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function Timer({ seconds, onTimeout }) {
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
  const color = left < 10 ? '#ef4444' : left < 20 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:44, height:44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
          <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct/100)*2*Math.PI*18} ${2*Math.PI*18}`}
            strokeDashoffset={2*Math.PI*18*0.25}
          />
        </svg>
        <span style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center', fontSize:12, fontWeight:700, color }}>{left}</span>
      </div>
      <span style={{ fontSize:12, color:'#64748b' }}>seconds</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnCertifyPage() {
  const [searchParams]   = useSearchParams()
  const [view,           setView]      = useState('catalog')
  const [search,         setSearch]    = useState('')
  const [domainFilter,   setDomFilter] = useState('All')
  const [certs,          setCerts]     = useState([])
  const [loadingCerts,   setLdCerts]   = useState(false)

  // Quiz state
  const [activeSkill,   setActiveSkill]   = useState(null)
  const [questions,     setQuestions]     = useState([])
  const [currentQ,      setCurrentQ]      = useState(0)
  const [selected,      setSelected]      = useState(null)
  const [answers,       setAnswers]       = useState([])
  const [loadingStart,  setLoadingStart]  = useState(false)
  const [submitting,    setSubmitting]    = useState(false)

  // Results
  const [result, setResult] = useState(null)

  // Pre-select skill from URL ?skill=React
  useEffect(() => {
    const sk = searchParams.get('skill')
    if (sk) {
      const found = SKILL_CATALOG.find(s => s.skill === sk)
      if (found) handleStartQuiz(found)
    }
  }, [])

  // Load certs from localStorage
  useEffect(() => {
    setLdCerts(true)
    try { setCerts(loadCerts()) } catch {}
    setLdCerts(false)
  }, [result])

  // ── Start quiz (fully client-side) ──────────────────────────────────────────
  const handleStartQuiz = (sk) => {
    setActiveSkill(sk)
    setLoadingStart(true)
    setView('quiz')
    setAnswers([])
    setCurrentQ(0)
    setSelected(null)
    // Simulate a brief loading feel, then load questions
    setTimeout(() => {
      const qs = generateQuestions(sk.skill)
      setQuestions(qs)
      setLoadingStart(false)
    }, 800)
  }

  // ── Next question ──────────────────────────────────────────────────────────
  const handleNext = (autoAnswer = null) => {
    const finalAnswer = autoAnswer !== null ? autoAnswer : selected
    const newAnswers  = [...answers, finalAnswer === null ? -1 : finalAnswer]
    if (currentQ < questions.length - 1) {
      setAnswers(newAnswers)
      setCurrentQ(q => q + 1)
      setSelected(null)
    } else {
      handleSubmit(newAnswers)
    }
  }

  // ── Submit quiz (fully client-side) ─────────────────────────────────────────
  const handleSubmit = (finalAnswers) => {
    setSubmitting(true)
    setTimeout(() => {
      const correct = finalAnswers.reduce((n, ans, i) => n + (ans === questions[i]?.answer ? 1 : 0), 0)
      const total   = questions.length
      const score   = Math.round((correct / total) * 100)
      const passed  = score >= 70
      const certId  = `DP-${activeSkill.skill.replace(/\s/g,'-').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
      const wrongAnswers = questions
        .map((q, i) => finalAnswers[i] !== q.answer ? {
          question:       q.question,
          user_answer:    q.options[finalAnswers[i]] || '(skipped)',
          correct_answer: q.options[q.answer],
          explanation:    q.explanation,
        } : null)
        .filter(Boolean)
      const resultData = { score, correct, total, passed, xp_gained: passed ? activeSkill.xp : 0, cert_id: passed ? certId : null, wrong_answers: wrongAnswers }
      if (passed) {
        saveCert({ skill_name: activeSkill.skill, score, issued_at: new Date().toISOString(), unique_cert_id: certId, id: certId })
        toast.success(`🎉 Certified in ${activeSkill.skill}! +${activeSkill.xp} XP`)
      }
      setResult(resultData)
      setView('results')
      setSubmitting(false)
    }, 600)
  }

  // ── Filtered catalog ───────────────────────────────────────────────────────
  const filtered = SKILL_CATALOG.filter(s =>
    (domainFilter === 'All' || s.domain === domainFilter) &&
    s.skill.toLowerCase().includes(search.toLowerCase())
  )
  const domains = ['All', ...new Set(SKILL_CATALOG.map(s => s.domain))]
  const certMap = Object.fromEntries(certs.map(c => [c.skill_name, c]))

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes dp-xp{0%{transform:scale(0);opacity:0}50%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}`}</style>

      {/* ── CATALOG ──────────────────────────────────────────────────────── */}
      {view === 'catalog' && (
        <div style={{ animation:'dp-fadein 0.3s ease-out' }}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>🎓 Learn & Certify</h1>
            <p style={S.pageSub}>Prove your skills with AI-generated quizzes. Score ≥ 70% to earn a cert.</p>
          </div>

          {/* Search + domain filter */}
          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            <input
              type="text"
              placeholder="Search skills…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={S.searchInput}
            />
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {domains.map(d => (
                <button
                  key={d}
                  onClick={() => setDomFilter(d)}
                  style={{
                    ...S.filterTab,
                    background: domainFilter === d ? `${DOMAIN_COLORS[d] || '#6366f1'}22` : 'rgba(255,255,255,0.04)',
                    border: domainFilter === d ? `1px solid ${DOMAIN_COLORS[d] || '#6366f1'}55` : '1px solid rgba(255,255,255,0.08)',
                    color: domainFilter === d ? (DOMAIN_COLORS[d] || '#818cf8') : '#64748b',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* Skill cards grid */}
          <div style={S.catalogGrid}>
            {filtered.map(sk => {
              const cert  = certMap[sk.skill]
              const dc    = DOMAIN_COLORS[sk.domain] || '#818cf8'
              const dots  = DIFF_DOTS[sk.difficulty] || 2
              return (
                <div key={sk.skill} style={{ ...S.catalogCard, borderColor: cert ? `${dc}55` : 'rgba(255,255,255,0.07)' }}>
                  {cert && <div style={{ ...S.certBadge, color: dc, borderColor: `${dc}55`, background: `${dc}15` }}>✅ Certified</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <p style={{ fontSize:15, fontWeight:700, color:'#e2e8f0', margin:0 }}>{sk.skill}</p>
                    <span style={{ fontSize:11, color: dc, background:`${dc}15`, borderRadius:99, padding:'2px 8px' }}>{sk.domain}</span>
                  </div>
                  <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                    {[1,2,3].map(i => (
                      <span key={i} style={{ width:8, height:8, borderRadius:'50%', background: i <= dots ? dc : 'rgba(255,255,255,0.1)' }}/>
                    ))}
                    <span style={{ fontSize:11, color:'#64748b', marginLeft:6 }}>{sk.difficulty}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>⏱ {sk.time}</span>
                    <span style={{ fontSize:12, color:'#818cf8', fontWeight:600 }}>+{sk.xp} XP</span>
                  </div>
                  <button
                    onClick={() => handleStartQuiz(sk)}
                    style={{ ...S.startBtn, background:`linear-gradient(135deg,${dc}cc,${dc})`, boxShadow:`0 4px 14px ${dc}44` }}
                  >
                    {cert ? 'Retake Quiz →' : 'Start Quiz →'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Certificates section */}
          <div style={{ marginTop:36 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:16 }}>🎖️ Your Certificates</h2>
            {loadingCerts ? (
              <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div style={S.spinner}/></div>
            ) : certs.length === 0 ? (
              <p style={{ color:'#475569', fontSize:13 }}>No certificates yet. Pass a quiz to earn your first cert!</p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                {certs.map(c => {
                  const dc = DOMAIN_COLORS[SKILL_CATALOG.find(s=>s.skill===c.skill_name)?.domain||''] || '#818cf8'
                  return (
                    <div key={c.id} style={{ ...S.certCard, borderColor:`${dc}44` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <p style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', margin:0 }}>{c.skill_name}</p>
                          <p style={{ fontSize:11, color:'#64748b', margin:'4px 0 0' }}>Score: {c.score}% · {new Date(c.issued_at).toLocaleDateString()}</p>
                          <p style={{ fontSize:10, color: dc, marginTop:4, fontFamily:'monospace' }}>{c.unique_cert_id}</p>
                        </div>
                        <div style={{ fontSize:28 }}>🎖️</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── QUIZ ─────────────────────────────────────────────────────────── */}
      {view === 'quiz' && (
        <div style={{ maxWidth:680, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:0 }}>
              {activeSkill?.skill} Quiz
            </h2>
            <button onClick={() => setView('catalog')} style={S.backBtn}>← Back</button>
          </div>

          {loadingStart ? (
            <div style={{ textAlign:'center', padding:'80px 0' }}>
              <div style={S.spinner}/>
              <p style={{ color:'#64748b', marginTop:16 }}>Generating AI quiz questions…</p>
            </div>
          ) : questions.length > 0 ? (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'#818cf8', fontWeight:600 }}>Question {currentQ + 1} of {questions.length}</span>
                  <Timer key={currentQ} seconds={60} onTimeout={() => handleNext(-1)} />
                </div>
                <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.07)' }}>
                  <div style={{
                    height:'100%', borderRadius:99, transition:'width 0.3s',
                    width:`${((currentQ + 1) / questions.length) * 100}%`,
                    background:'linear-gradient(90deg,#6366f1,#8b5cf6)',
                  }}/>
                </div>
              </div>

              {/* Question card */}
              <div style={S.questionCard}>
                <p style={{ fontSize:16, color:'#f1f5f9', fontWeight:600, lineHeight:1.6, margin:0 }}>
                  {questions[currentQ]?.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, margin:'20px 0' }}>
                {(questions[currentQ]?.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    style={{
                      ...S.optionBtn,
                      background: selected === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      border: selected === i ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
                      color: selected === i ? '#c7d2fe' : '#cbd5e1',
                      boxShadow: selected === i ? '0 0 14px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    <span style={{ ...S.optionLetter, background: selected === i ? '#6366f1' : 'rgba(255,255,255,0.08)' }}>
                      {['A','B','C','D'][i]}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              {/* Next / Submit */}
              <button
                onClick={() => handleNext()}
                disabled={selected === null || submitting}
                style={{
                  ...S.nextBtn,
                  opacity: selected === null ? 0.4 : 1,
                  cursor: selected === null ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting
                  ? <><span style={S.spinnerInline}/> Submitting…</>
                  : currentQ < questions.length - 1 ? 'Next Question →' : 'Submit Quiz ✓'}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      {view === 'results' && result && (
        <div style={{ maxWidth:640, margin:'0 auto', animation:'dp-fadein 0.3s ease-out' }}>
          <div style={S.resultsCard}>
            <ScoreRing pct={result.score} passed={result.passed} />

            <h2 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', margin:'0 0 6px', textAlign:'center' }}>
              {result.passed ? '🎉 You\'re Certified!' : '😔 Not Quite — Try Again'}
            </h2>
            <p style={{ color:'#94a3b8', fontSize:14, textAlign:'center', margin:'0 0 20px' }}>
              {result.correct}/{result.total} correct — {result.score}%
            </p>

            {result.passed && result.xp_gained > 0 && (
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                <span style={{ ...S.xpChip, animation:'dp-xp 0.6s ease-out' }}>+{result.xp_gained} XP 🚀</span>
              </div>
            )}

            {result.passed && result.cert_id && (
              <div style={S.certDisplay}>
                <p style={{ fontSize:13, color:'#818cf8', fontWeight:700, margin:'0 0 8px', textTransform:'uppercase' }}>Certificate Issued</p>
                <p style={{ fontSize:18, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>{activeSkill?.skill}</p>
                <p style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{result.cert_id}</p>
              </div>
            )}

            {!result.passed && result.wrong_answers?.length > 0 && (
              <div style={{ marginTop:20 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#f87171', marginBottom:12 }}>Review Wrong Answers</p>
                {result.wrong_answers.map((w, i) => (
                  <div key={i} style={S.wrongCard}>
                    <p style={{ fontSize:13, color:'#e2e8f0', fontWeight:600, marginBottom:8 }}>{w.question}</p>
                    <p style={{ fontSize:12, color:'#f87171', marginBottom:4 }}>❌ Your answer: {w.user_answer}</p>
                    <p style={{ fontSize:12, color:'#4ade80', marginBottom:6 }}>✅ Correct: {w.correct_answer}</p>
                    <p style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>{w.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button onClick={() => setView('catalog')} style={{ ...S.backBtn, flex:1, padding:'12px' }}>
                Back to Catalog
              </button>
              {!result.passed && (
                <button
                  onClick={() => handleStartQuiz(activeSkill)}
                  style={{ ...S.nextBtn, flex:2 }}
                >
                  Retry Quiz 🔄
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:        { fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', paddingBottom:60 },
  pageHeader:  { marginBottom:24 },
  pageTitle:   { fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.4px' },
  pageSub:     { fontSize:13, color:'#94a3b8', margin:'4px 0 0' },
  searchInput: {
    flex:1, minWidth:200, padding:'10px 14px',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:10, color:'#f1f5f9', fontSize:13, outline:'none',
  },
  filterTab:   { padding:'6px 14px', borderRadius:99, fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' },
  catalogGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 },
  catalogCard: {
    background:'rgba(255,255,255,0.04)', border:'1px solid', borderRadius:14,
    padding:18, display:'flex', flexDirection:'column', position:'relative',
    transition:'box-shadow 0.2s',
  },
  certBadge:   { position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, border:'1px solid', borderRadius:99, padding:'2px 8px' },
  startBtn:    { border:'none', borderRadius:10, padding:'11px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:'auto' },
  certCard:    {
    background:'rgba(255,255,255,0.03)', border:'1px solid', borderRadius:12, padding:'16px 18px',
  },
  questionCard:{
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
    borderRadius:14, padding:'24px',
  },
  optionBtn:   {
    display:'flex', alignItems:'center', gap:12,
    padding:'14px 16px', borderRadius:12, cursor:'pointer',
    textAlign:'left', fontSize:14, fontWeight:500,
    transition:'all 0.15s', width:'100%',
  },
  optionLetter:{
    width:28, height:28, borderRadius:8, display:'flex',
    alignItems:'center', justifyContent:'center',
    fontSize:12, fontWeight:800, flexShrink:0, transition:'background 0.15s',
  },
  nextBtn:     {
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    width:'100%', padding:'14px', borderRadius:12,
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
    color:'#fff', fontSize:15, fontWeight:700,
    boxShadow:'0 4px 20px rgba(99,102,241,0.4)', cursor:'pointer',
  },
  backBtn:     {
    padding:'10px 18px', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    color:'#94a3b8', fontSize:13, fontWeight:500, cursor:'pointer',
  },
  resultsCard: {
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:18, padding:'32px 28px',
  },
  certDisplay: {
    background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)',
    borderRadius:12, padding:'16px 20px', textAlign:'center',
  },
  wrongCard:   {
    background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)',
    borderRadius:10, padding:'14px', marginBottom:10,
  },
  xpChip:      {
    fontSize:16, fontWeight:800, color:'#818cf8',
    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(129,140,248,0.35)',
    borderRadius:99, padding:'8px 20px',
    boxShadow:'0 0 20px rgba(99,102,241,0.3)',
  },
  spinner:     {
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
