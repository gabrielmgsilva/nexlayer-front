import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, NEX } from '@/lib/nex'
import { notificationsService } from '@/services/notifications.service'
import { useUiStore } from '@/stores/ui.store'
import { salesService, productsService, customersService } from '@/services/entities.service'
import type { SaleOrder, Product, Customer } from '@/types/api.types'

const TITLES: Record<string, { title: string; breadcrumb: string }> = {
  '/':                        { title: 'Dashboard',             breadcrumb: '' },
  '/notifications':           { title: 'Notificações',          breadcrumb: '' },
  '/sales':                   { title: 'Vendas',                breadcrumb: 'Comercial' },
  '/settings/channels':       { title: 'Canais de venda',       breadcrumb: 'Comercial' },
  '/settings/customers':      { title: 'Clientes',              breadcrumb: 'Comercial' },
  '/suppliers':               { title: 'Fornecedores',          breadcrumb: 'Comercial' },
  '/production/failures':     { title: 'Falhas de impressão',   breadcrumb: 'Produção' },
  '/production/maintenance':  { title: 'Manutenção preventiva', breadcrumb: 'Produção' },
  '/production/farmview':     { title: 'Print Farm View',       breadcrumb: 'Produção' },
  '/production/capacity':     { title: 'Planejamento de capacidade', breadcrumb: 'Produção' },
  '/production':              { title: 'Produção',              breadcrumb: 'Produção' },
  '/products/templates':      { title: 'Templates de preço',    breadcrumb: 'Produção' },
  '/products':                { title: 'Produtos',              breadcrumb: 'Produção' },
  '/resources/equipment':     { title: 'Equipamentos',          breadcrumb: 'Produção' },
  '/resources/materials':     { title: 'Matéria-prima',         breadcrumb: 'Produção' },
  '/resources/accessories':   { title: 'Acessórios',            breadcrumb: 'Produção' },
  '/resources/traceability':  { title: 'Rastreabilidade de lote', breadcrumb: 'Produção' },
  '/calculator':              { title: 'Calculadora',           breadcrumb: 'Financeiro' },
  '/reports/profitability':   { title: 'Rentabilidade',         breadcrumb: 'Financeiro' },
  '/reports':                 { title: 'Relatórios',            breadcrumb: 'Financeiro' },
  '/settings/cost-center':    { title: 'Centro de custo',       breadcrumb: 'Financeiro' },
  '/settings/categories':           { title: 'Categorias de produto',   breadcrumb: 'Configurações' },
  '/settings/accessory-categories': { title: 'Categorias de acessório', breadcrumb: 'Configurações' },
  '/settings/colors':               { title: 'Cores',                   breadcrumb: 'Configurações' },
  '/settings/brands':               { title: 'Marcas',                  breadcrumb: 'Configurações' },
  '/settings/slicer-profiles':      { title: 'Perfis de fatiamento',     breadcrumb: 'Configurações' },
}

function deriveTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? TITLES[match] : { title: 'NEXLAYER', breadcrumb: '' }
}

// ── Global search ─────────────────────────────────────────────
function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim()

  const { data: salesRes } = useQuery({
    queryKey: ['search', 'sales', q],
    queryFn: () => salesService.findAll({ limit: 5 }),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })
  const { data: productsRes } = useQuery({
    queryKey: ['search', 'products', q],
    queryFn: () => productsService.findAll({ limit: 5, isActive: true }),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })
  const { data: customersRes } = useQuery({
    queryKey: ['search', 'customers', q],
    queryFn: () => customersService.findAll({ limit: 5, isActive: true }),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })

  const lq = q.toLowerCase()
  const sales: SaleOrder[] = (salesRes?.data ?? []).filter((s) =>
    s.orderNumber.toLowerCase().includes(lq) ||
    (s.customer?.name ?? '').toLowerCase().includes(lq),
  )
  const products: Product[] = (productsRes?.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(lq) || (p.sku ?? '').toLowerCase().includes(lq),
  )
  const customers: Customer[] = (customersRes?.data ?? []).filter((c) =>
    (c.name ?? '').toLowerCase().includes(lq),
  )

  const hasResults = q.length >= 2 && (sales.length > 0 || products.length > 0 || customers.length > 0)

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const go = (path: string) => {
    navigate(path); setQuery(''); setOpen(false); inputRef.current?.blur()
  }

  return (
    <div className="relative hidden md:block flex-shrink-0">
      <div
        className="flex items-center gap-2.5 px-3 h-9 rounded-md w-72"
        style={{ background: NEX.surface, border: `1px solid ${open ? 'var(--nex-cyan)' : NEX.border}` }}
      >
        <Icon d={Icons.search} size={13} className="opacity-50 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar pedidos, produtos, clientes..."
          className="bg-transparent flex-1 text-[12.5px] focus:outline-none placeholder:opacity-50 min-w-0"
          style={{ color: NEX.text }}
        />
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: NEX.surface2, color: NEX.textMute }}>
          ⌘K
        </kbd>
      </div>

      {open && hasResults && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQuery('') }} />
          <div
            className="absolute top-full left-0 mt-1 w-80 rounded-xl overflow-hidden z-50"
            style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {sales.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: NEX.textMute, background: NEX.surface2 }}>Vendas</div>
                {sales.map((s) => (
                  <button key={s.id} onClick={() => go(`/sales/${s.id}`)} className="w-full text-left px-3 py-2 hover:bg-[#11161E] flex items-center justify-between">
                    <span className="font-mono text-[12px]">{s.orderNumber}</span>
                    <span className="text-[11.5px] truncate max-w-[50%]" style={{ color: NEX.textDim }}>{s.customer?.name ?? '—'}</span>
                  </button>
                ))}
              </div>
            )}
            {products.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: NEX.textMute, background: NEX.surface2 }}>Produtos</div>
                {products.map((p) => (
                  <button key={p.id} onClick={() => go('/products')} className="w-full text-left px-3 py-2 hover:bg-[#11161E] flex items-center justify-between">
                    <span className="text-[12px] font-medium">{p.name}</span>
                    {p.sku && <span className="text-[11px] font-mono" style={{ color: NEX.textMute }}>{p.sku}</span>}
                  </button>
                ))}
              </div>
            )}
            {customers.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: NEX.textMute, background: NEX.surface2 }}>Clientes</div>
                {customers.map((c) => (
                  <button key={c.id} onClick={() => go('/settings/customers')} className="w-full text-left px-3 py-2 hover:bg-[#11161E]">
                    <span className="text-[12px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = deriveTitle(location.pathname)
  const { setSidebarMobileOpen } = useUiStore()

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const hasUnread = (unread?.count ?? 0) > 0

  const iconBtnStyle: React.CSSProperties = {
    background: NEX.surface,
    border: `1px solid ${NEX.border}`,
  }

  return (
    <div
      className="sticky top-0 z-20 px-4 md:px-8 py-3 md:py-4 flex items-center gap-2 md:gap-4"
      style={{
        background: `color-mix(in srgb, ${NEX.bg} 85%, transparent)`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${NEX.border}`,
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0"
        style={iconBtnStyle}
        onClick={() => setSidebarMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Icon d={Icons.menu} size={16} />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {t.breadcrumb && (
          <div className="text-[10px] md:text-[10.5px] uppercase tracking-wider font-medium mb-0.5 hidden sm:block" style={{ color: NEX.textMute }}>
            {t.breadcrumb}
          </div>
        )}
        <h1 className="text-[16px] md:text-[20px] font-semibold tracking-tight truncate">{t.title}</h1>
      </div>

      {/* Global search */}
      <GlobalSearch />

      {/* Notifications */}
      <button
        onClick={() => navigate('/notifications')}
        className="h-9 w-9 rounded-md flex items-center justify-center relative flex-shrink-0"
        style={iconBtnStyle}
        title="Notificações"
      >
        <Icon d={Icons.bell} size={14} />
        {hasUnread && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full" style={{ background: NEX.amber }} />}
      </button>
    </div>
  )
}
