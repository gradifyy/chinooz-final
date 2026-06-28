import type {
  SellerSubOrder,
  SellerOrderStatusKey,
  SellerCancelReason,
  RefundStatus,
  SellerReturnRequest,
  RefundBreakdown,
} from '@chinooz/types'
import {
  getSellerOrdersApi,
  getSellerOrderById,
  updateOrderStatus,
  fulfillOrder,
  rejectOrder,
  partialShipOrder,
  bulkUpdateStatus,
  bulkFulfillOrders,
  sellerCancelOrder,
  getSellerReturnRequests,
  approveReturnRequest,
  rejectReturnRequest,
  processRefund,
} from './sellerApi'

export interface OrderService {
  getOrders(sellerId: string, status?: SellerOrderStatusKey): Promise<SellerSubOrder[]>
  getOrderById(sellerId: string, subOrderId: string): Promise<SellerSubOrder | null>
  updateStatus(subOrderId: string, newStatusKey: SellerOrderStatusKey): Promise<{ subOrderId: string; statusKey: SellerOrderStatusKey; success: boolean }>
  fulfill(subOrderId: string, trackingNumber?: string, carrier?: string): Promise<{ subOrderId: string; success: boolean; trackingNumber?: string }>
  reject(subOrderId: string, reason: string, reasonDetail?: string): Promise<{ subOrderId: string; success: boolean; reason: string }>
  partialShip(subOrderId: string, itemIds: string[], trackingNumber: string, carrier: string, shipDate?: string): Promise<{ subOrderId: string; success: boolean; trackingNumber: string; shippedCount: number }>
  bulkUpdateStatus(subOrderIds: string[], newStatusKey: SellerOrderStatusKey): Promise<{ results: { subOrderId: string; success: boolean; statusKey: SellerOrderStatusKey }[]; succeeded: number; failed: number }>
  bulkFulfill(shipments: { subOrderId: string; trackingNumber: string; carrier: string }[]): Promise<{ results: { subOrderId: string; success: boolean; trackingNumber: string }[]; succeeded: number; failed: number }>
  cancel(subOrderId: string, reason: SellerCancelReason, reasonDetail?: string): Promise<{ subOrderId: string; success: boolean; reason: SellerCancelReason; restocked: boolean; refundTriggered: boolean; refundStatus: RefundStatus }>
  getReturnRequests(sellerId: string): Promise<SellerReturnRequest[]>
  approveReturn(requestId: string, resolutionNote?: string): Promise<{ requestId: string; success: boolean; status: 'approved'; refundStatus: RefundStatus; restocked: boolean }>
  rejectReturn(requestId: string, resolutionNote?: string): Promise<{ requestId: string; success: boolean; status: 'rejected'; refundStatus: RefundStatus }>
  processRefundOrder(subOrderId: string): Promise<{ subOrderId: string; success: boolean; refundStatus: RefundStatus; refundAmount: number; breakdown: RefundBreakdown }>
}

export const mockOrderService: OrderService = {
  getOrders: getSellerOrdersApi,
  getOrderById: getSellerOrderById,
  updateStatus: updateOrderStatus,
  fulfill: fulfillOrder,
  reject: rejectOrder,
  partialShip: partialShipOrder,
  bulkUpdateStatus: bulkUpdateStatus,
  bulkFulfill: bulkFulfillOrders,
  cancel: sellerCancelOrder,
  getReturnRequests: getSellerReturnRequests,
  approveReturn: approveReturnRequest,
  rejectReturn: rejectReturnRequest,
  processRefundOrder: processRefund,
}

export const orderService = mockOrderService
