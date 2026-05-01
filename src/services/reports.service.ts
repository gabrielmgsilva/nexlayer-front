import { api, unwrap } from './api'

export interface PnlData {
  window: { from: string; to: string }
  ordersCount: number
  revenue: number
  discount: number
  netRevenue: number
  cogs: number
  shipping: number
  commissions: number
  fixedFees: number
  variableFees: number
  totalFees: number
  grossProfit: number
  margin: number
  daily: Array<{ day: string; revenue: number; profit: number }>
}

export interface PnlChannelRow extends PnlData {
  channelId: string
  channelName: string
}

export interface PnlByChannelResponse {
  window: { from: string; to: string }
  channels: PnlChannelRow[]
}

export interface CommissionsResponse {
  window: { from: string; to: string }
  total: number
  channels: Array<{
    channelId: string
    channelName: string
    revenue: number
    commissions: number
    fixedFees: number
    variableFees: number
    total: number
  }>
}

export interface CostVarianceRow {
  jobId: string
  jobNumber: string
  productName: string
  equipmentName: string | null
  deliveredAt: string | null
  quantity: number
  snapshotMaterialCost: number
  realMaterialCost: number
  snapshotTotalCost: number
  realTotalCost: number
  deltaAbs: number
  deltaPct: number
}

export interface CostVarianceResponse {
  window: { from: string; to: string }
  totals: {
    snapshotTotalCost: number
    realTotalCost: number
    deltaAbs: number
    deltaPct: number
  }
  rows: CostVarianceRow[]
}

interface RangeQuery {
  from?: string
  to?: string
}

export const reportsService = {
  pnl: (params: RangeQuery & { channelId?: string } = {}) =>
    api.get<{ data: PnlData }>('/reports/pnl', { params }).then(unwrap),

  pnlByChannel: (params: RangeQuery = {}) =>
    api.get<{ data: PnlByChannelResponse }>('/reports/pnl/by-channel', { params }).then(unwrap),

  commissions: (params: RangeQuery = {}) =>
    api.get<{ data: CommissionsResponse }>('/reports/commissions', { params }).then(unwrap),

  costVariance: (params: RangeQuery = {}) =>
    api.get<{ data: CostVarianceResponse }>('/reports/cost-variance', { params }).then(unwrap),
}
