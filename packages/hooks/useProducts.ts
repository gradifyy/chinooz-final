import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'
import type {
  SellerProductFilter,
  SellerInventoryFilter,
  SellerReviewFilter,
  SellerReviewResult,
  BulkReviewAction,
} from '@chinooz/mock-data'
import type { Product, Category, CancelReason, SellerOrderStatusKey, SellerReview, ReviewFlagReason } from '@chinooz/types'

const STALE_PRODUCTS = 1000 * 30

export type SuggestionItem =
  | { type: 'label'; key: string; label: string }
  | { type: 'product'; key: string; product: Product }
  | { type: 'category'; key: string; category: Category }
  | { type: 'brand'; key: string; brand: { id: string; name: string } }
  | { type: 'term'; key: string; term: string }

export function useSearchSuggestions(query: string) {
  const enabled = query.length >= 2
  const productsQ = useQuery({
    queryKey: ['suggestions', 'products', query],
    queryFn: () => api.searchProducts(query),
    enabled,
    staleTime: 0,
    cancelRefetch: true,
  })
  const categoriesQ = useQuery({
    queryKey: ['suggestions', 'categories', query],
    queryFn: () => api.searchCategories(query),
    enabled,
    staleTime: 0,
    cancelRefetch: true,
  })
  const brandsQ = useQuery({
    queryKey: ['suggestions', 'brands', query],
    queryFn: () => api.searchBrands(query),
    enabled,
    staleTime: 0,
    cancelRefetch: true,
  })

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || brandsQ.isLoading
  const isFetching = productsQ.isFetching || categoriesQ.isFetching || brandsQ.isFetching

  const items: SuggestionItem[] = []
  if (!enabled) return { items: [], isLoading: false, isFetching: false }

  const products = productsQ.data?.slice(0, 5) ?? []
  const cats = categoriesQ.data?.slice(0, 4) ?? []
  const brands = brandsQ.data?.slice(0, 3) ?? []

  if (products.length > 0) {
    items.push({ type: 'label', key: 'lbl-products', label: 'products' })
    for (const p of products) items.push({ type: 'product', key: `p-${p.id}`, product: p })
  }
  if (cats.length > 0) {
    items.push({ type: 'label', key: 'lbl-categories', label: 'categories' })
    for (const c of cats) items.push({ type: 'category', key: `c-${c.id}`, category: c })
  }
  if (brands.length > 0) {
    items.push({ type: 'label', key: 'lbl-brands', label: 'brands' })
    for (const b of brands) items.push({ type: 'brand', key: `b-${b.id}`, brand: b })
  }

  return { items, isLoading, isFetching }
}

const STALE_PRODUCT_DETAIL = 1000 * 60
const STALE_REVIEWS = 1000 * 30
const STALE_BANNERS = 1000 * 60
const STALE_DEALS = 1000 * 30
const STALE_CATEGORIES = 1000 * 60

export function useProducts(params?: { categoryId?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
    staleTime: params?.categoryId ? STALE_PRODUCTS : STALE_PRODUCTS,
  })
}

export function useInfiniteProducts(params?: { categoryId?: string; limit?: number }) {
  const limit = params?.limit ?? 10
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', { ...params, limit }],
    queryFn: ({ pageParam = 0 }) => api.getProducts({ ...params, limit, offset: pageParam * limit }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: STALE_PRODUCTS,
  })
}

export function usePrefetchCategory() {
  const queryClient = useQueryClient()
  return (categoryId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['products', { categoryId, limit: 50 }],
      queryFn: () => api.getProducts({ categoryId, limit: 50 }),
      staleTime: STALE_PRODUCTS,
    })
  }
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id),
    enabled: !!id,
    staleTime: STALE_PRODUCT_DETAIL,
  })
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product', 'slug', slug],
    queryFn: () => api.getProductBySlug(slug),
    enabled: !!slug,
    staleTime: STALE_PRODUCT_DETAIL,
  })
}

export function usePrefetchProduct() {
  const queryClient = useQueryClient()
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['product', id],
      queryFn: () => api.getProductById(id),
      staleTime: STALE_PRODUCTS,
    })
  }
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: STALE_CATEGORIES,
  })
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
    staleTime: STALE_DEALS,
  })
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () => api.getBanners(),
    staleTime: STALE_BANNERS,
  })
}

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api.getReviews(productId),
    enabled: !!productId,
    staleTime: STALE_REVIEWS,
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.submitReview,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] })
    },
  })
}

export function useOrders(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.getOrders(params),
    staleTime: 1000 * 60, // 60s
  })
}

export function useOrderById(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrderById(id),
    enabled: !!id,
    staleTime: 1000 * 120, // 120s
  })
}

export function usePrefetchOrder() {
  const queryClient = useQueryClient()
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['order', id],
      queryFn: () => api.getOrderById(id),
      staleTime: 1000 * 120,
    })
  }
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    staleTime: 30000,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 30000,
    staleTime: 30000,
  })
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => api.getUnreadMessageCount(),
    refetchInterval: 30000,
    staleTime: 30000,
  })
}

export function useAssistantUnreadCount() {
  return useQuery({
    queryKey: ['assistant', 'unread-count'],
    queryFn: () => api.getAssistantUnreadCount(),
    refetchInterval: 30000,
    staleTime: 0,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    staleTime: 30000,
  })
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 0,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      api.sendMessage(conversationId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => api.markConversationRead(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getUserProfile(),
  })
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchProducts(query),
    enabled: query.length >= 2,
    staleTime: STALE_PRODUCTS,
  })
}

export function usePopularProducts() {
  return useQuery({
    queryKey: ['products', 'popular'],
    queryFn: () => api.getPopularProducts(),
    staleTime: STALE_PRODUCTS,
  })
}

export function useRecommendedProducts() {
  return useQuery({
    queryKey: ['products', 'recommended'],
    queryFn: () => api.getRecommendedProducts(),
    staleTime: STALE_PRODUCTS,
  })
}

export function useSimilarProducts(categoryId: string, excludeId?: string) {
  return useQuery({
    queryKey: ['products', 'similar', categoryId, excludeId],
    queryFn: () => api.getSimilarProducts(categoryId, excludeId),
    enabled: !!categoryId,
    staleTime: STALE_PRODUCTS,
  })
}

export function useTrendingProducts() {
  return useQuery({
    queryKey: ['products', 'trending'],
    queryFn: () => api.getTrendingProducts(),
    staleTime: STALE_PRODUCTS,
  })
}

export function useNewestProducts() {
  return useQuery({
    queryKey: ['products', 'newest'],
    queryFn: () => api.getNewestProducts(),
    staleTime: STALE_PRODUCTS,
  })
}

export function useNearbyProducts() {
  return useQuery({
    queryKey: ['products', 'nearby'],
    queryFn: () => api.getNearbyProducts(),
    staleTime: STALE_PRODUCTS,
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason, reasonDetail }: { orderId: string; reason: CancelReason; reasonDetail?: string }) =>
      api.cancelOrder(orderId, reason, reasonDetail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
    },
  })
}

export function useRequestReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemIds, reason, reasonDetail }: { orderId: string; itemIds: string[]; reason: CancelReason; reasonDetail?: string }) =>
      api.requestReturn(orderId, itemIds, reason, reasonDetail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
    },
  })
}

export function useReorder() {
  return useMutation({
    mutationFn: (orderId: string) => api.reorder(orderId),
  })
}

export function useOrderInvoice(orderId: string) {
  return useQuery({
    queryKey: ['invoice', orderId],
    queryFn: () => api.getOrderInvoice(orderId),
    enabled: !!orderId,
  })
}

export function useReturnRequests(orderId?: string) {
  return useQuery({
    queryKey: ['returns', orderId],
    queryFn: () => api.getReturnRequests(orderId),
  })
}

export function useSellerProducts(filter: SellerProductFilter) {
  return useQuery({
    queryKey: ['seller-products', filter],
    queryFn: () => api.getSellerProducts(filter),
    staleTime: 1000 * 30,
  })
}

export function useSellerCategories() {
  return useQuery({
    queryKey: ['seller-categories'],
    queryFn: () => api.getSellerCategories(),
    staleTime: 1000 * 60,
  })
}

export function useSellerInventory(filter: SellerInventoryFilter) {
  return useQuery({
    queryKey: ['seller-inventory', filter],
    queryFn: () => api.getSellerInventory(filter),
    staleTime: 1000 * 30,
  })
}

export function useStockHistory(variantId?: string) {
  return useQuery({
    queryKey: ['stock-history', variantId ?? 'all'],
    queryFn: () => api.getStockHistory(variantId),
    staleTime: 1000 * 10,
  })
}

export function useSellerReviews(filter: SellerReviewFilter) {
  return useQuery({
    queryKey: ['seller-reviews', filter],
    queryFn: () => api.getSellerReviews(filter),
    staleTime: 1000 * 30,
  })
}

function optimisticUpdateReview(
  qc: ReturnType<typeof useQueryClient>,
  reviewId: string,
  updater: (r: SellerReview) => SellerReview,
) {
  qc.setQueriesData<SellerReviewResult>({ queryKey: ['seller-reviews'] }, (old) => {
    if (!old) return old
    const updatedItems = old.items.map((r) => (r.id === reviewId ? updater(r) : r))
    return {
      ...old,
      items: updatedItems,
      counts: {
        all: old.counts.all,
        needs_response: updatedItems.filter((r) => (!r.response && !r.flagged)).length,
        responded: updatedItems.filter((r) => (!!r.response)).length,
        flagged: updatedItems.filter((r) => (!!r.flagged)).length,
      },
    }
  })
}

export function useRespondToSellerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.respondToSellerReview(reviewId, text),

    onMutate: async ({ reviewId, text }) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        response: { text, at: new Date().toISOString() },
        flagged: false,
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export function useEditSellerReviewResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.editSellerReviewResponse(reviewId, text),

    onMutate: async ({ reviewId, text }) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        response: { text, at: new Date().toISOString() },
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export function useDeleteSellerReviewResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reviewId: string) => api.deleteSellerReviewResponse(reviewId),

    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        response: undefined,
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export function useToggleSellerReviewFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reviewId: string) => api.toggleSellerReviewFlag(reviewId),

    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        flagged: !r.flagged,
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
  })
}

export function useFlagSellerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: ReviewFlagReason }) =>
      api.flagSellerReview(reviewId, reason),

    onMutate: async ({ reviewId, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        flagged: true,
        flagReason: reason,
        moderationStatus: 'pending' as const,
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
  })
}

export function useUnflagSellerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reviewId: string) => api.unflagSellerReview(reviewId),

    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      optimisticUpdateReview(queryClient, reviewId, (r) => ({
        ...r,
        flagged: false,
        flagReason: undefined,
        moderationStatus: undefined,
      }))
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
  })
}

export function useBulkUpdateSellerReviews() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewIds, action, reason }: { reviewIds: string[]; action: BulkReviewAction; reason?: ReviewFlagReason }) =>
      api.bulkUpdateSellerReviews(reviewIds, action, reason),

    onMutate: async ({ reviewIds, action, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['seller-reviews'] })
      const snapshots = queryClient.getQueriesData<SellerReviewResult>({
        queryKey: ['seller-reviews'],
      })
      queryClient.setQueriesData<SellerReviewResult>({ queryKey: ['seller-reviews'] }, (old) => {
        if (!old) return old
        const updatedItems = old.items.map((r) => {
          if (!reviewIds.includes(r.id)) return r
          if (action === 'mark_responded_not_needed') {
            return { ...r, flagged: false }
          }
          return {
            ...r,
            flagged: true,
            flagReason: reason ?? ('spam' as ReviewFlagReason),
            moderationStatus: 'pending' as const,
          }
        })
        return {
          ...old,
          items: updatedItems,
          counts: {
            all: old.counts.all,
            needs_response: updatedItems.filter((r) => (!r.response && !r.flagged)).length,
            responded: updatedItems.filter((r) => (!!r.response)).length,
            flagged: updatedItems.filter((r) => (!!r.flagged)).length,
          },
        }
      })
      return { snapshots }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] })
    },
  })
}

export function useSellerOrders(sellerId: string | null, status?: SellerOrderStatusKey) {
  return useQuery({
    queryKey: ['seller-orders', sellerId, status],
    queryFn: () => api.getSellerOrders(sellerId as string, status),
    enabled: !!sellerId,
    staleTime: 1000 * 30,
  })
}

export function useSellerOrderById(sellerId: string | null, subOrderId: string | null) {
  return useQuery({
    queryKey: ['seller-order', sellerId, subOrderId],
    queryFn: () => api.getSellerOrderById(sellerId as string, subOrderId as string),
    enabled: !!sellerId && !!subOrderId,
    staleTime: 1000 * 60,
  })
}

export function useSellerConversations(sellerId?: string | null) {
  return useQuery({
    queryKey: ['seller-conversations', sellerId ?? 'me'],
    queryFn: () => api.getSellerConversations(sellerId ?? undefined),
    staleTime: 1000 * 30,
  })
}

export function useSellerMessages(conversationId: string) {
  return useQuery({
    queryKey: ['seller-messages', conversationId],
    queryFn: () => api.getSellerMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 0,
  })
}

export function useSendSellerMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      api.sendSellerMessage(conversationId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-messages', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] })
    },
  })
}

export function useMarkSellerConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => api.markSellerConversationRead(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['seller-messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] })
    },
  })
}

export function useChatOrderContext(sellerId: string | null, orderId?: string) {
  return useQuery({
    queryKey: ['chat-order-context', sellerId, orderId],
    queryFn: () => api.getChatOrderContext(sellerId as string, orderId as string),
    enabled: !!sellerId && !!orderId,
    staleTime: 1000 * 30,
  })
}

export function useChatProductContext(productId?: string) {
  return useQuery({
    queryKey: ['chat-product-context', productId],
    queryFn: () => api.getChatProductContext(productId as string),
    enabled: !!productId,
    staleTime: 1000 * 30,
  })
}

export function useGenerateTracking() {
  return useMutation({
    mutationFn: (orderId: string) => api.generateTrackingInfo(orderId),
  })
}

export function useAttachConversationContext() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, context }: { conversationId: string; context: { type: 'order' | 'product'; id: string } }) =>
      api.attachConversationContext(conversationId, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] })
    },
  })
}
