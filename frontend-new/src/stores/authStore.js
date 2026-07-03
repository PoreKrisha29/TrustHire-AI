/**
 * stores/authStore.js
 *
 * Zustand auth store for DevPulse AI.
 * Token key: "vish_seeker_token"  (access JWT)
 * Refresh key: "vish_seeker_refresh"
 */

import { create } from 'zustand'

const TOKEN_KEY   = 'vish_seeker_token'
const REFRESH_KEY = 'vish_seeker_refresh'
const API_BASE    = '/api/v1/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) {
    throw { status: res.status, data: json }
  }
  return json
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function persistTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useAuthStore = create((set, get) => ({
  user:            null,
  token:           getStoredToken(),   // access JWT
  isAuthenticated: !!getStoredToken(),
  isLoading:       false,
  error:           null,

  // ── initFromStorage ───────────────────────────────────────────────────────
  initFromStorage: async () => {
    const token = getStoredToken()
    if (!token) return

    set({ token, isAuthenticated: true })

    // Fetch fresh profile from /me
    try {
      const json = await apiFetch('/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      set({ user: json.data })
    } catch (err) {
      // Try refresh if 401
      if (err.status === 401) {
        await get().refreshToken()
      } else {
        get().logout()
      }
    }
  },

  // ── login ─────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const json = await apiFetch('/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
      })
      const { user, access, refresh } = json.data
      persistTokens(access, refresh)
      set({ user, token: access, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (err) {
      const message =
        err.data?.message ||
        Object.values(err.data?.errors || {})[0]?.[0] ||
        'Login failed. Please try again.'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // ── register ──────────────────────────────────────────────────────────────
  register: async ({ full_name, email, password, confirm_password }) => {
    set({ isLoading: true, error: null })
    try {
      await apiFetch('/register', {
        method: 'POST',
        body:   JSON.stringify({ full_name, email, password, confirm_password }),
      })
      set({ isLoading: false })
      return { success: true }
    } catch (err) {
      const message =
        err.data?.message ||
        Object.values(err.data?.errors || {})[0]?.[0] ||
        'Registration failed. Please try again.'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // ── logout ────────────────────────────────────────────────────────────────
  logout: () => {
    clearTokens()
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  // ── refreshToken ──────────────────────────────────────────────────────────
  refreshToken: async () => {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (!refresh) { get().logout(); return }

    try {
      const json = await apiFetch('/refresh', {
        method: 'POST',
        body:   JSON.stringify({ refresh }),
      })
      const { access, refresh: newRefresh } = json.data
      persistTokens(access, newRefresh)
      set({ token: access, isAuthenticated: true })

      // Re-fetch user profile
      const meJson = await apiFetch('/me', {
        headers: { Authorization: `Bearer ${access}` },
      })
      set({ user: meJson.data })
    } catch {
      get().logout()
    }
  },

  // ── github login ──────────────────────────────────────────────────────────
  loginWithGithub: async (code) => {
    set({ isLoading: true, error: null })
    try {
      const json = await apiFetch('/github/callback', {
        method: 'POST',
        body:   JSON.stringify({ code }),
      })
      const { user, access, refresh } = json.data
      persistTokens(access, refresh)
      set({ user, token: access, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (err) {
      const message = err.data?.message || 'GitHub login failed.'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // ── helpers ───────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
  getToken:   () => get().token,
}))

export default useAuthStore
