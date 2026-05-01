import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeResolved = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  resolved: ThemeResolved
  setMode: (mode: ThemeMode) => void
  /** internal: applies resolved value to <html data-theme> */
  apply: () => void
}

const getSystem = (): ThemeResolved => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const resolve = (mode: ThemeMode): ThemeResolved =>
  mode === 'system' ? getSystem() : mode

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      resolved: 'dark',
      setMode: (mode) => {
        const resolved = resolve(mode)
        set({ mode, resolved })
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = resolved
        }
      },
      apply: () => {
        const resolved = resolve(get().mode)
        set({ resolved })
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = resolved
        }
      },
    }),
    {
      name: 'nexlayer-theme',
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        // Defer to next tick to ensure document is ready
        if (state && typeof document !== 'undefined') {
          const r = resolve(state.mode)
          state.resolved = r
          document.documentElement.dataset.theme = r
        }
      },
    },
  ),
)

/** Call once at app boot to wire system-theme listener. */
export function initTheme() {
  if (typeof window === 'undefined') return
  const apply = useThemeStore.getState().apply
  apply()
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  mq.addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') apply()
  })
}
