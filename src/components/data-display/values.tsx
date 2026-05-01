import { cn, formatCurrency, formatPercent } from '@/lib/utils'

/**
 * <Money> — exibe um valor monetário em BRL com fonte monoespaçada e
 * alinhamento tabular. Aceita um sufixo livre (ex: "/kg", "/kWh").
 */
interface MoneyProps {
  value: number | string | null | undefined
  suffix?: string
  className?: string
}

export function Money({ value, suffix, className }: MoneyProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatCurrency(value)}{suffix}
    </span>
  )
}

/**
 * <Pct> — exibe um valor percentual (escala 0-100) com fonte monoespaçada
 * e alinhamento tabular. Ex: value=5.2 → "5.2%".
 */
interface PctProps {
  value: number | string | null | undefined
  className?: string
}

export function Pct({ value, className }: PctProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatPercent(value)}
    </span>
  )
}
