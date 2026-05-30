import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, NEX } from '@/lib/nex'
import { useAuthStore } from '@/stores/auth.store'
import { salesService } from '@/services/entities.service'

type NavItem = { id: string; label: string; icon: React.ReactNode; path: string; badge?: number }
type NavGroup = { label: string; items: NavItem[] }

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const { data: pendingSales } = useQuery({
    queryKey: ['sales', 'badge-pending'],
    queryFn: () => salesService.findAll({ status: 'PENDING', limit: 1, page: 1 }),
    staleTime: 60_000,
  })
  const pendingCount = pendingSales?.meta?.total ?? 0

  const groups: NavGroup[] = [
    {
      label: '',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard, path: '/' },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { id: 'sales',       label: 'Vendas',           icon: Icons.cart,     path: '/sales',                badge: pendingCount },
        { id: 'channels',    label: 'Canais de venda',  icon: Icons.link,     path: '/settings/channels' },
        { id: 'customers',   label: 'Clientes',         icon: Icons.user,     path: '/settings/customers' },
        { id: 'suppliers',   label: 'Fornecedores',     icon: Icons.pkg,      path: '/suppliers' },
      ],
    },
    {
      label: 'Produção',
      items: [
        { id: 'production',   label: 'Produção',       icon: Icons.printer,  path: '/production' },
        { id: 'products',     label: 'Produtos',       icon: Icons.pkg,      path: '/products' },
        { id: 'equipment',    label: 'Equipamentos',   icon: Icons.printer,  path: '/resources/equipment' },
        { id: 'materials',    label: 'Matéria-prima',  icon: Icons.spool,    path: '/resources/materials' },
        { id: 'accessories',  label: 'Acessórios',     icon: Icons.pkg,      path: '/resources/accessories' },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { id: 'calc',         label: 'Calculadora',    icon: Icons.calc,     path: '/calculator' },
        { id: 'reports',      label: 'Relatórios',     icon: Icons.trendUp,  path: '/reports' },
        { id: 'cost-center',  label: 'Centro de custo', icon: Icons.cog,    path: '/settings/cost-center' },
      ],
    },
    {
      label: 'Configurações',
      items: [
        { id: 'colors', label: 'Cores', icon: Icons.spool, path: '/settings/colors' },
      ],
    },
  ]

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const initials = (user?.name ?? 'NX')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside
      className="flex flex-col flex-shrink-0 sticky top-0 h-screen"
      style={{ width: 220, background: NEX.surface, borderRight: `1px solid ${NEX.border}` }}
    >
      <div
        className="px-5 py-5 flex items-center gap-2.5"
        style={{ borderBottom: `1px solid ${NEX.border}` }}
      >
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #B388FF 100%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M3 12l9 4 9-4" />
            <path d="M3 17l9 4 9-4" />
          </svg>
        </div>
        <div>
          <div className="text-[14px] font-bold tracking-tight">NEXLAYER</div>
          <div className="text-[10px] font-mono" style={{ color: NEX.textMute }}>v0.5.0 BETA</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            {group.label && (
              <div className="px-3 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = isActive(it.path)
                return (
                  <button
                    key={it.id}
                    onClick={() => navigate(it.path)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium transition-all relative"
                    style={{
                      background: active ? NEX.cyanDim : 'transparent',
                      color: active ? NEX.cyan : NEX.textDim,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = NEX.surface2 }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ background: NEX.cyan }} />
                    )}
                    <Icon d={it.icon} size={15} />
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.badge ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold" style={{ background: NEX.amber, color: '#1A1100' }}>
                        {it.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: `1px solid ${NEX.border}` }}>
        <div
          className="px-3 py-2 rounded-md flex items-center gap-2.5"
          style={{ background: NEX.surface2 }}
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10.5px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00D9FF, #B388FF)', color: '#07090C' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium truncate">{user?.name ?? 'Usuário'}</div>
            <div className="text-[10px] truncate" style={{ color: NEX.textMute }}>{user?.email ?? 'NEXLAYER'}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
