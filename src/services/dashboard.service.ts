import { api, unwrap } from './api'

export interface DashboardStats {
  revenue: number
  profit: number
  profitMargin: number
  totalDiscount: number
  totalShipping: number
  totalCost: number
  salesCount: number
  salesPrevCount: number
  inventoryValue: number
  inventoryProductValue: number
  inventoryMaterialValue: number
  jobsDelivered: number
  jobsTotal: number
  jobsPrevDelivered: number
  failureRate: number
  failureRatePrev: number
  ticketAvg: number

  dailyRevenue: { date: string; value: number }[]
  salesByStatus: { status: string; count: number }[]
  productionResults: { week: string; success: number; failed: number; partial: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]

  lowStock: {
    id: string; name: string; type: 'PRODUCT' | 'MATERIAL' | 'ACCESSORY'
    current: number; minimum: number
  }[]

  lateJobs: {
    id: string; jobNumber: string; dueDate: string; status: string
    product: { name: string }; customer?: { name: string }
  }[]

  recentSales: {
    id: string; orderNumber: string; status: string; shippingCost: number
    discount: number; createdAt: string
    channel?: { name: string }; customer?: { name: string }
    items: { quantity: number; unitPrice: number }[]
  }[]
}

export const dashboardService = {
  getStats: (params?: { month?: number; year?: number }) =>
    api.get<{ data: DashboardStats }>('/dashboard/stats', { params }).then(unwrap),
}
