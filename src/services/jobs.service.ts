import { api, unwrap } from './api'
import type { ProductionJob, CostSnapshot, ProductChannelPrice } from '@/types/api.types'

export const jobsService = {
  findAll: (params?: { status?: string; customerId?: string; productId?: string; statusGroup?: 'active' | 'finished' }) =>
    api.get<{ data: ProductionJob[] }>('/jobs', { params }).then(unwrap),

  findOne: (id: string) =>
    api.get<{ data: ProductionJob }>(`/jobs/${id}`).then(unwrap),

  create: (data: unknown) =>
    api.post<{ data: ProductionJob }>('/jobs', data).then(unwrap),

  createFromCalculator: (data: unknown) =>
    api.post<{ data: ProductionJob }>('/calculator/create-job', data).then(unwrap),

  update: (id: string, data: unknown) =>
    api.put<{ data: ProductionJob }>(`/jobs/${id}`, data).then(unwrap),

  updateStatus: (id: string, status: string) =>
    api.patch<{ data: unknown }>(`/jobs/${id}/status`, { status }).then(unwrap),

  recalculate: (id: string) =>
    api.post<{ data: ProductionJob }>(`/jobs/${id}/recalculate`).then(unwrap),

  getCostHistory: (id: string) =>
    api.get<{ data: CostSnapshot[] }>(`/jobs/${id}/cost-history`).then(unwrap),

  uploadInvoice: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ data: ProductionJob }>(`/jobs/${id}/upload/invoice`, form).then(unwrap)
  },

  cloneJob: (id: string) =>
    api.post<{ data: ProductionJob }>(`/jobs/${id}/clone`).then(unwrap),

  cancel: (id: string) =>
    api.delete(`/jobs/${id}`),

  // ── Production page (queue + timeline) ──
  getQueue: () =>
    api.get<{ data: QueueResponse }>('/jobs/queue').then(unwrap),

  getTimeline: (params?: { from?: string; to?: string }) =>
    api.get<{ data: TimelineResponse }>('/jobs/timeline', { params }).then(unwrap),

  updateQueuePosition: (id: string, body: { equipmentId: string | null; position: number }) =>
    api.patch<{ data: unknown }>(`/jobs/${id}/queue-position`, body).then(unwrap),

  // ── QC Inspection ──
  createQcInspection: (jobId: string, data: {
    qtyApproved: number
    qtyRejected: number
    outcome: 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED'
    reason?: string
    notes?: string
  }) =>
    api.post<{ data: QcInspection }>(`/jobs/${jobId}/qc`, data).then(unwrap),

  getQcHistory: (jobId: string) =>
    api.get<{ data: QcInspection[] }>(`/jobs/${jobId}/qc`).then(unwrap),

  // ── Capacity Planning ──
  getCapacity: () =>
    api.get<{ data: CapacityLane[] }>('/jobs/capacity').then(unwrap),
}

export interface QueueJob {
  id: string
  jobNumber: string
  status: string
  quantityOrdered: number
  printsNeeded: number
  printTimeMinutes: number
  priority: number
  queuePosition: number | null
  startedAt: string | null
  dueDate: string | null
  equipmentId: string | null
  customer: { id: string; name: string } | null
  product: { id: string; name: string; channelPrices?: ProductChannelPrice[] }
  equipment: { id: string; name: string } | null
  costSnapshots: Array<{
    unitSalePrice: string | number
    batchTotalSalePrice: string | number
    unitCostWithError: string | number
  }>
}

export interface QueueLane {
  equipment: {
    id: string
    name: string
    model: string
    status: string
    totalPrintHours: string | number
    estimatedLifespanHours: number
  }
  jobs: QueueJob[]
}

export interface QueueResponse {
  lanes: QueueLane[]
  unassigned: QueueJob[]
}

export interface TimelineBlock {
  jobId: string
  jobNumber: string
  status: string
  productName: string
  customerName: string | null
  start: string
  end: string
  minutes: number
}

export interface TimelineLane {
  equipment: { id: string; name: string; status: string }
  blocks: TimelineBlock[]
}

export interface TimelineResponse {
  window: { from: string; to: string }
  lanes: TimelineLane[]
}

export interface QcInspection {
  id: string
  productionJobId: string
  qtyApproved: number
  qtyRejected: number
  outcome: 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED'
  reason?: string | null
  notes?: string | null
  inspectedAt: string
}

export interface CapacityJob {
  jobId: string
  jobNumber: string
  status: string
  productName: string
  customerName: string | null
  estimatedStart: string
  estimatedEnd: string
  dueDate: string | null
  isOverdue: boolean
  totalPrintMinutes: number
}

export interface CapacityLane {
  equipmentId: string
  equipmentName: string
  equipmentStatus: string
  projectedFreeAt: string
  jobs: CapacityJob[]
}
