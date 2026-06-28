import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'
import { orderService } from '@chinooz/mock-data'
import type {
  SellerStatsRange,
  SellerStats,
  SellerStoreProfile,
  SellerProduct,
  SellerProductStatus,
  StockStatus,
  StockEditMode,
  StockEditReason,
  SellerInventoryVariant,
  CsvStockRow,
  SellerSubOrder,
  SellerOrderStatusKey,
  Promotion,
  Payout,
  PayoutMethod,
  Transaction,
  StaffMember,
  StaffRole,
  SellerNotification,
  ExportReportType,
  ExportReportResult,
  SellerCancelReason,
  RefundStatus,
  SellerReturnRequest,
  RefundBreakdown,
} from '@chinooz/types'
import type { SellerProductFilter, SellerInventoryFilter } from '@chinooz/mock-data'
import type { ShippingSettings, BusinessDetails, KycDocument, NotificationPreferences, ActiveSession } from '@chinooz/mock-data'

/**
 * staleTime convention for seller data:
 * - stats/analytics:  60s  (moderately fresh, dashboard)
 * - products/orders:  30s  (operational, near-real-time)
 * - inventory:        30s  (stock changes matter)
 * - reviews:          60s  (slower-moving)
 * - promotions:       60s  (campaign-level)
 * - payouts/transac: 120s  (financial, less volatile)
 * - notifications:    30s  (near-real-time)
 * - store/staff:     120s  (rarely change)
 */
const STALE = {
  stats: 1000 * 60,
  products: 1000 * 30,
  inventory: 1000 * 30,
  orders: 1000 * 30,
  reviews: 1000 * 60,
  promotions: 1000 * 60,
  payouts: 1000 * 120,
  transactions: 1000 * 120,
  notifications: 1000 * 30,
  store: 1000 * 120,
  staff: 1000 * 120,
} as const

// --- Stats ---

export function useSellerStats(range: SellerStatsRange = '30d') {
  return useQuery<SellerStats>({
    queryKey: ['seller-stats', range],
    queryFn: () => api.getSellerStats(range),
    staleTime: STALE.stats,
  })
}

// --- Store ---

export function useStore(sellerId?: string) {
  return useQuery<SellerStoreProfile>({
    queryKey: ['seller-store', sellerId ?? 'me'],
    queryFn: () => api.getStore(sellerId),
    staleTime: STALE.store,
  })
}

export function useUpdateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, data }: { sellerId: string; data: Partial<SellerStoreProfile> }) =>
      api.updateStore(sellerId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-store', variables.sellerId] })
    },
  })
}

// --- Products (CRUD) ---

export function useSellerProductsApi(filter: SellerProductFilter = {}) {
  return useQuery({
    queryKey: ['seller-products', filter],
    queryFn: () => api.getSellerProductsApi(filter),
    staleTime: STALE.products,
  })
}

export function useSellerInventoryApi(filter: SellerInventoryFilter = {}) {
  return useQuery({
    queryKey: ['seller-inventory', filter],
    queryFn: () => api.getSellerInventoryApi(filter),
    staleTime: STALE.inventory,
  })
}

export function useSellerProductById(productId: string | null) {
  return useQuery<SellerProduct | null>({
    queryKey: ['seller-product', productId],
    queryFn: () => api.getSellerProductById(productId as string),
    enabled: !!productId,
    staleTime: STALE.products,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<SellerProduct> }) =>
      api.updateProduct(productId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['seller-product', variables.productId] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useDuplicateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.duplicateProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useToggleProductStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.toggleProductStatus,
    onMutate: async (productId: string) => {
      await qc.cancelQueries({ queryKey: ['seller-products'] })
      const prev = qc.getQueryData<{ items: SellerProduct[]; total: number; counts: Record<string, number> }>(['seller-products', {}])
      if (prev) {
        qc.setQueryData(['seller-products', {}], {
          ...prev,
          items: prev.items.map(p =>
            p.id === productId
              ? { ...p, status: (p.status === 'active' ? 'archived' : 'active') as SellerProductStatus, updatedAt: new Date().toISOString() }
              : p
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _productId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['seller-products', {}], ctx.prev)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
    },
  })
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      ids: string[]
      action: 'activate' | 'deactivate' | 'delete' | 'setCategory' | 'adjustPrice' | 'updateStock'
      params?: { categoryId?: string; priceMode?: 'percent' | 'amount'; priceValue?: number; stockValue?: number }
    }) => api.bulkUpdateProducts(vars.ids, vars.action, vars.params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

/**
 * Optimistic stock update — updates the cache immediately, rolls back on error.
 * Inventory (SI) screens rely on this pattern.
 */
export function useUpdateStock() {
  const qc = useQueryClient()

  type UpdateStockVars = {
    productId: string
    variantId?: string
    newCount: number
    mode?: StockEditMode
    reason?: StockEditReason
    note?: string
  }

  type UpdateStockResult = {
    productId: string
    variantId?: string
    stockCount: number
    stock: StockStatus
  }

  const opts = {
    mutationFn: (vars: UpdateStockVars) =>
      api.updateStock(vars.productId, vars.variantId, vars.newCount, vars.mode ?? 'set', vars.reason ?? 'restock', vars.note),
    onMutate: async (vars: UpdateStockVars) => {
      await qc.cancelQueries({ queryKey: ['seller-inventory'] })
      const prevInventory = qc.getQueryData(['seller-inventory'])
      qc.setQueriesData(
        { queryKey: ['seller-inventory'] },
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            products: (old.products ?? []).map((p: any) => {
              if (p.id !== vars.productId) return p
              const newStock: StockStatus =
                vars.newCount <= 0 ? 'out_of_stock' : vars.newCount < 10 ? 'low_stock' : 'in_stock'
              if (vars.variantId) {
                return {
                  ...p,
                  variants: (p.variants ?? []).map((v: any) =>
                    v.id === vars.variantId
                      ? { ...v, stockCount: vars.newCount, stock: newStock }
                      : v,
                  ),
                }
              }
              return { ...p, aggregateStock: vars.newCount, stock: newStock }
            }),
          }
        },
      )
      return { prevInventory }
    },
    onError: (_err: Error, _vars: UpdateStockVars, ctx: any) => {
      if (ctx?.prevInventory !== undefined) {
        qc.setQueryData(['seller-inventory'], ctx.prevInventory)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['search'] })
      qc.invalidateQueries({ queryKey: ['low-stock-alerts'] })
    },
  }

  return useMutation(opts)
}

/**
 * Bulk stock update — optimistic (SS3 pattern).
 * Patches all selected variants in the cache instantly, rolls back on error.
 */
export function useBulkUpdateStock() {
  const qc = useQueryClient()

  type BulkVars = {
    variantIds: string[]
    action: 'set' | 'adjust' | 'threshold' | 'mark_out'
    value?: number
    reason?: StockEditReason
  }

  const opts = {
    mutationFn: (vars: BulkVars) => api.bulkUpdateStock(vars),
    onMutate: async (vars: BulkVars) => {
      await qc.cancelQueries({ queryKey: ['seller-inventory'] })
      const prev = qc.getQueriesData({ queryKey: ['seller-inventory'] })
      qc.setQueriesData({ queryKey: ['seller-inventory'] }, (old: any) => {
        if (!old) return old
        return {
          ...old,
          products: (old.products ?? []).map((p: any) => ({
            ...p,
            variants: (p.variants ?? []).map((v: SellerInventoryVariant) => {
              if (!vars.variantIds.includes(v.id)) return v
              if (vars.action === 'threshold') {
                return { ...v, lowStockThreshold: Math.max(0, vars.value ?? 0) }
              }
              let newCount = v.stockCount
              if (vars.action === 'set') newCount = Math.max(0, vars.value ?? 0)
              else if (vars.action === 'adjust') newCount = Math.max(0, v.stockCount + (vars.value ?? 0))
              else if (vars.action === 'mark_out') newCount = 0
              const status: StockStatus =
                newCount <= 0 ? 'out_of_stock' : newCount < (v.lowStockThreshold ?? 10) ? 'low_stock' : 'in_stock'
              return { ...v, stockCount: newCount, stock: status }
            }),
          })),
        }
      })
      return { prev }
    },
    onError: (_err: Error, _vars: BulkVars, ctx: any) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['search'] })
      qc.invalidateQueries({ queryKey: ['low-stock-alerts'] })
    },
  }

  return useMutation(opts)
}

export function useExportStockCsv() {
  return useMutation({
    mutationFn: () => api.exportStockCsv(),
  })
}

export function useImportStockCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: CsvStockRow[]) => api.importStockCsv(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

// --- Orders ---

export function useSellerOrdersApi(sellerId: string | null, status?: SellerOrderStatusKey) {
  return useQuery<SellerSubOrder[]>({
    queryKey: ['seller-orders', sellerId, status],
    queryFn: () => orderService.getOrders(sellerId as string, status),
    enabled: !!sellerId,
    staleTime: STALE.orders,
  })
}

export function useSellerOrderById(sellerId: string | null, subOrderId: string | null) {
  return useQuery<SellerSubOrder | null>({
    queryKey: ['seller-order', sellerId, subOrderId],
    queryFn: () => orderService.getOrderById(sellerId as string, subOrderId as string),
    enabled: !!sellerId && !!subOrderId,
    staleTime: STALE.orders,
  })
}

/**
 * Optimistic order-status update — updates the list cache immediately,
 * rolls back on error. Orders (SM) screens rely on this.
 */
export function useUpdateOrderStatus() {
  const qc = useQueryClient()

  type Vars = { subOrderId: string; newStatusKey: SellerOrderStatusKey }
  type Result = { subOrderId: string; statusKey: SellerOrderStatusKey; success: boolean }

  const opts = {
    mutationFn: (vars: Vars) => orderService.updateStatus(vars.subOrderId, vars.newStatusKey),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map((o) =>
          o.subOrderId === vars.subOrderId ? { ...o, statusKey: vars.newStatusKey } : o,
        )
      })
      return { prevOrders }
    },
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  }

  return useMutation(opts)
}

export function useFulfillOrder() {
  const qc = useQueryClient()
  type Vars = { subOrderId: string; trackingNumber?: string; carrier?: string }
  return useMutation({
    mutationFn: (vars: Vars) => orderService.fulfill(vars.subOrderId, vars.trackingNumber, vars.carrier),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          o.subOrderId === vars.subOrderId
            ? { ...o, statusKey: 'shipped' as SellerOrderStatusKey, status: 'shipped', trackingNumber: vars.trackingNumber ?? o.trackingNumber, carrier: vars.carrier ?? o.carrier }
            : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: (_data, _err, _vars) => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useRejectOrder() {
  const qc = useQueryClient()
  type Vars = { subOrderId: string; reason: string; reasonDetail?: string }
  return useMutation({
    mutationFn: (vars: Vars) => orderService.reject(vars.subOrderId, vars.reason, vars.reasonDetail),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      const now = new Date().toISOString()
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          o.subOrderId === vars.subOrderId
            ? { ...o, statusKey: 'cancelled_returned' as SellerOrderStatusKey, status: 'cancelled', cancelledAt: now, actionNeeded: false }
            : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
    },
  })
}

export function usePartialShipOrder() {
  const qc = useQueryClient()
  type Vars = { subOrderId: string; itemIds: string[]; trackingNumber: string; carrier: string; shipDate?: string }
  return useMutation({
    mutationFn: (vars: Vars) => orderService.partialShip(vars.subOrderId, vars.itemIds, vars.trackingNumber, vars.carrier, vars.shipDate),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          o.subOrderId === vars.subOrderId
            ? { ...o, trackingNumber: vars.trackingNumber, carrier: vars.carrier }
            : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
    },
  })
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient()
  type Vars = { subOrderIds: string[]; newStatusKey: SellerOrderStatusKey }
  type Result = { results: { subOrderId: string; success: boolean; statusKey: SellerOrderStatusKey }[]; succeeded: number; failed: number }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.bulkUpdateStatus(vars.subOrderIds, vars.newStatusKey),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          vars.subOrderIds.includes(o.subOrderId)
            ? { ...o, statusKey: vars.newStatusKey }
            : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
    },
  })
}

export function useBulkFulfillOrders() {
  const qc = useQueryClient()
  type Vars = { shipments: { subOrderId: string; trackingNumber: string; carrier: string }[] }
  type Result = { results: { subOrderId: string; success: boolean; trackingNumber: string }[]; succeeded: number; failed: number }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.bulkFulfill(vars.shipments),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      const idSet = new Set(vars.shipments.map(s => s.subOrderId))
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          idSet.has(o.subOrderId) ? { ...o, statusKey: 'shipped' as SellerOrderStatusKey } : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
    },
  })
}

// --- Label printed (mock, front-end only) ---

/**
 * Mark one or more sub-orders as having their shipping label printed.
 * Mock / front-end only: patches the TanStack Query cache optimistically,
 * no backend call. Used by the packing-slip / shipping-label generation flow.
 */
export function useMarkLabelPrinted() {
  const qc = useQueryClient()
  type Vars = { subOrderIds: string[]; trackingNumbers?: Record<string, string>; carriers?: Record<string, string> }

  return useMutation({
    mutationFn: async (vars: Vars) => {
      // Mock: resolve immediately, no network.
      return { succeeded: vars.subOrderIds.length, failed: 0 }
    },
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      const now = new Date().toISOString()
      const idSet = new Set(vars.subOrderIds)
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map((o) =>
          idSet.has(o.subOrderId)
            ? {
                ...o,
                labelPrinted: true,
                labelPrintedAt: now,
                trackingNumber: vars.trackingNumbers?.[o.subOrderId] ?? o.trackingNumber,
                carrier: vars.carriers?.[o.subOrderId] ?? o.carrier,
              }
            : o,
        )
      })
      // Also patch single-order detail caches (key: ['seller-order', sellerId, subOrderId]).
      qc.setQueriesData<SellerSubOrder | null>({ queryKey: ['seller-order'] }, (old) => {
        if (!old || !idSet.has(old.subOrderId)) return old
        return {
          ...old,
          labelPrinted: true,
          labelPrintedAt: now,
          trackingNumber: vars.trackingNumbers?.[old.subOrderId] ?? old.trackingNumber,
          carrier: vars.carriers?.[old.subOrderId] ?? old.carrier,
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
    },
  })
}

// --- Cancel / Refund / Return (mock) ---

export function useSellerCancelOrder() {
  const qc = useQueryClient()
  type Vars = { subOrderId: string; reason: SellerCancelReason; reasonDetail?: string }
  type Result = {
    subOrderId: string
    success: boolean
    reason: SellerCancelReason
    restocked: boolean
    refundTriggered: boolean
    refundStatus: RefundStatus
  }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.cancel(vars.subOrderId, vars.reason, vars.reasonDetail),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-orders'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevOrders = qc.getQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] })
      const now = new Date().toISOString()
      qc.setQueriesData<SellerSubOrder[]>({ queryKey: ['seller-orders'] }, (old) => {
        if (!old) return old
        return old.map(o =>
          o.subOrderId === vars.subOrderId
            ? {
                ...o,
                statusKey: 'cancelled_returned' as SellerOrderStatusKey,
                status: 'cancelled',
                cancelReason: vars.reason,
                cancelReasonDetail: vars.reasonDetail,
                cancelledAt: now,
                restockedAt: now,
                refundStatus: (o.paymentType === 'prepaid' ? 'pending' : 'none') as RefundStatus,
                actionNeeded: false,
              }
            : o,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prevOrders }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prevOrders) {
        for (const [key, data] of ctx.prevOrders) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
      qc.invalidateQueries({ queryKey: ['orders'], exact: false })
      qc.invalidateQueries({ queryKey: ['order'], exact: false })
    },
  })
}

export function useSellerReturnRequests(sellerId: string | null) {
  return useQuery<SellerReturnRequest[]>({
    queryKey: ['seller-return-requests', sellerId],
    queryFn: () => orderService.getReturnRequests(sellerId as string),
    enabled: !!sellerId,
    staleTime: STALE.orders,
  })
}

export function useApproveReturnRequest() {
  const qc = useQueryClient()
  type Vars = { requestId: string; resolutionNote?: string }
  type Result = {
    requestId: string
    success: boolean
    status: 'approved'
    refundStatus: RefundStatus
    restocked: boolean
  }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.approveReturn(vars.requestId, vars.resolutionNote),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-return-requests'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = qc.getQueriesData<SellerReturnRequest[]>({ queryKey: ['seller-return-requests'] })
      const now = new Date().toISOString()
      qc.setQueriesData<SellerReturnRequest[]>({ queryKey: ['seller-return-requests'] }, (old) => {
        if (!old) return old
        return old.map(r =>
          r.id === vars.requestId
            ? { ...r, status: 'approved' as const, refundStatus: 'refunded' as const, resolvedAt: now, resolutionNote: vars.resolutionNote }
            : r,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prev }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-return-requests'] })
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
      qc.invalidateQueries({ queryKey: ['seller-inventory'] })
    },
  })
}

export function useRejectReturnRequest() {
  const qc = useQueryClient()
  type Vars = { requestId: string; resolutionNote?: string }
  type Result = {
    requestId: string
    success: boolean
    status: 'rejected'
    refundStatus: RefundStatus
  }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.rejectReturn(vars.requestId, vars.resolutionNote),
    onMutate: async (vars: Vars) => {
      await qc.cancelQueries({ queryKey: ['seller-return-requests'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = qc.getQueriesData<SellerReturnRequest[]>({ queryKey: ['seller-return-requests'] })
      const now = new Date().toISOString()
      qc.setQueriesData<SellerReturnRequest[]>({ queryKey: ['seller-return-requests'] }, (old) => {
        if (!old) return old
        return old.map(r =>
          r.id === vars.requestId
            ? { ...r, status: 'rejected' as const, refundStatus: 'rejected' as const, resolvedAt: now, resolutionNote: vars.resolutionNote }
            : r,
        )
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prev }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_err: Error, _vars: Vars, ctx: any) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-return-requests'] })
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
    },
  })
}

export function useProcessRefund() {
  const qc = useQueryClient()
  type Vars = { subOrderId: string }
  type Result = {
    subOrderId: string
    success: boolean
    refundStatus: RefundStatus
    refundAmount: number
    breakdown: RefundBreakdown
  }

  return useMutation<Result, Error, Vars>({
    mutationFn: vars => orderService.processRefundOrder(vars.subOrderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      qc.invalidateQueries({ queryKey: ['seller-order'] })
    },
  })
}

// --- Promotions (CRUD) ---

export function usePromotions(
  params?: Parameters<typeof api.getPromotionsApi>[0],
) {
  return useQuery<Promotion[]>({
    queryKey: ['seller-promotions', params],
    queryFn: () => api.getPromotionsApi(params),
    staleTime: STALE.promotions,
  })
}

export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createPromotion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-promotions'] })
    },
  })
}

export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ promoId, data }: { promoId: string; data: Partial<Promotion> }) =>
      api.updatePromotion(promoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-promotions'] })
    },
  })
}

export function useDeletePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deletePromotion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-promotions'] })
    },
  })
}

// --- Payouts / Transactions ---

export function usePayouts(sellerId?: string) {
  return useQuery<Payout[]>({
    queryKey: ['seller-payouts', sellerId ?? 'me'],
    queryFn: () => api.getPayouts(sellerId),
    staleTime: STALE.payouts,
  })
}

export function useTransactions(sellerId?: string) {
  return useQuery<Transaction[]>({
    queryKey: ['seller-transactions', sellerId ?? 'me'],
    queryFn: () => api.getSellerTransactions(sellerId),
    staleTime: STALE.transactions,
  })
}

export function useRequestWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { amount: number; method: PayoutMethod }) =>
      api.requestSellerWithdrawal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-payouts'] })
      qc.invalidateQueries({ queryKey: ['seller-transactions'] })
    },
  })
}

// --- Staff ---

export function useStaff(sellerId?: string) {
  return useQuery<StaffMember[]>({
    queryKey: ['seller-staff', sellerId ?? 'me'],
    queryFn: () => api.getStaff(sellerId),
    staleTime: STALE.staff,
  })
}

export function useUpdateStaffRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: StaffRole }) =>
      api.updateStaffRole(staffId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-staff'] })
    },
  })
}

// --- Notifications ---

export function useSellerNotifications(sellerId?: string) {
  return useQuery<SellerNotification[]>({
    queryKey: ['seller-notifications', sellerId ?? 'me'],
    queryFn: () => api.getSellerNotifications(sellerId),
    staleTime: STALE.notifications,
  })
}

export function useUnreadSellerNotificationCount(sellerId?: string) {
  return useQuery<number>({
    queryKey: ['seller-unread-notif-count', sellerId ?? 'me'],
    queryFn: () => api.getUnreadSellerNotificationCount(sellerId),
    staleTime: STALE.notifications,
  })
}

export function useMarkSellerNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markSellerNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-notifications'] })
      qc.invalidateQueries({ queryKey: ['seller-unread-notif-count'] })
    },
  })
}

export function useMarkAllSellerNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markAllSellerNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-notifications'] })
      qc.invalidateQueries({ queryKey: ['seller-unread-notif-count'] })
    },
  })
}

// --- Settings: Shipping ---

export function useShippingSettings(sellerId?: string) {
  return useQuery<ShippingSettings>({
    queryKey: ['seller-shipping', sellerId ?? 'me'],
    queryFn: () => api.getShippingSettings(sellerId),
    staleTime: STALE.store,
  })
}

export function useUpdateShippingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, data }: { sellerId: string; data: Partial<ShippingSettings> }) =>
      api.updateShippingSettings(sellerId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-shipping', variables.sellerId] })
    },
  })
}

// --- Settings: Business / KYC ---

export function useBusinessProfile(sellerId?: string) {
  return useQuery<{ details: BusinessDetails; documents: KycDocument[] }>({
    queryKey: ['seller-business', sellerId ?? 'me'],
    queryFn: () => api.getBusinessProfile(sellerId),
    staleTime: STALE.store,
  })
}

export function useUpdateBusinessProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, data }: { sellerId: string; data: Partial<BusinessDetails> }) =>
      api.updateBusinessProfile(sellerId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-business', variables.sellerId] })
    },
  })
}

export function useResubmitKycDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => api.resubmitKycDocument(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-business'] })
    },
  })
}

// --- Settings: Notification Preferences ---

export function useNotificationPrefs(sellerId?: string) {
  return useQuery<NotificationPreferences>({
    queryKey: ['seller-notif-prefs', sellerId ?? 'me'],
    queryFn: () => api.getNotificationPrefs(sellerId),
    staleTime: STALE.notifications,
  })
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, data }: { sellerId: string; data: Partial<NotificationPreferences> }) =>
      api.updateNotificationPrefs(sellerId, data),
    onMutate: async (variables) => {
      const key = ['seller-notif-prefs', variables.sellerId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<NotificationPreferences>(key)
      if (prev) qc.setQueryData(key, { ...prev, ...variables.data })
      return { prev, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-notif-prefs', variables.sellerId] })
    },
  })
}

// --- Settings: Staff (extended) ---

export function useInviteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.inviteStaffMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-staff'] })
    },
  })
}

export function useRemoveStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (staffId: string) => api.removeStaffMember(staffId),
    onMutate: async (staffId) => {
      const key = ['seller-staff', 'me']
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<StaffMember[]>(key)
      if (prev) qc.setQueryData(key, prev.filter(s => s.id !== staffId))
      return { prev, key }
    },
    onError: (_err, _staffId, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-staff'] })
    },
  })
}

// --- Settings: Account ---

export function useActiveSessions(sellerId?: string) {
  return useQuery<ActiveSession[]>({
    queryKey: ['seller-sessions', sellerId ?? 'me'],
    queryFn: () => api.getActiveSessions(sellerId),
    staleTime: STALE.store,
  })
}

export function useSignOutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.signOutSession(sessionId),
    onMutate: async (sessionId) => {
      const key = ['seller-sessions', 'me']
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ActiveSession[]>(key)
      if (prev) qc.setQueryData(key, prev.filter(s => s.id !== sessionId))
      return { prev, key }
    },
    onError: (_err, _sessionId, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-sessions'] })
    },
  })
}

export function useUpdateAccountProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, data }: { sellerId: string; data: { name?: string; phone?: string; email?: string } }) =>
      api.updateAccountProfile(sellerId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['seller-store', variables.sellerId] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, newPwd }: { current: string; newPwd: string }) =>
      api.changePassword(current, newPwd),
  })
}

// --- Export Report ---

export function useExportReport() {
  return useMutation<ExportReportResult, Error, { range: SellerStatsRange; type: ExportReportType }>({
    mutationFn: (vars) => api.exportReport(vars.range, vars.type),
  })
}

// --- Campaigns ---

export function useCampaigns() {
  return useQuery<api.Campaign[]>({
    queryKey: ['seller-campaigns'],
    queryFn: () => api.campaignService.list(),
    staleTime: STALE.promotions,
  })
}

export function useOptIntoCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { campaignId: string; productIds: string[]; discountValue: number }) =>
      api.campaignService.optIn(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['seller-campaigns'] })
      const prev = qc.getQueryData<{ id: string; participation?: { status: string } }[]>(['seller-campaigns'])
      qc.setQueryData(['seller-campaigns'], (old: any) => {
        if (!old) return old
        return old.map((c: any) => c.id === input.campaignId
          ? { ...c, participation: { status: 'applied', productIds: input.productIds, discountValue: input.discountValue, appliedAt: new Date().toISOString() } }
          : c)
      })
      return { prev }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(['seller-campaigns'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-campaigns'] })
    },
  })
}

export function useWithdrawFromCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campaignId: string) => api.campaignService.withdraw(campaignId),
    onMutate: async (campaignId) => {
      await qc.cancelQueries({ queryKey: ['seller-campaigns'] })
      const prev = qc.getQueryData(['seller-campaigns'])
      qc.setQueryData(['seller-campaigns'], (old: any) => {
        if (!old) return old
        return old.map((c: any) => c.id === campaignId
          ? { ...c, participation: { status: 'upcoming', productIds: [], discountValue: 0, appliedAt: '' } }
          : c)
      })
      return { prev }
    },
    onError: (_err, _campaignId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['seller-campaigns'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-campaigns'] })
    },
  })
}

// --- Dashboard ---

const DASHBOARD_STALE = {
  stats: 1000 * 60,
  activity: 1000 * 30,
  goLive: 1000 * 120,
} as const

export function useSellerDashboardStats(range: import('@chinooz/mock-data').SellerDateRange) {
  return useQuery<import('@chinooz/mock-data').SellerDashboardMetrics>({
    queryKey: ['seller-dashboard-stats', range.key, range.days, range.custom?.start, range.custom?.end],
    queryFn: () => api.getSellerDashboardStats(range),
    staleTime: DASHBOARD_STALE.stats,
  })
}

export function useSellerDashboardEmpty(range: import('@chinooz/mock-data').SellerDateRange) {
  return useQuery<import('@chinooz/mock-data').SellerDashboardMetrics>({
    queryKey: ['seller-dashboard-empty', range.key, range.days],
    queryFn: () => api.getSellerDashboardStatsEmpty(range),
    staleTime: DASHBOARD_STALE.stats,
  })
}

export function useGoLiveChecklist() {
  return useQuery({
    queryKey: ['seller-go-live-checklist'],
    queryFn: () => api.getGoLiveChecklist(),
    staleTime: DASHBOARD_STALE.goLive,
  })
}
