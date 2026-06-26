export const config = {
  appName: 'Chinooz',
  version: '1.0.0',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.chinooz.com.np',
  defaultLocale: 'en' as const,
  supportedLocales: ['en', 'ne'] as const,
  pagination: {
    defaultPageSize: 20,
  },
  dealRefreshInterval: 30000,
  cartPersistKey: 'chinooz-cart',
  wishlistPersistKey: 'chinooz-wishlist',
  authPersistKey: 'chinooz-auth',
}
