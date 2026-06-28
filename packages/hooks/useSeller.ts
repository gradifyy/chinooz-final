import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'
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
} from '@chinooz/types'
import type { SellerProductFilter, SellerInventoryFilter } from '@chinooz/mock-data'

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
    queryFn: () => api.getSellerOrdersApi(sellerId as string, status),
    enabled: !!sellerId,
    staleTime: STALE.orders,
  })
}

export function useSellerOrderById(sellerId: string | null, subOrderId: string | null) {
  return useQuery<SellerSubOrder | null>({
    queryKey: ['seller-order', sellerId, subOrderId],
    queryFn: () => api.getSellerOrderById(sellerId as string, subOrderId as string),
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
    mutationFn: (vars: Vars) => api.updateOrderStatus(vars.subOrderId, vars.newStatusKey),
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
    },
  }

  return useMutation(opts)
}

export function useFulfillOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      subOrderId,
      trackingNumber,
      carrier,
    }: {
      subOrderId: string
      trackingNumber?: string
      carrier?: string
    }) => api.fulfillOrder(subOrderId, trackingNumber, carrier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
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

// --- Export Report ---

export function useExportReport() {
  return useMutation<ExportReportResult, Error, { range: SellerStatsRange; type: ExportReportType }>({
    mutationFn: (vars) => api.exportReport(vars.range, vars.type),
  })
}
