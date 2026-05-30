export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  data: T
  timestamp: string
}

// ── Auth ──────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  isActive: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ── Supplier ──────────────────────────────────────────
export interface Supplier {
  id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  cnpjCpf?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
}

// ── Domain tables ─────────────────────────────────────
export type MaterialCategory = 'FILAMENT' | 'RESIN'

export interface FilamentType {
  id: string
  name: string
  description?: string
  category: MaterialCategory
  isActive: boolean
  sortOrder: number
  createdAt: string
}

export interface Color {
  id: string
  name: string
  hexCode?: string
  isRainbow: boolean
  isActive: boolean
  createdAt: string
}

export interface Brand {
  id: string
  name: string
  website?: string
  isActive: boolean
  createdAt: string
}

export interface AccessoryCategory {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface Unit {
  id: string
  name: string
  symbol: string
  isActive: boolean
  createdAt: string
}

// ── Equipment ─────────────────────────────────────────
export interface Equipment {
  id: string
  name: string
  model?: string
  brandId?: string
  brand?: Brand
  serialNumber?: string
  avgPowerWatts: number
  ratedPowerWatts: number
  purchasePrice: number
  purchaseDate?: string
  estimatedLifespanHours: number
  buildVolumeX?: number
  buildVolumeY?: number
  buildVolumeZ?: number
  maxSpeedMmS?: number
  totalPrintHours: number
  annualMaintenanceCost: number
  annualUsageHours: number
  status: 'AVAILABLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE'
  notes?: string
  photoUrl?: string
  deletedAt?: string
  createdAt: string
  updatedAt?: string
}

// ── Material ──────────────────────────────────────────
export interface Material {
  id: string
  materialType: MaterialCategory
  filamentTypeId?: string
  filamentType?: FilamentType
  brandId?: string
  brand?: Brand
  diameterMm?: number
  densityKgM3?: number
  spoolWeightG?: number
  supplierId?: string
  supplier?: { id: string; name: string }
  notes?: string
  deletedAt?: string
  createdAt: string
  _count?: { stocks: number }
}

export interface MaterialStock {
  id: string
  materialId: string
  material?: Material
  spoolLabel?: string
  initialWeightG: number
  currentWeightG: number
  status: 'SEALED' | 'IN_USE' | 'EMPTY' | 'EXPIRED'
  costPerKg: number
  openedDate?: string
  lotNumber?: string
  color1Id?: string
  color1?: Pick<Color, 'id' | 'name' | 'hexCode' | 'isRainbow'>
  color2Id?: string
  color2?: Pick<Color, 'id' | 'name' | 'hexCode' | 'isRainbow'>
  color3Id?: string
  color3?: Pick<Color, 'id' | 'name' | 'hexCode' | 'isRainbow'>
  createdAt: string
}

// ── Accessory ─────────────────────────────────────────
export interface Accessory {
  id: string
  name: string
  categoryId?: string
  category?: AccessoryCategory
  unitId?: string
  unit?: Unit
  purchaseMode: string
  purchaseQuantity: number
  purchaseCost: number
  costPerUnit: number
  stockQuantity: number
  minStockAlert: number
  supplierId?: string
  supplier?: { id: string; name: string }
  deletedAt?: string
  createdAt: string
}

// ── Category ──────────────────────────────────────────
export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  isActive: boolean
  createdAt: string
  _count?: { products: number; children: number }
}

// ── Product ───────────────────────────────────────────
export interface ProductVariation {
  id: string
  productId: string
  name: string
  sku?: string
  colorId?: string
  color?: { id: string; name: string; hexCode?: string }
  photoKey?: string
  photoUrl?: string
  modelFileKey?: string
  modelFileUrl?: string
  modelFormat?: string
  sellingPrice?: number
  stockQuantity: number
  minStockAlert?: number
  isActive: boolean
  sortOrder: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ProductKitItem {
  id: string
  kitId: string
  productId: string
  quantity: number
  sortOrder: number
  product: {
    id: string
    name: string
    isKit: boolean
    estimatedPrintTimeMinutes: number
    estimatedMaterialG: number
    piecesPerPrint: number
    defaultAccessories: Array<{ accessory_id: string; qty_per_unit: number }>
    recommendedFilamentTypeId?: string
  }
}

export interface ProductChannelPrice {
  id: string
  productId: string
  channelId: string
  price: number
  channel?: {
    id: string
    name: string
    commissionPercent?: number
    feeFixed?: number
    feePercentVariable?: number
    isActive: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  categoryId: string
  category?: { id: string; name: string; slug: string }
  description?: string
  isKit: boolean
  kitItems?: ProductKitItem[]
  estimatedPrintTimeMinutes: number
  estimatedMaterialG: number
  piecesPerPrint: number
  recommendedFilamentTypeId?: string
  recommendedFilamentType?: { id: string; name: string }
  recommendedLayerHeightMm?: number
  recommendedInfillPercent?: number
  supportsRequired?: boolean
  defaultAccessories: Array<{ accessory_id: string; qty_per_unit: number }>
  photos: Array<{ url: string; is_primary: boolean; sort_order: number }>
  printFiles: Array<{ url: string; filename: string; format: string; key?: string; uploaded_at: string }>
  stockQuantity: number
  minStockAlert?: number
  sellingPrice?: number
  channelPrices?: ProductChannelPrice[]
  variations?: ProductVariation[]
  isActive: boolean
  deletedAt?: string
  createdAt: string
  _count?: { productionJobs: number; variations: number }
}

// ── Customer ──────────────────────────────────────────
export type CustomerType = 'PF' | 'PJ'

export interface Customer {
  id: string
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
  isActive: boolean
  deletedAt?: string
  createdAt: string
}

// ── CostConfig ────────────────────────────────────────
export interface CostConfig {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  electricityCostPerKwh: number
  laborCostPerHour?: number
  monthlyOverhead?: number
  monthlyProductionHours?: number
  failureRateMode: 'MANUAL' | 'AUTO' | 'HYBRID'
  failureRatePercent: number
  failureAutoWindowDays?: number
  failureAutoMinSamples?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Production Job ────────────────────────────────────
export interface ProductionJob {
  id: string
  jobNumber: string
  status: string
  productionMode: 'SINGLE_PIECE' | 'BATCH'
  batchStrategy: 'FULL_PRINTS' | 'EXACT_QUANTITY'
  priority: number
  customerId: string
  customer?: { id: string; name: string }
  productId: string
  product?: {
    id: string
    name: string
    channelPrices?: ProductChannelPrice[]
  }
  equipmentId?: string
  equipment?: { id: string; name: string }
  materialStockId?: string
  materialStock?: MaterialStock & { material: Material }
  quantityOrdered: number
  piecesPerPrint: number
  printsNeeded: number
  totalPiecesProduced?: number
  extraPiecesProduced?: number
  printTimeMinutes: number
  materialPerPrintG: number
  jobAccessories: Array<{ accessory_id: string; qty_per_unit: number; unit_cost_at_time: number }>
  costConfigId?: string
  costConfig?: CostConfig
  profitMargin: number
  discountPercent?: number
  customUnitPrice?: number
  dueDate?: string
  quotedAt?: string
  startedAt?: string
  completedAt?: string
  deliveredAt?: string
  notes?: string
  invoiceFileKey?: string
  invoiceFileUrl?: string
  costSnapshots?: CostSnapshot[]
  printAttempts?: PrintAttempt[]
  createdAt: string
}

// ── CostSnapshot ──────────────────────────────────────
export interface CostSnapshot {
  id: string
  productionJobId: string
  version: number
  productionMode: string
  batchStrategy: string
  equipmentName: string
  printTimeMinutes: number
  printsCount: number
  piecesPerPrint: number
  quantityOrdered: number
  totalPiecesProduced: number
  printElectricityCost: number
  printDepreciationCost: number
  printMaintenanceCost: number
  printMaterialCost: number
  printTotalCost: number
  unitElectricityCost: number
  unitDepreciationCost: number
  unitMaintenanceCost: number
  unitLaborCost: number
  unitOverheadCost: number
  unitMaterialCost: number
  materialName: string
  materialGramsPerPrint: number
  materialGramsPerUnit: number
  unitAccessoriesCost: number
  accessoriesDetail: unknown
  failureRateMode: string
  failureRateManual: number
  failureRateAuto?: number
  failureRateApplied: number
  unitFailureBufferCost: number
  unitCostBeforeError: number
  unitCostWithError: number
  unitSalePrice: number
  unitProfit: number
  batchTotalCost: number
  batchTotalSalePrice: number
  batchTotalProfit: number
  profitMargin: number
  discountPercent?: number
  electricityRate: number
  depreciationRatePerHour: number
  maintenanceRatePerHour: number
  createdAt: string
}

// ── Profitability ─────────────────────────────────────
export interface ProfitabilityByProductRow {
  productId: string
  productName: string
  sku: string | null
  units: number
  ordersCount: number
  revenue: number
  cogs: number
  commissions: number
  fees: number
  grossProfit: number
  margin: number
}

export interface ProfitabilityByCustomerRow {
  customerId: string
  customerName: string
  customerType: string
  revenue: number
  cogs: number
  shipping: number
  commissions: number
  fees: number
  grossProfit: number
  margin: number
  ordersCount: number
  avgOrderValue: number
}

export interface ProfitabilityReport<T> {
  window: { from: string; to: string }
  rows: T[]
  totals: { revenue: number; cogs: number; grossProfit: number; units?: number; ordersCount?: number }
}

// ── Traceability ──────────────────────────────────────
export interface TraceabilityResult {
  stock: {
    id: string
    lotNumber?: string
    status: string
    initialWeightG: number
    currentWeightG: number
    costPerKg: number
    purchaseDate?: string
    openedDate?: string
    material: {
      id: string
      materialType: string
      filamentType?: { name: string }
      brand?: { name: string }
      supplier?: { id: string; name: string }
    }
  }
  transactions: Array<{
    id: string; type: string; quantityG: number
    referenceId?: string; referenceType?: string; notes?: string; createdAt: string
  }>
  jobs: Array<{
    jobId: string; jobNumber: string; status: string
    product: { id: string; name: string; sku?: string }
    customer?: { id: string; name: string }
    completedAt?: string
    saleOrders: Array<{ id: string; orderNumber: string; status: string; createdAt: string; customer?: { id: string; name: string } }>
  }>
  summary: { totalJobs: number; totalSaleOrders: number; consumedG: number }
}

// ── PrintAttempt ──────────────────────────────────────
export interface PrintAttempt {
  id: string
  productionJobId: string
  equipmentId: string
  attemptNumber: number
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  piecesExpected: number
  piecesOk: number
  piecesDefective: number
  printTimeMinutes?: number
  materialUsedG?: number
  materialWastedG?: number
  startedAt?: string
  finishedAt?: string
  notes?: string
  createdAt: string
}

// ── PrintFailure ──────────────────────────────────────
export type FailureCategory =
  | 'ADHESION' | 'CLOG' | 'LAYER_SHIFT' | 'STRINGING' | 'WARPING'
  | 'SPAGHETTI' | 'UNDER_EXTRUSION' | 'OVER_EXTRUSION' | 'FILAMENT_BREAK'
  | 'FILAMENT_TANGLE' | 'POWER_LOSS' | 'MECHANICAL' | 'THERMAL'
  | 'SUPPORT_FAIL' | 'DIMENSIONAL' | 'COSMETIC' | 'OPERATOR_ERROR'
  | 'SOFTWARE' | 'OTHER'

export type FailureSeverity = 'TOTAL' | 'PARTIAL' | 'COSMETIC'

export interface PrintFailure {
  id: string
  printAttemptId: string
  equipmentId: string
  productId?: string
  materialId?: string
  failureCategory: FailureCategory
  failureSeverity: FailureSeverity
  materialWastedG: number
  timeWastedMinutes: number
  reprintRequired: boolean
  detectedAtLayer?: number
  detectedAtPercent?: number
  ambientTempC?: number
  humidityPercent?: number
  nozzleHours?: number
  rootCause?: string
  correctiveAction?: string
  notes?: string
  occurredAt: string
  createdAt: string
  equipment?: { id: string; name: string; model: string }
  product?: { id: string; name: string }
  material?: { id: string; filamentType?: { name: string }; brand?: { name: string } }
  printAttempt?: { id: string; attemptNumber: number; productionJobId: string }
}

export interface PrintFailureAnalytics {
  totalCount: number
  totalMaterialWastedG: number
  totalTimeWastedMinutes: number
  avgMaterialWastedG: number
  byCategory: Array<{ category: FailureCategory; count: number; materialWastedG: number; timeWastedMinutes: number }>
  bySeverity: Array<{ severity: FailureSeverity; count: number }>
  byEquipment: Array<{ equipmentId: string; equipmentName: string; count: number; materialWastedG: number }>
}

// ── MaintenanceLog ────────────────────────────────────
export interface MaintenanceLog {
  id: string
  equipmentId: string
  description: string
  cost?: number
  performedAt: string
  nextDueAt?: string
  notes?: string
  createdAt: string
  equipment?: { id: string; name: string; model: string }
}

// ── Calculator ────────────────────────────────────────
export interface CalculatorInput {
  equipmentId: string
  materialId: string
  printTimeMinutes: number
  materialPerPrintG: number
  piecesPerPrint: number
  printsNeeded: number
  quantityOrdered: number
  totalPiecesProduced: number
  jobAccessories: Array<{ accessory_id: string; qty_per_unit: number }>
  costConfigId?: string
  profitMargin: number
  discountPercent?: number
  productionMode: 'SINGLE_PIECE' | 'BATCH'
  batchStrategy: 'FULL_PRINTS' | 'EXACT_QUANTITY'
}

export interface Alert {
  type: 'STOCK_LOW' | 'LIFESPAN_WARNING' | 'LIFESPAN_CRITICAL' | 'MAINTENANCE_DUE' | 'MAINTENANCE_OVERDUE'
  severity: 'WARNING' | 'CRITICAL'
  message: string
  entityId: string
  entityName: string
}

// ── Notification ──────────────────────────────────────────
export type NotificationType =
  | 'ACCESSORY_LOW'
  | 'MATERIAL_LOW'
  | 'PRODUCT_LOW'
  | 'LIFESPAN_WARNING'
  | 'LIFESPAN_CRITICAL'
  | 'MAINTENANCE_DUE'
  | 'MAINTENANCE_OVERDUE'

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface Notification {
  id: string
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  entityId?: string
  entityType?: string
  entityName?: string
  isRead: boolean
  readAt?: string
  expiresAt: string
  createdAt: string
}

// ── Sales ─────────────────────────────────────────────────
export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface SalesChannel {
  id: string
  name: string
  commissionPercent: number
  feeFixed: number
  feePercentVariable: number
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  id: string
  saleOrderId: string
  productId: string
  product?: { id: string; name: string; sku?: string }
  variationId?: string
  variation?: { id: string; name: string; sku?: string }
  quantity: number
  unitPrice: number
  costPerUnit: number
  productionJobId?: string
  productionJob?: { id: string; jobNumber: string; status: string }
  fulfilledFromStock: boolean
  createdAt: string
}

export interface SaleOrder {
  id: string
  orderNumber: string
  channelId: string
  channel?: { id: string; name: string; commissionPercent: number }
  customerId?: string
  customer?: { id: string; name: string }
  status: SaleStatus
  shippingCost: number
  discount: number
  shopeeOrderSn?: string
  trackingNumber?: string
  shippingCarrier?: string
  notes?: string
  items: SaleItem[]
  confirmedAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  createdAt: string
}

// ── Shopee Integration ──────────────────────────────────────
export interface ShopeeConnectionStatus {
  isConnected: boolean
  shopId: number | null
  tokenExpiresAt: string | null
  configKeys: string[]
}

export interface ShopeeOrderMapping {
  id: string
  shopeeOrderSn: string
  saleOrderId: string
  shopeeStatus: string
  lastSyncedAt: string
  createdAt: string
  saleOrder?: {
    id: string
    orderNumber: string
    status: SaleStatus
    createdAt: string
  }
}

export interface ShopeeProductMapping {
  id: string
  productId: string
  shopeeItemId: number
  shopeeModelId: number | null
  shopeeCategoryId: number | null
  shopeeStatus: string
  lastSyncedAt: string
  createdAt: string
  product?: {
    id: string
    name: string
    sku?: string
    stockQuantity: number
    sellingPrice: number
  }
}

export interface ShopeeSyncResult {
  imported: number
  skipped: number
  errors: number
  total: number
}

export interface ShopeeStockSyncResult {
  synced: number
  errors: number
  total: number
}
