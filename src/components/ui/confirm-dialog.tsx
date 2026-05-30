import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  loading?: boolean
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmar', onConfirm, loading, variant = 'danger',
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          {/* Icon badge */}
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDanger ? nexAlpha('red', 0.12) : nexAlpha('cyan', 0.12),
              border: `1px solid ${isDanger ? nexAlpha('red', 0.25) : nexAlpha('cyan', 0.25)}`,
            }}
          >
            <Icon
              d={isDanger ? Icons.alert : Icons.check}
              size={18}
              style={{ color: isDanger ? NEX.red : NEX.cyan }}
            />
          </div>

          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Btn
            kind="ghost"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Btn>
          <Btn
            kind={isDanger ? 'danger' : 'primary'}
            size="md"
            disabled={loading}
            onClick={onConfirm}
            style={loading ? { opacity: 0.6 } : undefined}
          >
            {loading && (
              <svg
                style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', marginRight: 4 }}
                viewBox="0 0 24 24" fill="none"
              >
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {confirmLabel}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
