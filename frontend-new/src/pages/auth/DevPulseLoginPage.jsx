/**
 * pages/auth/LoginPage.jsx
 *
 * DevPulse AI — Sign In
 * Dark glassmorphism, vanilla CSS only (no Tailwind classes).
 * Token key: vish_seeker_token
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useAuthStore from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [errors,   setErrors]   = useState({})

  /* ── Validation ─────────────────────────────────────────────── */
  function validate() {
    const e = {}
    if (!email)                      e.email    = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.'
    if (!password)                   e.password = 'Password is required.'
    else if (password.length < 6)    e.password = 'Minimum 6 characters.'
    return e
  }

  /* ── Submit ──────────────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    const result = await login(email, password)
    if (result.success) {
      toast.success('Welcome back to DevPulse! 🚀')
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div style={S.page}>
      {/* Ambient blobs */}
      <div style={{ ...S.blob, top: '-120px', right: '-120px', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }} />
      <div style={{ ...S.blob, bottom: '-100px', left: '-100px', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />

      <div style={S.card}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logoWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#bolt)" stroke="none"/>
              <defs>
                <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={S.title}>DevPulse AI</h1>
          <p style={S.subtitle}>Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={S.form}>
          {/* Email */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-email">Email</label>
            <input
              id="dp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ ...S.input, ...(errors.email ? S.inputError : {}) }}
            />
            {errors.email && <span style={S.errorText}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={S.fieldGroup}>
            <label style={S.label} htmlFor="dp-password">Password</label>
            <div style={S.passwordWrap}>
              <input
                id="dp-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...S.input, ...S.passwordInput, ...(errors.password ? S.inputError : {}) }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={S.eyeBtn}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            {errors.password && <span style={S.errorText}>{errors.password}</span>}
          </div>

          {/* Sign in button */}
          <button
            id="dp-signin-btn"
            type="submit"
            disabled={isLoading}
            style={{ ...S.submitBtn, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading
              ? <span style={S.spinnerRow}><span style={S.spinner} />Signing in…</span>
              : 'Sign In'}
          </button>
        </form>

        <p style={S.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={S.link}>Create one</Link>
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

/* ── Styles (vanilla CSS-in-JS objects) ────────────────────────── */
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
    maxWidth: '420px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px 36px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    animation: 'dp-fadeup 0.4s ease-out both',
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
    gap: '8px',
  },
  logoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
    boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
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
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: '42px',
  },
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
    color: '#94a3b8',
  },
  errorText: {
    fontSize: '12px',
    color: '#f87171',
  },
  submitBtn: {
    marginTop: '4px',
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
    marginTop: '24px',
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
