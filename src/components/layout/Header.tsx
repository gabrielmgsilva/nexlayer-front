import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Icon, Icons, Btn, NEX } from '@/lib/nex'
import { notificationsService } from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore, type ThemeMode } from '@/stores/theme.store'

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

// ─────────────────────────────────────────
// Theme toggle (claro / escuro / sistema)
// ─────────────────────────────────────────

const SUN_PATH = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>
)
const MOON_PATH = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
const MONITOR_PATH = (
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>
)

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const icon = mode === 'light' ? SUN_PATH : mode === 'dark' ? MOON_PATH : MONITOR_PATH
  const options: Array<{ value: ThemeMode; label: string; icon: ReactNode }> = [
    { value: 'light',  label: 'Claro',   icon: SUN_PATH },
    { value: 'dark',   label: 'Escuro',  icon: MOON_PATH },
    { value: 'system', label: 'Sistema', icon: MONITOR_PATH },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-md flex items-center justify-center"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        title="Tema"
      >
        <Icon d={icon} size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-11 z-30 rounded-md py-1 min-w-[148px]"
          style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setMode(opt.value); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-left hover:opacity-80"
              style={{
                background: mode === opt.value ? NEX.surface2 : 'transparent',
                color: mode === opt.value ? NEX.cyan : NEX.text,
              }}
            >
              <Icon d={opt.icon} size={13} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
