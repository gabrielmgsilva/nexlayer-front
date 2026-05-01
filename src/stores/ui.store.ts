import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MD_BREAKPOINT = 768

interface UiState {
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setSidebarMobileOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSidebarMobileOpen: (v) => set({ sidebarMobileOpen: v }),
    }),
    { name: 'criaforma-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
)

/** Returns true when viewport < md breakpoint (768px) */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MD_BREAKPOINT)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}
