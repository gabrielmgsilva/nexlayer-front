import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, Btn, NEX } from '@/lib/nex'
import { notificationsService } from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth.store'

  const TITLES: Record<string, { title: string; breadcrumb: string }> = {
  '/':              { title: 'Dashboard',     breadcrumb: 'Visão geral' },
  '/sales':         { title: 'Vendas',        breadcrumb: 'Pedidos e canais' },
  '/products':      { title: 'Produtos',      breadcrumb: 'Catálogo e custos' },
  '/resources':     { title: 'Recursos',      breadcrumb: 'Equipamentos · Filamentos · Acessórios' },
  '/calculator':    { title: 'Calculadora',   breadcrumb: 'Motor de precificação' },
  '/production':    { title: 'Produção',      breadcrumb: 'Fila e timeline das impressoras' },
  '/reports':       { title: 'Relatórios',    breadcrumb: 'P&L · Comissões · Variance de custo' },
  '/settings':      { title: 'Configurações', breadcrumb: 'Domínios e preferências' },
}

function deriveTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname]
  // try first segment
  const seg = '/' + (pathname.split('/')[1] ?? '')
  return TITLES[seg] ?? { title: 'NEXLAYER', breadcrumb: '' }
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = deriveTitle(location.pathname)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const hasUnread = (unread?.count ?? 0) > 0

  return (
    <div
      className="sticky top-0 z-20 px-8 py-4 flex items-center gap-4"
      style={{
        background: `color-mix(in srgb, ${NEX.bg} 85%, transparent)`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${NEX.border}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider font-medium mb-0.5" style={{ color: NEX.textMute }}>
          {t.breadcrumb}
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">{t.title}</h1>
      </div>

      <div
        className="flex items-center gap-2.5 px-3 h-9 rounded-md w-72"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
      >
        <Icon d={Icons.search} size={13} className="opacity-50" />
        <input
          placeholder="Buscar pedidos, produtos, clientes..."
          className="bg-transparent flex-1 text-[12.5px] focus:outline-none placeholder:opacity-50"
          style={{ color: NEX.text }}
        />
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: NEX.surface2, color: NEX.textMute }}>
          ⌘K
        </kbd>
      </div>

      <button
        onClick={() => navigate('/notifications')}
        className="h-9 w-9 rounded-md flex items-center justify-center relative"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        title="Notificações"
      >
        <Icon d={Icons.bell} size={14} />
        {hasUnread && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full" style={{ background: NEX.amber }} />}
      </button>

      <button
        onClick={() => { clearAuth(); navigate('/login') }}
        className="h-9 w-9 rounded-md flex items-center justify-center"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        title="Sair"
      >
        <Icon d={Icons.logout} size={14} />
      </button>

      <Btn kind="primary" size="md" icon={Icons.plus} onClick={() => navigate('/sales?new=1')}>
        Nova venda
      </Btn>
    </div>
  )
}

