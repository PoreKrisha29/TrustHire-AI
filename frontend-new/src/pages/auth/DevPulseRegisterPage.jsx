/**
 * pages/auth/DevPulseRegisterPage.jsx
 *
 * DevPulse AI — Create Account
 * Dark glassmorphism, vanilla CSS only (no Tailwind classes).
 * Role is hidden — always "job_seeker" as per spec.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

export default function DevPulseRegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()

  const [form, setForm] = useState({
    full_name:        '',
    email:            '',
    password:         '',
    confirm_password: '',
  })
  const [showPw,     setShowPw]     = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)
  const [errors,     setErrors]     = useState({})

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  /* ── Validation ─────────────────────────────────────────────── */
  function validate() {
    const e = {}
    if (!form.full_name.trim())        e.full_name = 'Full name is required.'
    else if (form.full_name.trim().length < 2) e.full_name = 'Minimum 2 characters.'
    if (!form.email)                   e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.password)                e.password = 'Password is required.'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters.'
    if (!form.confirm_password)        e.confirm_password = 'Please confirm your password.'
    else if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.'
    return e
  }

  /* ── Submit ──────────────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    const result = await register(form)
    if (result.success) {
      toast.success('Account created! Sign in to start your journey 🚀')
      navigate('/login')
    } else {
      toast.error(result.error)
    }
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div style={S.page}>
      {/* Ambient blobs */}
      <div style={{ ...S.blob, top: '-80px', left: '-100px', background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />
      <div style={{ ...S.blob, bottom: '-120px', right: '-80px', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />

      <div style={S.card}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logoWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#bolt2)" />
              <defs>
                <linearGradient id="bolt2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={S.title}>DevPulse AI</h1>
          <p style={S.subtitle}>Create your free account</p>
        </div>

        {/* XP motivation strip */}
        <div style={S.xpStrip}>
          <span style={S.xpIcon}>⚡</span>
          <span style={S.xpText}>Start at <strong>Intern</strong> level — earn XP to become a <strong>Legend</strong></span>
        </div>

        {/* Hidden role field — always job_seeker */}
        <input type="hidden" name="role" value="job_seeker" />

        <form onSubmit={handleSubmit} noValidate style={S.form}>
          {/* Full name */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-reg-name">Full Name</label>
            <input
              id="dp-reg-name"
              type="text"
              autoComplete="name"
              placeholder="Priya Sharma"
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              style={{ ...S.input, ...(errors.full_name ? S.inputError : {}) }}
            />
            {errors.full_name && <span style={S.errorText}>{errors.full_name}</span>}
          </div>

          {/* Email */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-reg-email">Email</label>
            <input
              id="dp-reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              style={{ ...S.input, ...(errors.email ? S.inputError : {}) }}
            />
            {errors.email && <span style={S.errorText}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-reg-pw">Password</label>
            <div style={S.passwordWrap}>
              <input
                id="dp-reg-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                style={{ ...S.input, ...S.passwordInput, ...(errors.password ? S.inputError : {}) }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn} aria-label="Toggle password">
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <span style={S.errorText}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-reg-cpw">Confirm Password</label>
            <div style={S.passwordWrap}>
              <input
                id="dp-reg-cpw"
                type={showConfPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={e => setField('confirm_password', e.target.value)}
                style={{ ...S.input, ...S.passwordInput, ...(errors.confirm_password ? S.inputError : {}) }}
              />
              <button type="button" onClick={() => setShowConfPw(v => !v)} style={S.eyeBtn} aria-label="Toggle confirm password">
                {showConfPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirm_password && <span style={S.errorText}>{errors.confirm_password}</span>}
          </div>

          {/* Submit */}
          <button
            id="dp-register-btn"
            type="submit"
            disabled={isLoading}
            style={{ ...S.submitBtn, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading
              ? <span style={S.spinnerRow}><span style={S.spinner} />Creating account…</span>
              : 'Create Account'}
          </button>
        </form>

        <p style={S.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={S.link}>Sign in</Link>
        </p>
      </div>

      <style>{`
        @keyframes dp-spin { to { transform: rotate(360deg); } }
        @keyframes dp-fadeup {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ── Inline SVG icons ──────────────────────────────────────────── */
function EyeIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
    </svg>
  )
}

/* ── Styles ────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a14 0%, #0f0f1e 50%, #0a0a14 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  blob: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '36px 36px 32px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    animation: 'dp-fadeup 0.4s ease-out both',
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '6px',
  },
  logoWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2px',
    boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
  },
  title: {
    margin: 0,
    fontSize: '21px',
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
  },
  xpStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '20px',
  },
  xpIcon: { fontSize: '16px' },
  xpText: {
    fontSize: '12px',
    color: '#a5b4fc',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#cbd5e1',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: 'rgba(239,68,68,0.6)',
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: '42px' },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  errorText: {
    fontSize: '12px',
    color: '#f87171',
  },
  submitBtn: {
    marginTop: '6px',
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.2px',
    boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'dp-spin 0.7s linear infinite',
  },
  switchText: {
    marginTop: '22px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
  },
  link: {
    color: '#818cf8',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
