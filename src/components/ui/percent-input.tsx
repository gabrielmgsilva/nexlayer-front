import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'

export interface PercentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'min' | 'max'> {
  /** Current value in real units (e.g. 12.50 means 12,50%) */
  value?: number
  /** Called with the numeric value (e.g. 12.50) */
  onChange?: (value: number) => void
  error?: string
  /** Max value allowed (default 100) */
  max?: number
  min?: number
}

/**
 * Right-to-left percentage input.
 * Digits are entered from the right (hundredths first).
 * E.g. typing 1 → 2 → 5 → 0 produces: 0,01% → 0,12% → 1,25% → 12,50%
 */
export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  ({ className, error, value = 0, onChange, min, max = 100, ...props }, ref) => {
    return (
      <div className="w-full">
        <DecimalRtlInput
          ref={ref}
          value={value}
          min={min}
          onValueChange={(next) => onChange?.(Math.min(max, next))}
          max={max}
          suffix="%"
          className={cn(
            'flex h-9 w-full rounded-md border border-gray-300 bg-white pl-3 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-right',
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
PercentInput.displayName = 'PercentInput'
