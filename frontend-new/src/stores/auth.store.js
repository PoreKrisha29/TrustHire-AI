import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      // ── Actions ──────────────────────────────────────────────────

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await authApi.login({ email, password })
          const { accessToken, refreshToken, user } = data.data
          localStorage.setItem('accessToken',  accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken, isLoading: false })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await authApi.register(payload)
          set({ isLoading: false })
          return { success: true, data: data.data }
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      logout: async () => {
        try { await authApi.logout() } catch (_) {}
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.me()
          set({ user: data.data })
        } catch (_) {
          get().logout()
        }
      },

      clearError: () => set({ error: null }),

      // ── Derived ──────────────────────────────────────────────────
      isAuthenticated: () => !!get().accessToken,
      isCandidate:     () => get().user?.role === 'CANDIDATE',
      isEmployer:      () => get().user?.role === 'EMPLOYER',
      isAdmin:         () => get().user?.role === 'ADMIN',
    }),
    {
      name:    'trusthire-auth',
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

export default useAuthStore
