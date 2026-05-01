import { forwardRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface DensityInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** Current value in g/cm³ (e.g. 1.10) */
  value?: number
  /** Called with the numeric value in g/cm³ */
  onChange?: (value: number) => void
  error?: string
}


export const DensityInput = forwardRef<HTMLInputElement, DensityInputProps>(
  ({ className, error, value, onChange, ...props }, ref) => {
    const hundredths = Math.round((value ?? 0) * 100)
    const display = formatHundredths(hundredths)

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (
          e.key === 'Tab' ||
          e.key === 'Escape' ||
          e.key === 'Enter' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          return
        }

        e.preventDefault()

        if (e.key === 'Backspace') {
          const next = Math.floor(hundredths / 10)
          onChange?.(next / 100)
          return
        }

        if (e.key === 'Delete') {
          onChange?.(0)
          return
        }

        if (/^[0-9]$/.test(e.key)) {
          const next = hundredths * 10 + Number(e.key)
          // Cap at 99,99 g/cm³ (more than enough for any material)
          if (next > 9999) return
          onChange?.(next / 100)
        }
      },
      [hundredths, onChange],
    )

    const handlePaste = useCallback((e: React.ClipboardEvent) => e.preventDefault(), [])

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            inputMode="numeric"
            className={cn(
              'flex h-9 w-full rounded-md border border-gray-300 bg-white pl-3 pr-14 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-right',
              error && 'border-red-500 focus:ring-red-500',
              className,
            )}
            value={display}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onChange={() => {}}
            {...props}
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
            g/cm³
          </span>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)
DensityInput.displayName = 'DensityInput'

function formatHundredths(val: number): string {
  const abs = Math.abs(val)
  const intPart = Math.floor(abs / 100)
  const decPart = abs % 100
  return `${intPart},${decPart.toString().padStart(2, '0')}`
}
