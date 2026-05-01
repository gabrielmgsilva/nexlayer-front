import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'min' | 'max'> {
  /** Current value in "real" units (e.g. 12.50 means R$ 12,50) */
  value?: number
  /** Called with the numeric value in "real" units */
  onChange?: (value: number) => void
  error?: string
  min?: number
  max?: number
}

/**
 * Right-to-left currency input.
 * Digits are entered from the right (cents first).
 * E.g. typing 1 → 2 → 3 → 5 → 0 produces: 0,01 → 0,12 → 1,23 → 12,35 → 123,50
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, error, value = 0, onChange, min, max, ...props }, ref) => {
    return (
      <div className="w-full">
        <DecimalRtlInput
          ref={ref}
          value={value}
          onValueChange={(next) => onChange?.(next)}
          min={min}
          max={max}
          prefix="R$"
          className={cn(
            'flex h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-right',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'
