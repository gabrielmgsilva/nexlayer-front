import { Toaster } from 'sonner'
import { useThemeStore } from '@/stores/theme.store'

export function AppToaster() {
  const resolved = useThemeStore((s) => s.resolved)

  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      gap={8}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:       'nex-toast',
          title:       'nex-toast-title',
          description: 'nex-toast-description',
          icon:        'nex-toast-icon',
          closeButton: 'nex-toast-close',
          actionButton:'nex-toast-action',
        },
      }}
    />
  )
}
