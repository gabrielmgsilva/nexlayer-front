import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Pill, Btn, Icon, Icons, NEX } from '@/lib/nex'
import { notificationsService } from '@/services/notifications.service'
import type { Notification } from '@/types/api.types'

const TYPE_LABEL: Record<string, string> = {
  ACCESSORY_LOW: 'Acessório baixo',
  MATERIAL_LOW: 'Material baixo',
  PRODUCT_LOW: 'Produto baixo',
  LIFESPAN_WARNING: 'Vida útil',
  LIFESPAN_CRITICAL: 'Vida útil crítica',
  MAINTENANCE_DUE: 'Manutenção prevista',
  MAINTENANCE_OVERDUE: 'Manutenção atrasada',
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data: list = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsService.findAll() })
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = list.filter((n) => !n.isRead).length

  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[15px] font-semibold">Notificações</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>{unread} não lidas · {list.length} total</div>
        </div>
        {unread > 0 && (
          <Btn kind="ghost" size="sm" icon={Icons.check} className="ml-auto" onClick={() => markAll.mutate()}>
            Marcar todas como lidas
          </Btn>
        )}
      </div>

      <Card padding={false}>
        {list.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12px]" style={{ color: NEX.textMute }}>
            Nenhuma notificação no momento.
          </div>
        ) : (
          list.map((n: Notification) => {
            const tone = n.severity === 'CRITICAL' ? 'red' : n.severity === 'WARNING' ? 'amber' : 'cyan'
            return (
              <div
                key={n.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-[#11161E]"
                style={{ borderTop: `1px solid ${NEX.border}`, opacity: n.isRead ? 0.6 : 1 }}
              >
                <div className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                     style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX[tone] }}>
                  <Icon d={Icons.alert} size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill tone={tone}>{TYPE_LABEL[n.type] ?? n.type}</Pill>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full" style={{ background: NEX.cyan }} />}
                    <span className="ml-auto text-[10.5px]" style={{ color: NEX.textMute }}>
                      {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold mt-1">{n.title}</div>
                  <div className="text-[12px]" style={{ color: NEX.textDim }}>{n.message}</div>
                </div>
                {!n.isRead && (
                  <button onClick={() => markRead.mutate(n.id)} className="text-[11px]" style={{ color: NEX.cyan }}>
                    Marcar lida
                  </button>
                )}
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
