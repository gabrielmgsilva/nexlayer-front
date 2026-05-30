/**
 * Serviços genéricos para todos os CRUDs de entidades.
 * Cada export é um objeto de funções para sua respectiva entidade.
 */
import { api, unwrap } from './api'
import type {
  Supplier, Equipment, Material, MaterialStock, Accessory,
  Category, Product, ProductVariation, Customer, CostConfig, CostSnapshot,
  PaginatedResult, Alert,
  FilamentType, Color, Brand, AccessoryCategory, Unit, MaterialCategory,
  SalesChannel, SaleOrder, CustomerType,
  PrintFailure, PrintFailureAnalytics, MaintenanceLog,
  ProfitabilityByProductRow, ProfitabilityByCustomerRow, ProfitabilityReport,
  TraceabilityResult,
  PricingTemplate, TemplatePricePreview,
} from '@/types/api.types'

// ── Suppliers ──────────────────────────────────────────────────
export const suppliersService = {
  findAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    api.get<{ data: PaginatedResult<Supplier> }>('/suppliers', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Supplier }>(`/suppliers/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: Supplier }>('/suppliers', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: Supplier }>(`/suppliers/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/suppliers/${id}`),
}

// ── Equipment ──────────────────────────────────────────────────
type EquipmentPayload = {
  name: string
  brandId?: string
  model: string
  serialNumber?: string
  purchasePrice: number
  purchaseDate: string
  estimatedLifespanHours: number
  ratedPowerWatts: number
  avgPowerWatts: number
  buildVolumeX?: number
  buildVolumeY?: number
  buildVolumeZ?: number
  maxSpeedMmS?: number
  status?: Equipment['status']
  annualMaintenanceCost: number
  annualUsageHours: number
  notes?: string
  photoUrl?: string
}

export const equipmentService = {
  findAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ data: PaginatedResult<Equipment> }>('/equipment', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Equipment }>(`/equipment/${id}`).then(unwrap),
  create: (data: EquipmentPayload) =>
    api.post<{ data: Equipment }>('/equipment', data).then(unwrap),
  update: (id: string, data: Partial<EquipmentPayload>) =>
    api.put<{ data: Equipment }>(`/equipment/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/equipment/${id}`),
  getMaintenanceLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<unknown> }>(`/equipment/${id}/maintenance-log`, { params }).then(unwrap),
  addMaintenanceLog: (id: string, data: unknown) =>
    api.post<{ data: unknown }>(`/equipment/${id}/maintenance-log`, data).then(unwrap),
}

// ── Materials ─────────────────────────────────────────────────
export const materialsService = {
  findAll: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<Material> }>('/materials', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Material }>(`/materials/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: Material }>('/materials', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: Material }>(`/materials/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/materials/${id}`),
  getStocks: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<MaterialStock> }>(`/materials/${id}/stock`, { params }).then(unwrap),
  addStock: (id: string, data: unknown) =>
    api.post<{ data: MaterialStock }>(`/materials/${id}/stock`, data).then(unwrap),
  updateStock: (stockId: string, data: unknown) =>
    api.patch<{ data: unknown }>(`/materials/stock/${stockId}`, data).then(unwrap),
  createTransaction: (stockId: string, data: unknown) =>
    api.post<{ data: unknown }>(`/materials/stock/${stockId}/transaction`, data).then(unwrap),
}

// ── Accessories ───────────────────────────────────────────────
export const accessoriesService = {
  findAll: (params?: { page?: number; limit?: number; category?: string }) =>
    api.get<{ data: PaginatedResult<Accessory> }>('/accessories', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Accessory }>(`/accessories/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: Accessory }>('/accessories', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: Accessory }>(`/accessories/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/accessories/${id}`),
  createTransaction: (id: string, data: unknown) =>
    api.post<{ data: unknown }>(`/accessories/${id}/transaction`, data).then(unwrap),
}

// ── Categories (Product Categories) ──────────────────────────
export const categoriesService = {
  findAll: (params?: { active?: boolean; name?: string }) =>
    api.get<{ data: Category[] }>('/categories', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Category }>(`/categories/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: Category }>('/categories', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: Category }>(`/categories/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete<{ data: unknown }>(`/categories/${id}`).then(unwrap),
}

// ── Products ──────────────────────────────────────────────────
export const productsService = {
  findAll: (params?: { page?: number; limit?: number; categoryId?: string; isActive?: boolean }) =>
    api.get<{ data: PaginatedResult<Product> }>('/products', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Product }>(`/products/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: Product }>('/products', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: Product }>(`/products/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/products/${id}`),

  // Stock
  adjustStock: (id: string, delta: number) =>
    api.patch<{ data: Product }>(`/products/${id}/stock`, { delta }).then(unwrap),

  // Cost snapshot
  getLatestCostSnapshot: (id: string) =>
    api.get<{ data: CostSnapshot | null }>(`/products/${id}/cost-snapshot`).then(unwrap),

  // Photo / model (URL-based, legacy)
  addPhoto: (id: string, url: string, isPrimary?: boolean) =>
    api.post<{ data: Product }>(`/products/${id}/photos`, { url, isPrimary }).then(unwrap),
  removePhoto: (id: string, url: string) =>
    api.delete(`/products/${id}/photos`, { data: { url } }),
  addPrintFile: (id: string, data: { url: string; filename: string; format: string }) =>
    api.post<{ data: Product }>(`/products/${id}/print-files`, data).then(unwrap),
  removePrintFile: (id: string, url: string) =>
    api.delete(`/products/${id}/print-files`, { data: { url } }),
  getPrintFileViewContent: (id: string, url: string) =>
    api.get<ArrayBuffer>(`/products/${id}/print-files/view`, {
      params: { url },
      responseType: 'arraybuffer',
    }).then((res) => res.data),

  // File uploads (multipart → Cloudflare R2)
  uploadPhoto: (id: string, file: File, isPrimary = false) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ data: Product }>(`/products/${id}/upload/photo?isPrimary=${isPrimary}`, form).then(unwrap)
  },
  uploadModel: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ data: Product }>(`/products/${id}/upload/model`, form).then(unwrap)
  },

  // Variations
  getVariations: (id: string) =>
    api.get<{ data: ProductVariation[] }>(`/products/${id}/variations`).then(unwrap),
  createVariation: (id: string, data: unknown) =>
    api.post<{ data: ProductVariation }>(`/products/${id}/variations`, data).then(unwrap),
  updateVariation: (id: string, varId: string, data: unknown) =>
    api.put<{ data: ProductVariation }>(`/products/${id}/variations/${varId}`, data).then(unwrap),
  removeVariation: (id: string, varId: string) =>
    api.delete(`/products/${id}/variations/${varId}`),
  adjustVariationStock: (id: string, varId: string, delta: number) =>
    api.patch<{ data: ProductVariation }>(`/products/${id}/variations/${varId}/stock`, { delta }).then(unwrap),
  uploadVariationPhoto: (id: string, varId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ data: ProductVariation }>(`/products/${id}/variations/${varId}/upload/photo`, form).then(unwrap)
  },
  uploadVariationModel: (id: string, varId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ data: ProductVariation }>(`/products/${id}/variations/${varId}/upload/model`, form).then(unwrap)
  },
}

// ── Customers ─────────────────────────────────────────────────
type CustomerPayload = {
  type: CustomerType
  name: string
  razaoSocial?: string
  email?: string
  phone?: string
  cpf?: string
  cnpj?: string
  address?: string
  street?: string
  addressNumber?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  ibgeCode?: string
  inscricaoEstadual?: string
  inscricaoMunicipal?: string
  notes?: string
  isActive?: boolean
}

export const customersService = {
  findAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    api.get<{ data: PaginatedResult<Customer> }>('/customers', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: Customer }>(`/customers/${id}`).then(unwrap),
  create: (data: CustomerPayload) =>
    api.post<{ data: Customer }>('/customers', data).then(unwrap),
  update: (id: string, data: Partial<CustomerPayload>) =>
    api.put<{ data: Customer }>(`/customers/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/customers/${id}`),
  getJobs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<unknown> }>(`/customers/${id}/jobs`, { params }).then(unwrap),
}

// ── CostConfig ────────────────────────────────────────────────
type CostConfigPayload = {
  name: string
  isDefault?: boolean
  isActive?: boolean
  electricityCostPerKwh: number
  laborCostPerHour?: number
  monthlyOverhead?: number
  monthlyProductionHours?: number
  failureRateMode?: 'MANUAL' | 'AUTO' | 'HYBRID'
  failureRatePercent?: number
  failureAutoWindowDays?: number
  failureAutoMinSamples?: number
  notes?: string
}

export const costConfigService = {
  findAll: () =>
    api.get<{ data: CostConfig[] }>('/cost-configs').then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: CostConfig }>(`/cost-configs/${id}`).then(unwrap),
  create: (data: CostConfigPayload) =>
    api.post<{ data: CostConfig }>('/cost-configs', data).then(unwrap),
  update: (id: string, data: Partial<CostConfigPayload>) =>
    api.put<{ data: CostConfig }>(`/cost-configs/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/cost-configs/${id}`),
}

// ── Calculator ────────────────────────────────────────────────
export const calculatorService = {
  estimate: (data: unknown) =>
    api.post<{ data: unknown }>('/calculator/estimate', data).then(unwrap),
}

// ── Alerts ────────────────────────────────────────────────────
export const alertsService = {
  getAll: () =>
    api.get<{ data: Alert[] }>('/alerts').then(unwrap),
}

// ── Domain tables ─────────────────────────────────────────────
export const domainService = {
  // FilamentTypes
  getFilamentTypes: (category?: MaterialCategory) =>
    api.get<{ data: FilamentType[] }>('/domain/filament-types', { params: category ? { category } : undefined }).then(unwrap),
  createFilamentType: (data: { name: string; description?: string; category?: MaterialCategory; sortOrder?: number }) =>
    api.post<{ data: FilamentType }>('/domain/filament-types', data).then(unwrap),
  updateFilamentType: (id: string, data: { name?: string; description?: string; category?: MaterialCategory; isActive?: boolean; sortOrder?: number }) =>
    api.put<{ data: FilamentType }>(`/domain/filament-types/${id}`, data).then(unwrap),
  deleteFilamentType: (id: string) =>
    api.delete(`/domain/filament-types/${id}`),

  // Colors
  getColors: () =>
    api.get<{ data: Color[] }>('/domain/colors').then(unwrap),
  createColor: (data: { name: string; hexCode?: string; isRainbow?: boolean }) =>
    api.post<{ data: Color }>('/domain/colors', data).then(unwrap),
  updateColor: (id: string, data: { name?: string; hexCode?: string; isRainbow?: boolean; isActive?: boolean }) =>
    api.put<{ data: Color }>(`/domain/colors/${id}`, data).then(unwrap),
  deleteColor: (id: string) =>
    api.delete(`/domain/colors/${id}`),

  // Brands
  getBrands: () =>
    api.get<{ data: Brand[] }>('/domain/brands').then(unwrap),
  createBrand: (data: { name: string; website?: string }) =>
    api.post<{ data: Brand }>('/domain/brands', data).then(unwrap),
  updateBrand: (id: string, data: { name?: string; website?: string; isActive?: boolean }) =>
    api.put<{ data: Brand }>(`/domain/brands/${id}`, data).then(unwrap),
  deleteBrand: (id: string) =>
    api.delete(`/domain/brands/${id}`),

  // AccessoryCategories
  getAccessoryCategories: () =>
    api.get<{ data: AccessoryCategory[] }>('/domain/accessory-categories').then(unwrap),
  createAccessoryCategory: (data: { name: string }) =>
    api.post<{ data: AccessoryCategory }>('/domain/accessory-categories', data).then(unwrap),
  updateAccessoryCategory: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.put<{ data: AccessoryCategory }>(`/domain/accessory-categories/${id}`, data).then(unwrap),
  deleteAccessoryCategory: (id: string) =>
    api.delete(`/domain/accessory-categories/${id}`),

  // Units
  getUnits: () =>
    api.get<{ data: Unit[] }>('/domain/units').then(unwrap),
  createUnit: (data: { name: string; symbol: string }) =>
    api.post<{ data: Unit }>('/domain/units', data).then(unwrap),
  updateUnit: (id: string, data: { name?: string; symbol?: string; isActive?: boolean }) =>
    api.put<{ data: Unit }>(`/domain/units/${id}`, data).then(unwrap),
  deleteUnit: (id: string) =>
    api.delete(`/domain/units/${id}`),
}

// ── Sales Channels ─────────────────────────────────────────
type SalesChannelPayload = {
  name: string
  commissionPercent?: number
  feeFixed?: number
  feePercentVariable?: number
  notes?: string
  isActive?: boolean
}

export const salesChannelService = {
  findAll: (params?: { includeInactive?: boolean }) =>
    api.get<{ data: SalesChannel[] }>('/sales/channels', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: SalesChannel }>(`/sales/channels/${id}`).then(unwrap),
  create: (data: SalesChannelPayload) =>
    api.post<{ data: SalesChannel }>('/sales/channels', data).then(unwrap),
  update: (id: string, data: Partial<SalesChannelPayload>) =>
    api.put<{ data: SalesChannel }>(`/sales/channels/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/sales/channels/${id}`),
}

// ── Sales ──────────────────────────────────────────────────
export const salesService = {
  findAll: (params?: { page?: number; limit?: number; status?: string; channelId?: string; customerId?: string }) =>
    api.get<{ data: PaginatedResult<SaleOrder> }>('/sales', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: SaleOrder }>(`/sales/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: SaleOrder }>('/sales', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: SaleOrder }>(`/sales/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/sales/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch<{ data: SaleOrder }>(`/sales/${id}/status`, { status }).then(unwrap),
}

// ── Pricing Templates ──────────────────────────────────────────
export const pricingTemplatesService = {
  findAll: () =>
    api.get<{ data: PricingTemplate[] }>('/pricing-templates').then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: PricingTemplate }>(`/pricing-templates/${id}`).then(unwrap),
  create: (data: { productId: string; name: string; defaultMargin?: number; notes?: string }) =>
    api.post<{ data: PricingTemplate }>('/pricing-templates', data).then(unwrap),
  preview: (id: string, data: { estimatedMaterialG: number; estimatedPrintTimeMinutes: number; piecesPerPrint?: number; margin?: number }) =>
    api.post<{ data: TemplatePricePreview }>(`/pricing-templates/${id}/preview`, data).then(unwrap),
  derive: (id: string, data: unknown) =>
    api.post<{ data: { product: Product; pricing: TemplatePricePreview } }>(`/pricing-templates/${id}/derive`, data).then(unwrap),
  recalculate: (id: string) =>
    api.post<{ data: { updated: number; total: number; changes: unknown[] } }>(`/pricing-templates/${id}/recalculate`, {}).then(unwrap),
  remove: (id: string) =>
    api.delete(`/pricing-templates/${id}`),
}

// ── Reports — Profitability ────────────────────────────────────
export const profitabilityService = {
  byProduct: (params?: { from?: string; to?: string }) =>
    api.get<{ data: ProfitabilityReport<ProfitabilityByProductRow> }>('/reports/profitability/by-product', { params }).then(unwrap),
  byCustomer: (params?: { from?: string; to?: string }) =>
    api.get<{ data: ProfitabilityReport<ProfitabilityByCustomerRow> }>('/reports/profitability/by-customer', { params }).then(unwrap),
  byChannel: (params?: { from?: string; to?: string }) =>
    api.get<{ data: unknown }>('/reports/pnl/by-channel', { params }).then(unwrap),
}

// ── Traceability ───────────────────────────────────────────────
export const traceabilityService = {
  searchLot: (q: string) =>
    api.get<{ data: MaterialStock[] }>('/materials/lots/search', { params: { q } }).then(unwrap),
  getByStock: (stockId: string) =>
    api.get<{ data: TraceabilityResult }>(`/materials/stock/${stockId}/traceability`).then(unwrap),
}

// ── Print Failures ─────────────────────────────────────────────
export const printFailuresService = {
  findAll: (params?: {
    page?: number; limit?: number;
    equipmentId?: string; materialId?: string; productId?: string;
    failureCategory?: string; failureSeverity?: string;
    from?: string; to?: string;
  }) =>
    api.get<{ data: PaginatedResult<PrintFailure> }>('/print-failures', { params }).then(unwrap),
  findOne: (id: string) =>
    api.get<{ data: PrintFailure }>(`/print-failures/${id}`).then(unwrap),
  create: (data: unknown) =>
    api.post<{ data: PrintFailure }>('/print-failures', data).then(unwrap),
  update: (id: string, data: unknown) =>
    api.put<{ data: PrintFailure }>(`/print-failures/${id}`, data).then(unwrap),
  remove: (id: string) =>
    api.delete(`/print-failures/${id}`),
  getAnalytics: (params?: { from?: string; to?: string }) =>
    api.get<{ data: PrintFailureAnalytics }>('/print-failures/analytics', { params }).then(unwrap),
}

// ── Maintenance Logs ────────────────────────────────────────────
export const maintenanceService = {
  findAll: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<MaintenanceLog> }>('/equipment/maintenance-logs', { params }).then(unwrap),
  findByEquipment: (equipmentId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<MaintenanceLog> }>(`/equipment/${equipmentId}/maintenance-log`, { params }).then(unwrap),
  create: (equipmentId: string, data: {
    description: string; cost?: number; performedAt: string; nextDueAt?: string; notes?: string;
  }) =>
    api.post<{ data: MaintenanceLog }>(`/equipment/${equipmentId}/maintenance-log`, data).then(unwrap),
}

