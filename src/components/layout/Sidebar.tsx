import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, NEX } from '@/lib/nex'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore, useIsMobile } from '@/stores/ui.store'
import { salesService } from '@/services/entities.service'

type NavItem = { id: string; label: string; icon: React.ReactNode; path: string; badge?: number }
type NavGroup = { label: string; items: NavItem[] }

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const isMobile = useIsMobile()
  const { sidebarMobileOpen, setSidebarMobileOpen } = useUiStore()

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
        { id: 'production',   label: 'Produção',          icon: Icons.printer,  path: '/production' },
        { id: 'farmview',     label: 'Print Farm View',   icon: Icons.dashboard, path: '/production/farmview' },
        { id: 'capacity',     label: 'Capacidade',        icon: Icons.clock,    path: '/production/capacity' },
        { id: 'failures',     label: 'Falhas',            icon: Icons.alert,    path: '/production/failures' },
        { id: 'maintenance',  label: 'Manutenção',        icon: Icons.clock,    path: '/production/maintenance' },
        { id: 'products',     label: 'Produtos',          icon: Icons.pkg,      path: '/products' },
        { id: 'templates',    label: 'Templates de preço', icon: Icons.zap,     path: '/products/templates' },
        { id: 'equipment',    label: 'Equipamentos',      icon: Icons.printer,  path: '/resources/equipment' },
        { id: 'materials',    label: 'Matéria-prima',     icon: Icons.spool,    path: '/resources/materials' },
        { id: 'accessories',  label: 'Acessórios',        icon: Icons.pkg,      path: '/resources/accessories' },
        { id: 'traceability', label: 'Rastreabilidade',   icon: Icons.history,  path: '/resources/traceability' },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { id: 'calc',            label: 'Calculadora',    icon: Icons.calc,     path: '/calculator' },
        { id: 'reports',         label: 'Relatórios',     icon: Icons.trendUp,  path: '/reports' },
        { id: 'profitability',   label: 'Rentabilidade',  icon: Icons.zap,      path: '/reports/profitability' },
        { id: 'cost-center',     label: 'Centro de custo', icon: Icons.cog,     path: '/settings/cost-center' },
      ],
    },
    {
      label: 'Configurações',
      items: [
        { id: 'categories',           label: 'Categ. de produto',   icon: Icons.layers, path: '/settings/categories' },
        { id: 'accessory-categories', label: 'Categ. de acessório', icon: Icons.pkg,    path: '/settings/accessory-categories' },
        { id: 'colors',               label: 'Cores',               icon: Icons.spool,  path: '/settings/colors' },
        { id: 'brands',               label: 'Marcas',              icon: Icons.zap,    path: '/settings/brands' },
        { id: 'slicer-profiles',      label: 'Perfis de fatiamento', icon: Icons.cog,   path: '/settings/slicer-profiles' },
      ],
    },
  ]

  const allPaths = groups.flatMap((g) => g.items.map((i) => i.path))

  // Apenas o item mais específico (maior prefixo) fica ativo
  const bestMatch = allPaths
    .filter((p) => p !== '/' && location.pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0] ?? (location.pathname === '/' ? '/' : null)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : bestMatch === path

  const initials = (user?.name ?? 'NX')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleNavClick = (path: string) => {
    navigate(path)
    if (isMobile) setSidebarMobileOpen(false)
  }

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        width: 240,
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        transform: sidebarMobileOpen ? 'translateX(0)' : 'translateX(-240px)',
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        background: NEX.surface,
        borderRight: `1px solid ${NEX.border}`,
      }
    : {
        width: 220,
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        background: NEX.surface,
        borderRight: `1px solid ${NEX.border}`,
      }

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && (
        <div
          onClick={() => setSidebarMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            opacity: sidebarMobileOpen ? 1 : 0,
            pointerEvents: sidebarMobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.22s ease',
          }}
        />
      )}

      <aside className="flex flex-col" style={sidebarStyle}>
        <div
          className="px-5 py-5 flex items-center gap-2.5"
          style={{ borderBottom: `1px solid ${NEX.border}` }}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
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
                      onClick={() => handleNavClick(it.path)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[12.5px] font-medium transition-all relative"
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

        <div className="px-3 py-3 space-y-1.5" style={{ borderTop: `1px solid ${NEX.border}` }}>
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
            <button
              onClick={() => { clearAuth(); navigate('/login') }}
              className="h-7 w-7 rounded flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100"
              style={{ color: NEX.textDim }}
              title="Sair"
            >
              <Icon d={Icons.logout} size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
