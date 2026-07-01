import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // default is dark as current codebase is dark-first

      setTheme: (theme) => {
        set({ theme })
        get().applyTheme()
      },

      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: nextTheme })
        get().applyTheme()
      },

      applyTheme: () => {
        const { theme } = get()
        const root = window.document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }),
    {
      name: 'trusthire-theme',
    }
  )
)

export default useThemeStore
