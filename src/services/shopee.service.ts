import { api, unwrap } from './api'
import type {
  ShopeeConnectionStatus,
  ShopeeOrderMapping,
  ShopeeProductMapping,
  ShopeeSyncResult,
  ShopeeStockSyncResult,
  PaginatedResult,
} from '@/types/api.types'

// ── Auth ────────────────────────────────────────────────────────
export const shopeeAuthService = {
  getAuthUrl: () =>
    api.get<{ data: { url: string } }>('/shopee/auth/url').then(unwrap),

  getStatus: () =>
    api.get<{ data: ShopeeConnectionStatus }>('/shopee/auth/status').then(unwrap),

  disconnect: () =>
    api.delete('/shopee/auth/disconnect').then(unwrap),
}

// ── Orders ──────────────────────────────────────────────────────
export const shopeeOrdersService = {
  sync: () =>
    api.post<{ data: ShopeeSyncResult }>('/shopee/orders/sync').then(unwrap),

  getMappings: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<ShopeeOrderMapping> }>('/shopee/orders/mappings', { params }).then(unwrap),
}

// ── Products ────────────────────────────────────────────────────
export const shopeeProductsService = {
  getCategories: () =>
    api.get<{ data: unknown[] }>('/shopee/products/categories').then(unwrap),

  publish: (productId: string, shopeeCategoryId: number) =>
    api.post<{ data: { productId: string; shopeeItemId: number; name: string } }>(
      `/shopee/products/${productId}/publish`,
      { shopeeCategoryId },
    ).then(unwrap),

  syncStock: (productId: string) =>
    api.post<{ data: { productId: string; stock: number } }>(
      `/shopee/products/${productId}/sync-stock`,
    ).then(unwrap),

  updateProduct: (productId: string) =>
    api.post<{ data: { productId: string; shopeeItemId: number } }>(
      `/shopee/products/${productId}/update`,
    ).then(unwrap),

  unpublish: (productId: string) =>
    api.delete<{ data: { productId: string; removed: boolean } }>(
      `/shopee/products/${productId}/unpublish`,
    ).then(unwrap),

  syncAllStock: () =>
    api.post<{ data: ShopeeStockSyncResult }>('/shopee/products/sync-all-stock').then(unwrap),

  getMappings: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: PaginatedResult<ShopeeProductMapping> }>('/shopee/products/mappings', { params }).then(unwrap),
}

// ── Logistics ───────────────────────────────────────────────────
export const shopeeLogisticsService = {
  shipOrder: (saleOrderId: string) =>
    api.post<{ data: { orderSn: string; shipped: boolean } }>(
      `/shopee/logistics/${saleOrderId}/ship`,
    ).then(unwrap),

  getChannels: () =>
    api.get<{ data: unknown[] }>('/shopee/logistics/channels').then(unwrap),
}
