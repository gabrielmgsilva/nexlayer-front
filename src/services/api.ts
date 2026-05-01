import axios, { type AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
})

// ── Request: injetar access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Let axios set multipart boundary automatically for FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] ??= 'application/json'
  }

  return config
})

// ── Response: refresh token automático ──────────────────────────
let refreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    if (refreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    original._retry = true
    refreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('no refresh token')

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const { accessToken, refreshToken: newRefresh } = data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefresh)

      queue.forEach((cb) => cb(accessToken))
      queue = []

      original.headers = original.headers ?? {}
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      refreshing = false
    }
  },
)

// ── Helper para extrair data da resposta wrapper ─────────────────
export function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}
