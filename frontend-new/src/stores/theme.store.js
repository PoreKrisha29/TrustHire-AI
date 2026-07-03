import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── CSS variable tokens ───────────────────────────────────────────────────────
// Applied to :root so every component can use var(--dp-*) tokens.
const THEMES = {
  dark: {
    '--dp-bg':          '#080b14',
    '--dp-bg2':         '#0f1729',
    '--dp-surface':     'rgba(255,255,255,0.04)',
    '--dp-surface2':    'rgba(255,255,255,0.07)',
    '--dp-border':      'rgba(255,255,255,0.08)',
    '--dp-text':        '#f1f5f9',
    '--dp-text2':       '#94a3b8',
    '--dp-text3':       '#64748b',
    '--dp-accent':      '#6366f1',
    '--dp-accent2':     '#8b5cf6',
    '--dp-sidebar-bg':  'rgba(8,11,20,0.97)',
    '--dp-header-bg':   'rgba(8,11,20,0.95)',
    '--dp-card-shadow': '0 4px 24px rgba(0,0,0,0.4)',
    '--dp-input-bg':    'rgba(255,255,255,0.05)',
  },
  light: {
    '--dp-bg':          '#f0f2f8',
    '--dp-bg2':         '#e8eaf2',
    '--dp-surface':     'rgba(255,255,255,0.85)',
    '--dp-surface2':    'rgba(255,255,255,0.95)',
    '--dp-border':      'rgba(0,0,0,0.09)',
    '--dp-text':        '#1e293b',
    '--dp-text2':       '#475569',
    '--dp-text3':       '#94a3b8',
    '--dp-accent':      '#4f46e5',
    '--dp-accent2':     '#7c3aed',
    '--dp-sidebar-bg':  'rgba(240,242,248,0.97)',
    '--dp-header-bg':   'rgba(240,242,248,0.95)',
    '--dp-card-shadow': '0 2px 16px rgba(0,0,0,0.08)',
    '--dp-input-bg':    'rgba(0,0,0,0.04)',
  },
}

function applyVars(theme) {
  const root = document.documentElement
  const vars = THEMES[theme] || THEMES.dark
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.setAttribute('data-theme', theme)
  // Keep legacy .dark class for any CSS still using it
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      applyTheme: () => applyVars(get().theme),

      setTheme: (theme) => {
        set({ theme })
        applyVars(theme)
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyVars(next)
      },
    }),
    { name: 'dp-theme' }
  )
)

export default useThemeStore
