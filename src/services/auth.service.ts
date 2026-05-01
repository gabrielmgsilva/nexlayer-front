import { api, unwrap } from './api'
import type { LoginResponse } from '@/types/api.types'

export interface SetupStatus {
  hasEquipment: boolean
  hasMaterial: boolean
  hasMaterialStock: boolean
  hasProduct: boolean
  hasCostConfig: boolean
  onboardingCompletedAt: string | null
  completed: boolean
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ data: LoginResponse }>('/auth/login', { email, password }).then(unwrap),

  register: (name: string, email: string, password: string) =>
    api.post<{ data: LoginResponse }>('/auth/register', { name, email, password }).then(unwrap),

  logout: () => api.post('/auth/logout'),

  getSetupStatus: () =>
    api.get<{ data: SetupStatus }>('/auth/me/setup-status').then(unwrap),

  completeOnboarding: () =>
    api.patch<{ data: { id: string; onboardingCompletedAt: string } }>(
      '/auth/me/onboarding-complete',
    ).then(unwrap),
}
