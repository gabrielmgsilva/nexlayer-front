import { JOB_STATUS_LABELS, JOB_STATUS_BG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = JOB_STATUS_LABELS[status] ?? status
  const bg = JOB_STATUS_BG[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', bg, className)}>
      {label}
    </span>
  )
}
