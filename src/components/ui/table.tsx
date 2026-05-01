import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-gray-200 bg-gray-50', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-gray-100', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-gray-50 data-[state=selected]:bg-primary-50', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-gray-500', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-gray-700', className)} {...props} />
}

export function TableEmpty({ colSpan, message = 'Nenhum resultado encontrado.' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-gray-400">{message}</td>
    </tr>
  )
}
