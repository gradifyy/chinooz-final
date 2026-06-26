'use client'

import { Container, Screen, Skeleton, Section } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'
import FlashDeals from '@/components/FlashDeals'
import RecommendedGrid from '@/components/RecommendedGrid'
import ProductRail from '@/components/ProductRail'
import { useTrendingProducts, useNewestProducts, useNearbyProducts } from '@chinooz/hooks'

function HeroSkeleton() {
  return <Skeleton width="100%" height={220} borderRadius={16} />
}

function CategoryCircleSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <Skeleton width={72} height={72} circle />
      <Skeleton width={56} height={10} />
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton height={200} borderRadius={12} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="60%" height={12} />
      <Skeleton width="40%" height={16} />
    </div>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const [refreshing, setRefreshing] = useState(false)
  const trending = useTrendingProducts()
  const newest = useNewestProducts()
  const nearby = useNearbyProducts()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      await queryClient.invalidateQueries({ queryKey: ['deals'] })
      await queryClient.invalidateQueries({ queryKey: ['banners'] })
      await new Promise(r => setTimeout(r, 600))
    } catch {} finally {
      setRefreshing(false)
    }
  }, [queryClient])

  return (
    <Screen>
      <Container className="py-6">
        <div className="flex flex-col gap-6">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4 }}
          >
            <HeroSkeleton />
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.1 }}
          >
            <FlashDeals />
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.15 }}
          >
            <ProductRail
              titleKey="home.trendingNow"
              seeAllHref="/search?sort=trending"
              products={trending.data}
              isLoading={trending.isLoading}
              isError={trending.isError}
              onRetry={() => trending.refetch()}
            />
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.17 }}
          >
            <ProductRail
              titleKey="home.newArrivals"
              seeAllHref="/search?sort=newest"
              products={newest.data}
              isLoading={newest.isLoading}
              isError={newest.isError}
              onRetry={() => newest.refetch()}
            />
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.2 }}
          >
            <Section title={t('categories.title')}>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {Array.from({ length: 8 }).map((_, i) => (
                  <CategoryCircleSkeleton key={i} />
                ))}
              </div>
            </Section>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.22 }}
          >
            <ProductRail
              titleKey="home.nearYou"
              seeAllHref="/search?filter=nearby"
              products={nearby.data}
              isLoading={nearby.isLoading}
              isError={nearby.isError}
              onRetry={() => nearby.refetch()}
            />
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.25 }}
          >
            <RecommendedGrid />
          </motion.div>

          {refreshing && (
            <div className="text-center py-2">
              <span className="text-sm text-text-muted">Refreshing...</span>
            </div>
          )}

          <button
            onClick={handleRefresh}
            className="text-xs text-text-tertiary text-center py-2 hover:text-text-muted transition-colors"
          >
            {refreshing ? t('common.loading') : '↻ Pull to refresh'}
          </button>
        </div>
      </Container>
    </Screen>
  )
}
