/**
 * NEXLAYER — Design tokens, Icons e componentes primitivos.
 * Espelha o protótipo HTML em novo-front/NEXLAYER, com style props inline.
 */
import * as React from 'react'

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Mapeados para CSS variables — alternam automaticamente com
   `[data-theme="light"|"dark"]` no <html>. Veja styles/globals.css.
   ═══════════════════════════════════════════════════════════════════ */
export const NEX = {
  bg:        'var(--nex-bg)',
  surface:   'var(--nex-surface)',
  surface2:  'var(--nex-surface-2)',
  border:    'var(--nex-border)',
  borderHi:  'var(--nex-border-hi)',
  text:      'var(--nex-text)',
  textDim:   'var(--nex-text-dim)',
  textMute:  'var(--nex-text-mute)',
  cyan:      'var(--nex-cyan)',
  cyanDim:   'var(--nex-cyan-dim)',
  green:     'var(--nex-green)',
  amber:     'var(--nex-amber)',
  red:       'var(--nex-red)',
  violet:    'var(--nex-violet)',
} as const

/** Helper for rgba/alpha blends that preserves theme switching.
 *  Uses CSS color-mix on the resolved CSS variable. */
export const nexAlpha = (token: keyof typeof NEX, alpha: number) =>
  `color-mix(in srgb, ${NEX[token]} ${Math.round(alpha * 100)}%, transparent)`

export type NexTone = 'default' | 'cyan' | 'green' | 'amber' | 'red' | 'violet'

/* ═══════════════════════════════════════════════════════════════════
   ICONS — line, 1.5 stroke, currentColor
   ═══════════════════════════════════════════════════════════════════ */
type IconProps = {
  d: string | React.ReactNode
  size?: number
  strokeWidth?: number
  fill?: string
  className?: string
  style?: React.CSSProperties
}

export const Icon = ({ d, size = 16, strokeWidth = 1.5, fill = 'none', className = '', style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

export const Icons = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  cart:      <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.7 11.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/></>,
  cube:      <><path d="M21 8.4 12 3 3 8.4v7.2L12 21l9-5.4V8.4Z"/><path d="m3 8.4 9 5.4 9-5.4M12 21V13.8"/></>,
  layers:    <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
  calc:      <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></>,
  cog:       <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
  printer:   <><path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/></>,
  search:    <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  bell:      <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  plus:      'M12 5v14M5 12h14',
  filter:    'M3 6h18M7 12h10M10 18h4',
  download:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
  more:      <><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></>,
  arrowUp:   'm18 15-6-6-6 6',
  arrowDown: 'm6 9 6 6 6-6',
  arrowRight:'m9 6 6 6-6 6',
  chevR:     'm9 18 6-6-6-6',
  chevD:     'm6 9 6 6 6-6',
  alert:     <><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check:     'm5 12 5 5L20 7',
  x:         'M18 6 6 18M6 6l12 12',
  edit:      <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  trash:     <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  truck:     <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  pkg:       <><path d="M16 8 8 4M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></>,
  spool:     <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></>,
  zap:       'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  link:      <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>,
  external:  <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="m15 3 6 0 0 6"/><path d="m10 14 11-11"/></>,
  trendUp:   <><path d="m22 7-8.5 8.5L9 11l-7 7"/><path d="M16 7h6v6"/></>,
  trendDown: <><path d="m22 17-8.5-8.5L9 13l-7-7"/><path d="M16 17h6v-6"/></>,
  back:      'm12 19-7-7 7-7M19 12H5',
  history:   <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
}

/* ═══════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */
type PillProps = { tone?: NexTone; children: React.ReactNode; dot?: boolean; className?: string }
export const Pill = ({ tone = 'default', children, dot, className = '' }: PillProps) => {
  const tones: Record<NexTone, { bg: string; color: string; border: string }> = {
    default: { bg: nexAlpha('textDim', 0.10), color: NEX.textDim, border: nexAlpha('textDim', 0.20) },
    cyan:    { bg: nexAlpha('cyan',    0.10), color: NEX.cyan,    border: nexAlpha('cyan',    0.25) },
    green:   { bg: nexAlpha('green',   0.10), color: NEX.green,   border: nexAlpha('green',   0.25) },
    amber:   { bg: nexAlpha('amber',   0.10), color: NEX.amber,   border: nexAlpha('amber',   0.25) },
    red:     { bg: nexAlpha('red',     0.10), color: NEX.red,     border: nexAlpha('red',     0.25) },
    violet:  { bg: nexAlpha('violet',  0.10), color: NEX.violet,  border: nexAlpha('violet',  0.25) },
  }
  const t = tones[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium tabular-nums whitespace-nowrap ${className}`}
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }} />}
      {children}
    </span>
  )
}

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: BtnKind
  size?: BtnSize
  icon?: string | React.ReactNode
}
export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { kind = 'ghost', size = 'md', icon, children, className = '', style, ...rest }, ref,
) {
  const sizes = { sm: 'h-7 px-2.5 text-[12px] gap-1', md: 'h-8 px-3 text-[12.5px] gap-1.5', lg: 'h-10 px-4 text-sm gap-2' }
  const kinds: Record<BtnKind, { bg: string; color: string; border: string; shadow?: string }> = {
    primary: { bg: NEX.cyan, color: 'var(--nex-on-primary)', border: NEX.cyan, shadow: `0 0 0 1px ${NEX.cyan}, 0 4px 18px -4px ${nexAlpha('cyan', 0.5)}` },
    ghost:   { bg: 'transparent', color: NEX.text, border: NEX.border },
    soft:    { bg: NEX.surface2, color: NEX.text, border: NEX.border },
    danger:  { bg: nexAlpha('red', 0.10), color: NEX.red, border: nexAlpha('red', 0.30) },
  }
  const k = kinds[kind]
  return (
    <button
      ref={ref}
      {...rest}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={{
        background: k.bg,
        color: k.color,
        border: `1px solid ${k.border}`,
        boxShadow: k.shadow ?? 'none',
        ...style,
      }}
    >
      {icon && <Icon d={icon} size={size === 'sm' ? 13 : 14} />}
      {children}
    </button>
  )
})

type CardProps = { children: React.ReactNode; className?: string; style?: React.CSSProperties; padding?: boolean }
export const Card = ({ children, className = '', style = {}, padding = true }: CardProps) => (
  <div className={`rounded-xl ${className}`} style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, ...style }}>
    {padding ? <div className="p-4">{children}</div> : children}
  </div>
)

type MoneyProps = { value: number | string | null | undefined; className?: string; muted?: boolean }
export const Money = ({ value, className = '', muted = false }: MoneyProps) => {
  const num = Number(value ?? 0)
  return (
    <span className={`font-mono tabular-nums ${className}`} style={{ color: muted ? NEX.textDim : 'inherit' }}>
      R$ {num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

type NumProps = { value: number | string | null | undefined; decimals?: number; suffix?: string; className?: string }
export const Num = ({ value, decimals = 0, suffix = '', className = '' }: NumProps) => (
  <span className={`font-mono tabular-nums ${className}`}>
    {Number(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
  </span>
)

type BarTone = 'cyan' | 'green' | 'amber' | 'red'
type BarProps = { value: number; max?: number; tone?: BarTone; height?: number; className?: string }
export const Bar = ({ value, max = 100, tone = 'cyan', height = 4, className = '' }: BarProps) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors: Record<BarTone, string> = { cyan: NEX.cyan, green: NEX.green, amber: NEX.amber, red: NEX.red }
  return (
    <div className={`w-full rounded-full overflow-hidden ${className}`} style={{ height, background: NEX.border }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[tone], boxShadow: `0 0 8px ${colors[tone]}` }} />
    </div>
  )
}

type SparkProps = { data: number[]; color?: string; width?: number; height?: number; fill?: boolean }
export const Spark = ({ data, color = NEX.cyan, width = 80, height = 24, fill = true }: SparkProps) => {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : width
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`).join(' ')
  const fillPath = `M0,${height} L${points.split(' ').join(' L')} L${width},${height} Z`
  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && <path d={fillPath} fill={color} fillOpacity={0.1} />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type DonutSegment = { value: number; color: string }
type DonutProps = {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string | number
}
export const Donut = ({ segments, size = 80, thickness = 10, centerLabel, centerValue }: DonutProps) => {
  const r = (size - thickness) / 2
  const cx = size / 2
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = 0
  const C = 2 * Math.PI * r
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={NEX.border} strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * C
          const dasharray = `${len} ${C - len}`
          const dashoffset = -offset
          offset += len
          return (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={dasharray} strokeDashoffset={dashoffset} strokeLinecap="butt" />
          )
        })}
      </svg>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-base font-bold" style={{ color: NEX.text }}>{centerValue}</div>
          {centerLabel && <div className="text-[9px] uppercase tracking-wider" style={{ color: NEX.textMute }}>{centerLabel}</div>}
        </div>
      )}
    </div>
  )
}

type ProductThumbProps = { id?: string; name?: string; size?: number; className?: string; photoUrl?: string | null }
export const ProductThumb = ({ id, name, size = 32, className = '', photoUrl }: ProductThumbProps) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ?? ''}
        className={`rounded object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  // Hash the name into a deterministic color/glyph palette
  const palette = [
    { bg: '#FACC15', color: '#1F2937' },
    { bg: '#374151', color: '#F9FAFB' },
    { bg: '#A78BFA', color: '#1F2937' },
    { bg: '#00D9FF', color: '#000' },
    { bg: '#F472B6', color: '#1F2937' },
    { bg: '#5EFF8A', color: '#001F26' },
    { bg: '#FFB547', color: '#1A1100' },
    { bg: '#FF5C7A', color: '#FFFFFF' },
  ]
  const seed = id ?? name ?? '?'
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const m = palette[hash % palette.length]
  const glyph = (name ?? '?').trim().charAt(0).toUpperCase() || '•'
  return (
    <div
      className={`flex items-center justify-center rounded ${className}`}
      style={{ width: size, height: size, background: m.bg, color: m.color, fontSize: size * 0.5, fontWeight: 700, lineHeight: 1 }}
    >
      {glyph}
    </div>
  )
}

type FilamentDotProps = { color?: string; size?: number }
export const FilamentDot = ({ color = NEX.borderHi, size = 10 }: FilamentDotProps) => (
  <span
    className="inline-block rounded-full border"
    style={{ width: size, height: size, background: color, borderColor: 'rgba(255,255,255,0.15)' }}
  />
)

/* ═══════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════ */
export const SALE_STATUS: Record<string, { label: string; tone: NexTone }> = {
  PENDING:   { label: 'Pendente',   tone: 'amber' },
  CONFIRMED: { label: 'Confirmado', tone: 'cyan' },
  SHIPPED:   { label: 'Enviado',    tone: 'violet' },
  DELIVERED: { label: 'Entregue',   tone: 'green' },
  CANCELLED: { label: 'Cancelado',  tone: 'red' },
}

export const EQUIPMENT_STATUS: Record<string, { label: string; tone: NexTone }> = {
  AVAILABLE:    { label: 'Disponível', tone: 'green' },
  PRINTING:     { label: 'Imprimindo', tone: 'cyan' },
  MAINTENANCE:  { label: 'Manutenção', tone: 'amber' },
  OFFLINE:      { label: 'Offline',    tone: 'default' },
  INACTIVE:     { label: 'Inativo',    tone: 'default' },
}

export const JOB_STATUS_TONE: Record<string, NexTone> = {
  QUOTED:       'violet',
  QUEUED:       'default',
  PRINTING:     'cyan',
  POST_PROCESS: 'amber',
  QUALITY_CHECK:'cyan',
  PACKING:      'violet',
  READY:        'green',
  DELIVERED:    'default',
  CANCELLED:    'red',
}
