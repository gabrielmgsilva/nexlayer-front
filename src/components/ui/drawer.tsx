import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, Icons, NEX } from '@/lib/nex'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export function Drawer({ open, onClose, title, children, width = 420 }: DrawerProps) {
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
          width, zIndex: 40,
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
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${NEX.border}` }}
        >
          <span className="text-[14px] font-semibold" style={{ color: NEX.text }}>{title}</span>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center transition-colors"
            style={{ color: NEX.textDim, background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = NEX.surface2 }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Icon d={Icons.x} size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
