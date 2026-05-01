import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default:  'bg-gray-100 text-gray-700',
        success:  'bg-emerald-100 text-emerald-700',
        warning:  'bg-amber-100 text-amber-700',
        error:    'bg-red-100 text-red-700',
        info:     'bg-sky-100 text-sky-700',
        primary:  'bg-primary-100 text-primary-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
