import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'
import type { Product } from '@chinooz/types'

const STALE_PRODUCTS = 1000 * 30
const STALE_BANNERS = 1000 * 60
const STALE_DEALS = 1000 * 30
const STALE_CATEGORIES = 1000 * 60

export function useProducts(params?: { categoryId?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
    staleTime: STALE_PRODUCTS,
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

export function useProductById(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id),
    enabled: !!id,
    staleTime: STALE_PRODUCTS,
  })
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product', 'slug', slug],
    queryFn: () => api.getProductBySlug(slug),
    enabled: !!slug,
    staleTime: STALE_PRODUCTS,
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
    staleTime: STALE_PRODUCTS,
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

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
  })
}

export function useOrderById(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrderById(id),
    enabled: !!id,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 30000,
  })
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  })
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId),
    enabled: !!conversationId,
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
