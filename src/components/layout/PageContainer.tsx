import { cn } from '@/lib/utils'

interface PageContainerProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageContainer({ title, subtitle, actions, children, className }: PageContainerProps) {
  return (
    <main className={cn('min-h-full', className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8">
        {(title || actions) && (
          <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {title && <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </main>
  )
}
