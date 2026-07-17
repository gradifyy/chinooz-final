/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  transpilePackages: [
    '@chinooz/theme',
    '@chinooz/i18n',
    '@chinooz/utils',
    '@chinooz/types',
    '@chinooz/ui-web',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [150, 300, 450, 600, 750],
    minimumCacheTTL: 31536000,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    {
      // Hashed, content-addressed build assets are safe to cache forever.
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  experimental: {
    optimizePackageImports: ['@chinooz/ui-web', 'lucide-react'],
  },
}

module.exports = nextConfig
