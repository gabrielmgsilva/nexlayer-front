import { api, unwrap } from './api'
import type { Notification } from '@/types/api.types'

export const notificationsService = {
  findAll: async (): Promise<Notification[]> => {
    const result = await api.get<{ data: Notification[] }>('/notifications').then(unwrap)
    return Array.isArray(result) ? result : []
  },

  unreadCount: () =>
    api.get<{ data: { count: number } }>('/notifications/unread-count').then(unwrap),

  markRead: (id: string) =>
    api.patch<{ data: Notification }>(`/notifications/${id}/read`).then(unwrap),

  markAllRead: () =>
    api.patch('/notifications/read-all'),
}
