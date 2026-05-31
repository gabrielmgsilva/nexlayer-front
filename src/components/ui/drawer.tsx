import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, Icons, NEX } from '@/lib/nex'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
  /** Mensagem de erro exibida inline abaixo do header */
  error?: string | null
}

export function Drawer({ open, onClose, title, children, width = 420, error }: DrawerProps) {
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setClosing(false)
      setVisible(true)
    } else if (visible) {
      setClosing(true)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setClosing(false)
      }, 220)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!visible) return null

  const panelWidth = `min(${width}px, 100vw)`

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 35,
          background: 'rgba(7, 9, 12, 0.65)',
          backdropFilter: 'blur(4px)',
          animation: closing ? 'nex-overlay-in 0.22s ease reverse' : 'nex-overlay-in 0.22s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: panelWidth, zIndex: 40,
          display: 'flex', flexDirection: 'column',
          background: NEX.surface,
          borderLeft: `1px solid ${NEX.border}`,
          boxShadow: '-24px 0 48px rgba(0,0,0,0.35)',
          animation: closing
            ? 'nex-drawer-out 0.22s cubic-bezier(0.4,0,1,1) forwards'
            : 'nex-drawer-in 0.25s cubic-bezier(0,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${NEX.border}` }}
        >
          <span className="text-[14px] font-semibold" style={{ color: NEX.text }}>{title}</span>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-colors"
            style={{ color: NEX.textDim, background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = NEX.surface2 }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Icon d={Icons.x} size={14} />
          </button>
        </div>

        {/* Inline error banner */}
        {error && (
          <div
            className="px-5 py-3 text-[12.5px] flex items-start gap-2 flex-shrink-0"
            style={{
              background: `color-mix(in srgb, ${NEX.red} 10%, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, ${NEX.red} 25%, transparent)`,
              color: NEX.red,
            }}
          >
            <Icon d={Icons.alert} size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
