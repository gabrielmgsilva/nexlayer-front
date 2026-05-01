import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>
}

interface FieldTooltipProps {
  content: React.ReactNode
  className?: string
}

export function FieldTooltip({ content, className }: FieldTooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className={cn('inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors', className)}
          aria-label="Ajuda"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-white drop-shadow-sm" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
