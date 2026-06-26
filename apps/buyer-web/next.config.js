/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@chinooz/types', '@chinooz/theme', '@chinooz/utils', '@chinooz/state', '@chinooz/mock-data', '@chinooz/i18n', '@chinooz/ui-web'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = nextConfig
