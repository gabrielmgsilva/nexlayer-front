import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { authService } from '@/services/auth.service'
import { NEX } from '@/lib/nex'

export function AppLayout() {
  const location = useLocation()
  const { data: status, isLoading } = useQuery({
    queryKey: ['auth', 'setup-status'],
    queryFn: () => authService.getSetupStatus(),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NEX.bg, color: NEX.textDim }}>
        Carregando...
      </div>
    )
  }

  if (status && !status.completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Header />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
