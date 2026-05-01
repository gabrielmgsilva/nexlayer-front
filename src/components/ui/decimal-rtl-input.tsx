import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function parseRightToLeftDecimal(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const numeric = Number(digits || '0') / 100
  return Number.isFinite(numeric) ? numeric : 0
}

function clampDecimal(value: number, min?: number, max?: number) {
  let next = value
  if (typeof min === 'number') next = Math.max(min, next)
  if (typeof max === 'number') next = Math.min(max, next)
  return next
}

export interface DecimalRtlInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange'> {
  value: number
  onValueChange: (next: number) => void
  min?: number
  max?: number
  prefix?: string
  suffix?: string
  containerClassName?: string
}

export const DecimalRtlInput = forwardRef<HTMLInputElement, DecimalRtlInputProps>(
  ({
    value,
    onValueChange,
    min,
    max,
    prefix,
    suffix,
    className,
    containerClassName,
    ...rest
  }, ref) => {
    const safeValue = Number.isFinite(value) ? value : 0

    return (
      <div className={cn('relative w-full', containerClassName)}>
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[11px]" style={{ color: 'inherit', opacity: 0.7 }}>
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={decimalFormatter.format(safeValue)}
          onChange={(e) => {
            const parsed = parseRightToLeftDecimal(e.target.value)
            onValueChange(clampDecimal(parsed, min, max))
          }}
          className={cn(
            'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none text-right tabular-nums',
            prefix && 'pl-10',
            suffix && 'pr-8',
            className,
          )}
          {...rest}
        />

        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[11px]" style={{ color: 'inherit', opacity: 0.7 }}>
            {suffix}
          </span>
        )}
      </div>
    )
  },
)

DecimalRtlInput.displayName = 'DecimalRtlInput'
