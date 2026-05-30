import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Icon, Icons, NEX } from '@/lib/nex'

export const Dialog        = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose   = DialogPrimitive.Close

export function DialogOverlay(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      {...props}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7, 9, 12, 0.65)',
        backdropFilter: 'blur(4px)',
        animation: 'nex-dialog-overlay-in 0.18s ease',
      }}
    />
  )
}

export function DialogContent({ children, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        style={{
          position: 'fixed',
          left: '50%', top: '50%',
          zIndex: 50,
          width: '100%', maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 12,
          background: NEX.surface,
          border: `1px solid ${NEX.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          padding: '24px',
          outline: 'none',
          animation: 'nex-dialog-in 0.2s cubic-bezier(0,0,0.2,1)',
        }}
      >
        {children}
        <DialogPrimitive.Close
          style={{
            position: 'absolute', right: 16, top: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            color: NEX.textMute,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = NEX.surface2
            e.currentTarget.style.color = NEX.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = NEX.textMute
          }}
        >
          <Icon d={Icons.x} size={14} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ marginBottom: 20 }} {...props}>{children}</div>
}

export function DialogTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <DialogPrimitive.Title
      {...props}
      style={{ fontSize: 15, fontWeight: 600, color: NEX.text, lineHeight: 1.4 }}
    >
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <DialogPrimitive.Description
      {...props}
      style={{ marginTop: 6, fontSize: 13, color: NEX.textDim, lineHeight: 1.6 }}
    >
      {children}
    </DialogPrimitive.Description>
  )
}

export function DialogFooter({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}
    >
      {children}
    </div>
  )
}
