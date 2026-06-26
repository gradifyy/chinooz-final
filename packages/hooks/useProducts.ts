import { useQuery, useSuspenseQuery, useInfiniteQuery } from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'

export function useProducts(params?: { categoryId?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
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
  })
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id),
    enabled: !!id,
  })
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product', 'slug', slug],
    queryFn: () => api.getProductBySlug(slug),
    enabled: !!slug,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
  })
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () => api.getBanners(),
  })
}

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api.getReviews(productId),
    enabled: !!productId,
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
  })
}

export function usePopularProducts() {
  return useQuery({
    queryKey: ['products', 'popular'],
    queryFn: () => api.getPopularProducts(),
  })
}

export function useRecommendedProducts() {
  return useQuery({
    queryKey: ['products', 'recommended'],
    queryFn: () => api.getRecommendedProducts(),
  })
}
