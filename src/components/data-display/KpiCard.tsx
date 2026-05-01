import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  className?: string
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <div className={cn('rounded-xl bg-white border border-gray-200 shadow-sm p-5 min-w-0', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 font-mono">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary-50 p-2.5">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
      </div>
    </div>
  )
}
