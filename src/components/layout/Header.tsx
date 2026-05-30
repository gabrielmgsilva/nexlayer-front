import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, Btn, NEX } from '@/lib/nex'
import { notificationsService } from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth.store'

const TITLES: Record<string, { title: string; breadcrumb: string }> = {
  // Standalone
  '/':                        { title: 'Dashboard',       breadcrumb: '' },
  '/notifications':           { title: 'Notificações',    breadcrumb: '' },

  // Comercial
  '/sales':                   { title: 'Vendas',          breadcrumb: 'Comercial' },
  '/settings/channels':       { title: 'Canais de venda', breadcrumb: 'Comercial' },
  '/settings/customers':      { title: 'Clientes',        breadcrumb: 'Comercial' },
  '/suppliers':               { title: 'Fornecedores',    breadcrumb: 'Comercial' },

  // Produção
  '/production/failures':     { title: 'Falhas de impressão',  breadcrumb: 'Produção' },
  '/production/maintenance':  { title: 'Manutenção preventiva', breadcrumb: 'Produção' },
  '/production':              { title: 'Produção',              breadcrumb: 'Produção' },
  '/products/templates':      { title: 'Templates de preço', breadcrumb: 'Produção' },
  '/products':                { title: 'Produtos',           breadcrumb: 'Produção' },
  '/resources/equipment':     { title: 'Equipamentos',    breadcrumb: 'Produção' },
  '/resources/materials':     { title: 'Matéria-prima',   breadcrumb: 'Produção' },
  '/resources/accessories':   { title: 'Acessórios',      breadcrumb: 'Produção' },

  // Financeiro
  '/calculator':               { title: 'Calculadora',           breadcrumb: 'Financeiro' },
  '/reports/profitability':    { title: 'Rentabilidade',          breadcrumb: 'Financeiro' },
  '/reports':                  { title: 'Relatórios',             breadcrumb: 'Financeiro' },
  '/settings/cost-center':     { title: 'Centro de custo',        breadcrumb: 'Financeiro' },
  '/resources/traceability':   { title: 'Rastreabilidade de lote', breadcrumb: 'Produção' },

  // Configurações
  '/settings/categories':             { title: 'Categorias de produto',   breadcrumb: 'Configurações' },
  '/settings/accessory-categories':   { title: 'Categorias de acessório', breadcrumb: 'Configurações' },
  '/settings/colors':                 { title: 'Cores',                   breadcrumb: 'Configurações' },
}

function deriveTitle(pathname: string) {
  // exact match first (handles /sales/123 via startsWith below)
  if (TITLES[pathname]) return TITLES[pathname]
  // longest prefix match — covers /sales/:id, /resources/*, /settings/*
  const match = Object.keys(TITLES)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? TITLES[match] : { title: 'NEXLAYER', breadcrumb: '' }
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

