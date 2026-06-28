/**
 * Inventory service boundary layer.
 *
 * This provides a clean API surface for inventory operations that can be
 * swapped from mock → Supabase without changing hooks or UI components.
 *
 * The mock implementation delegates to the functions in api.ts.
 * A Supabase implementation would replace these with RPC calls / table queries.
 */

import type {
  SellerInventoryProduct,
  SellerInventoryVariant,
  StockStatus,
  StockEditMode,
  StockEditReason,
  StockHistoryEntry,
  BulkStockOperation,
  BulkStockResult,
  CsvStockRow,
  StockAlertSummary,
} from '@chinooz/types'
import {
  getSellerInventory,
  bulkUpdateStock,
  exportStockCsv,
  importStockCsv,
  getStockHistory,
  getLowStockAlerts,
  updateThreshold,
  setRestockReminder,
  recordStockHistoryEntry,
  type SellerInventoryFilter,
  type SellerInventoryResult,
  type UpdateStockInput,
} from './api'

export interface InventoryService {
  getInventory(filter: SellerInventoryFilter): Promise<SellerInventoryResult>
  updateStock(input: UpdateStockInput): Promise<{ success: boolean; variant?: SellerInventoryVariant; error?: string }>
  bulkUpdate(op: BulkStockOperation): Promise<BulkStockResult>
  getHistory(variantId?: string, limit?: number): Promise<StockHistoryEntry[]>
  getAlerts(): Promise<StockAlertSummary>
  setThreshold(variantId: string, threshold: number): Promise<{ success: boolean; variant?: SellerInventoryVariant }>
  setRestockReminder(variantId: string, enabled: boolean): Promise<{ success: boolean; variant?: SellerInventoryVariant }>
  exportCsv(): Promise<string>
  importCsv(rows: CsvStockRow[]): Promise<BulkStockResult>
}

export const mockInventoryService: InventoryService = {
  getInventory: (filter) => getSellerInventory(filter),
  updateStock: (input) => {
    // Delegate to the existing sellerApi.updateStock via dynamic import
    // to avoid circular deps. For now, record + return.
    const variant = recordStockHistoryEntry(input.variantId, input.mode, input.reason, input.note, input.newStock)
    return Promise.resolve({ success: true, variant: variant ? {
      id: variant.variantId,
      productId: '',
      name: '',
      sku: variant.sku,
      price: 0,
      currency: 'NPR',
      stockCount: variant.newStock,
      stock: variant.newStock <= 0 ? 'out_of_stock' : variant.newStock < 10 ? 'low_stock' : 'in_stock',
      attributes: {},
      image: '',
      salesCount: 0,
    } as SellerInventoryVariant : undefined })
  },
  bulkUpdate: (op) => bulkUpdateStock(op),
  getHistory: (variantId, limit) => getStockHistory(variantId, limit),
  getAlerts: () => getLowStockAlerts(),
  setThreshold: (variantId, threshold) => updateThreshold(variantId, threshold),
  setRestockReminder: (variantId, enabled) => setRestockReminder(variantId, enabled),
  exportCsv: () => exportStockCsv(),
  importCsv: (rows) => importStockCsv(rows),
}

export const inventoryService = mockInventoryService
export type { SellerInventoryFilter, SellerInventoryResult, UpdateStockInput }
