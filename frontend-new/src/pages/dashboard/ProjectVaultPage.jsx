/**
 * pages/dashboard/ProjectVaultPage.jsx
 *
 * DevPulse AI — Project Vault 🗂️
 * Grid of project cards + Add/Edit modal + AI bullet generation.
 */

import { useState, useEffect, useRef } from 'react'
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

// ── Tech stack chip colour ────────────────────────────────────────────────────
const TECH_COLORS = {
  frontend:  ['React','Next.js','Vue','Angular','Svelte','TypeScript','JavaScript','CSS','Tailwind','HTML'],
  backend:   ['Python','Django','FastAPI','Node.js','Express','Go','Java','Spring','Ruby','PHP','FastAPI'],
  devops:    ['Docker','Kubernetes','AWS','GCP','Azure','CI/CD','Terraform','Nginx','Linux'],
  data:      ['PostgreSQL','MySQL','MongoDB','Redis','Cassandra','Firebase','SQLite'],
}

function getTechColor(tech) {
  const t = tech.toLowerCase()
  if (TECH_COLORS.frontend.some(f => t.includes(f.toLowerCase()))) return '#818cf8'
  if (TECH_COLORS.backend.some(b => t.includes(b.toLowerCase()))) return '#34d399'
  if (TECH_COLORS.devops.some(d => t.includes(d.toLowerCase()))) return '#f59e0b'
  if (TECH_COLORS.data.some(d => t.includes(d.toLowerCase()))) return '#22d3ee'
  return '#94a3b8'
}

// ── Add/Edit modal ────────────────────────────────────────────────────────────
function ProjectModal({ initial, onSave, onClose, saving }) {
  const [title,       setTitle]   = useState(initial?.title || '')
  const [description, setDesc]    = useState(initial?.description || '')
  const [techInput,   setTechIn]  = useState('')
  const [techStack,   setTech]    = useState(initial?.tech_stack || [])
  const [github,      setGithub]  = useState(initial?.github_url || '')
  const [live,        setLive]    = useState(initial?.live_url || '')
  const techRef = useRef(null)

  const addTech = (val) => {
    const chips = val.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
    setTech(prev => [...new Set([...prev, ...chips])])
    setTechIn('')
  }

  const handleTechKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTech(techInput)
    }
  }

  const removeTech = (t) => setTech(prev => prev.filter(x => x !== t))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    onSave({ title, description, tech_stack: techStack, github_url: github || null, live_url: live || null })
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:0 }}>
            {initial ? '✏️ Edit Project' : '➕ Add Project'}
          </h2>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={S.label}>Project Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. DevPulse AI Career Platform"
              style={S.input} required/>
          </div>

          <div>
            <label style={S.label}>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Briefly describe what you built and why…"
              rows={3} style={S.textarea}/>
          </div>

          <div>
            <label style={S.label}>Tech Stack (press Enter or comma to add)</label>
            <div style={S.chipBox}>
              {techStack.map(t => (
                <span key={t} style={{ ...S.techChip, color:getTechColor(t), background:`${getTechColor(t)}22`, border:`1px solid ${getTechColor(t)}55` }}>
                  {t}
                  <button type="button" onClick={() => removeTech(t)} style={{ ...S.chipX }}> ×</button>
                </span>
              ))}
              <input
                ref={techRef}
                value={techInput}
                onChange={e => setTechIn(e.target.value)}
                onKeyDown={handleTechKey}
                onBlur={() => techInput.trim() && addTech(techInput)}
                placeholder={techStack.length === 0 ? 'React, PostgreSQL, Docker…' : ''}
                style={{ border:'none', outline:'none', background:'transparent', color:'#e2e8f0', fontSize:13, minWidth:120, flex:1, fontFamily:"'Inter',system-ui,sans-serif" }}
              />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={S.label}>GitHub URL</label>
              <input value={github} onChange={e => setGithub(e.target.value)}
                placeholder="https://github.com/…" type="url" style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Live URL</label>
              <input value={live} onChange={e => setLive(e.target.value)}
                placeholder="https://…" type="url" style={S.input}/>
            </div>
          </div>

          <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px' }}>
            <p style={{ fontSize:12, color:'#818cf8', margin:0 }}>
              🤖 AI will automatically generate STAR-format impact bullets and extract skills from your project after saving.
            </p>
          </div>

          <button type="submit" disabled={saving} style={{ ...S.saveBtn, opacity:saving?0.7:1 }}>
            {saving ? <><span style={S.spinnerInline}/> Generating AI Bullets…</> : '✨ Save & Generate AI Bullets'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onTogglePin, onRegenerate, regenerating }) {
  return (
    <div style={{
      ...S.card,
      border: project.is_pinned
        ? '1px solid rgba(139,92,246,0.5)'
        : '1px solid rgba(255,255,255,0.07)',
      boxShadow: project.is_pinned
        ? '0 0 20px rgba(139,92,246,0.15), 0 8px 32px rgba(0,0,0,0.3)'
        : '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      {project.is_pinned && (
        <div style={S.pinnedBadge}>📌 Pinned</div>
      )}

      {/* Title + Description */}
      <h3 style={S.cardTitle}>{project.title}</h3>
      {project.description && (
        <p style={S.cardDesc}>{project.description}</p>
      )}

      {/* Tech stack */}
      {project.tech_stack?.length > 0 && (
        <div style={S.chipRow}>
          {project.tech_stack.map(t => (
            <span key={t} style={{ ...S.techChip, color:getTechColor(t), background:`${getTechColor(t)}18`, border:`1px solid ${getTechColor(t)}44`, fontSize:11 }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* AI bullets */}
      {project.ai_bullets?.length > 0 && (
        <ul style={S.bulletList}>
          {project.ai_bullets.map((b, i) => (
            <li key={i} style={S.bulletItem}>
              <span style={S.bulletDot}/>
              <span style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div style={S.cardFooter}>
        <div style={{ display:'flex', gap:8 }}>
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noreferrer" style={S.linkIcon} title="GitHub">
              <span style={{ fontSize:16 }}>⑂</span>
            </a>
          )}
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noreferrer" style={S.linkIcon} title="Live demo">
              <span style={{ fontSize:14 }}>🔗</span>
            </a>
          )}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => onRegenerate(project.id)} disabled={regenerating === project.id} title="Regenerate bullets" style={S.iconBtn}>
            {regenerating === project.id ? <span style={S.spinnerTiny}/> : '🔄'}
          </button>
          <button onClick={() => onTogglePin(project)} title={project.is_pinned ? 'Unpin' : 'Pin'} style={{ ...S.iconBtn, color: project.is_pinned ? '#a78bfa' : '#64748b' }}>
            📌
          </button>
          <button onClick={() => onEdit(project)} title="Edit" style={S.iconBtn}>✏️</button>
          <button onClick={() => onDelete(project.id)} title="Delete" style={{ ...S.iconBtn, color:'#f87171' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectVaultPage() {
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [regenerating,setRegen]       = useState(null)

  useEffect(() => {
    authFetch('/api/v1/projects/')
      .then(r => r.json())
      .then(j => { if (j.success) setProjects(j.data) })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (data) => {
    setSaving(true)
    try {
      const url    = editTarget ? `/api/v1/projects/${editTarget.id}` : '/api/v1/projects/'
      const method = editTarget ? 'PATCH' : 'POST'
      const res    = await authFetch(url, { method, body: JSON.stringify(data) })
      const json   = await res.json()
      if (!json.success) throw new Error(json.message)
      if (editTarget) {
        setProjects(p => p.map(x => x.id === editTarget.id ? json.data : x))
        toast.success('Project updated!')
      } else {
        setProjects(p => [json.data, ...p])
        toast.success('Project created with AI bullets! ✨')
      }
      setShowModal(false)
      setEditTarget(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return
    const res  = await authFetch(`/api/v1/projects/${id}`, { method:'DELETE' })
    const json = await res.json()
    if (json.success) {
      setProjects(p => p.filter(x => x.id !== id))
      toast.success('Project deleted.')
    }
  }

  const handleTogglePin = async (project) => {
    const res  = await authFetch(`/api/v1/projects/${project.id}`, {
      method:'PATCH', body:JSON.stringify({ is_pinned:!project.is_pinned }),
    })
    const json = await res.json()
    if (json.success) setProjects(p => p.map(x => x.id === project.id ? json.data : x))
  }

  const handleRegenerate = async (id) => {
    setRegen(id)
    try {
      const res  = await authFetch(`/api/v1/projects/${id}/regenerate`, { method:'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setProjects(p => p.map(x => x.id === id ? json.data : x))
      toast.success('Bullets regenerated! 🤖')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRegen(null)
    }
  }

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9' }}>
      <style>{`@keyframes dp-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes dp-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, margin:0, letterSpacing:'-0.4px' }}>🗂️ Project Vault</h1>
          <p style={{ fontSize:13, color:'#64748b', margin:'4px 0 0' }}>Showcase your work. AI turns your projects into resume bullets.</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowModal(true) }} style={S.addBtn}>
          ➕ Add Project
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}><div style={S.spinner}/></div>
      ) : projects.length === 0 ? (
        <div style={S.emptyState}>
          <p style={{ fontSize:40, marginBottom:12 }}>🗂️</p>
          <p style={{ fontSize:16, fontWeight:600, color:'#e2e8f0', margin:'0 0 8px' }}>No projects yet</p>
          <p style={{ fontSize:13, color:'#475569' }}>Add your first project and Pulse will write your resume bullets!</p>
          <button onClick={() => setShowModal(true)} style={{ ...S.addBtn, marginTop:16 }}>Add First Project</button>
        </div>
      ) : (
        <div style={S.grid}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={proj => { setEditTarget(proj); setShowModal(true) }}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ProjectModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  addBtn: {
    padding:'10px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:600,
    cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.35)',
    whiteSpace:'nowrap', fontFamily:"'Inter',system-ui,sans-serif",
  },
  grid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, animation:'dp-fadein 0.3s ease-out' },
  card: {
    background:'rgba(255,255,255,0.04)', borderRadius:16,
    padding:20, display:'flex', flexDirection:'column', gap:12,
    transition:'box-shadow 0.2s', position:'relative',
  },
  pinnedBadge:{
    position:'absolute', top:12, right:12,
    fontSize:10, color:'#a78bfa', background:'rgba(139,92,246,0.15)',
    border:'1px solid rgba(139,92,246,0.3)', borderRadius:99, padding:'2px 8px', fontWeight:600,
  },
  cardTitle:{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0, paddingRight:60 },
  cardDesc:{ fontSize:13, color:'#64748b', margin:0, lineHeight:1.5,
    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  chipRow:{ display:'flex', flexWrap:'wrap', gap:6 },
  techChip:{ borderRadius:99, padding:'3px 10px', fontWeight:500, whiteSpace:'nowrap' },
  bulletList:{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 },
  bulletItem:{ display:'flex', gap:8, alignItems:'flex-start' },
  bulletDot:{ width:6, height:6, borderRadius:'50%', background:'#6366f1', flexShrink:0, marginTop:6 },
  cardFooter:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 },
  linkIcon:{ fontSize:16, textDecoration:'none', color:'#64748b', padding:'4px 6px', borderRadius:6, background:'rgba(255,255,255,0.04)' },
  iconBtn:{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'4px 6px', borderRadius:6, color:'#64748b' },
  emptyState:{ textAlign:'center', padding:'80px 0' },
  // Modal
  overlay:{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)',
    zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20,
  },
  modal:{
    width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto',
    background:'rgba(12,14,28,0.99)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:18, padding:'24px', boxShadow:'0 24px 80px rgba(0,0,0,0.7)',
  },
  closeBtn:{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:14 },
  label:{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 },
  input:{
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  textarea:{
    width:'100%', padding:'10px 12px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', resize:'vertical',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  chipBox:{
    display:'flex', flexWrap:'wrap', gap:6, alignItems:'center',
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:8, padding:'8px 10px', minHeight:42, cursor:'text',
  },
  chipX:{ background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:14, lineHeight:1, padding:'0 0 0 2px' },
  saveBtn:{
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
    boxShadow:'0 4px 18px rgba(99,102,241,0.4)', fontFamily:"'Inter',system-ui,sans-serif",
  },
  spinner:{ width:32, height:32, border:'3px solid rgba(255,255,255,0.08)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'dp-spin 0.8s linear infinite', margin:'0 auto' },
  spinnerInline:{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'dp-spin 0.7s linear infinite' },
  spinnerTiny:{ display:'inline-block', width:10, height:10, border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'dp-spin 0.7s linear infinite' },
}
