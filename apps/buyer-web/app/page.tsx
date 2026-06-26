'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'
import FlashDeals from '@/components/FlashDeals'
import RecommendedGrid from '@/components/RecommendedGrid'
import ProductRail from '@/components/ProductRail'
import OfflineBanner from '@/components/OfflineBanner'
import HomeSkeleton from '@/components/HomeSkeleton'
import { useTrendingProducts, useNewestProducts, useNearbyProducts } from '@chinooz/hooks'

export default function Home() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const trending = useTrendingProducts()
  const newest = useNewestProducts()
  const nearby = useNearbyProducts()

  const anyLoading = trending.isLoading || newest.isLoading || nearby.isLoading
  const anyData = trending.data || newest.data || nearby.data

  useEffect(() => {
    if (!anyLoading && anyData) {
      const timer = setTimeout(() => setInitialLoad(false), 50)
      return () => clearTimeout(timer)
    }
  }, [anyLoading, anyData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
      ])
      await new Promise(r => setTimeout(r, 400))
    } catch {} finally {
      setRefreshing(false)
    }
  }, [queryClient])

  return (
    <Screen>
      <OfflineBanner />
      <Container className="py-6">
        <AnimatePresence mode="wait">
          {initialLoad && anyLoading ? (
            <motion.div
              key="skeleton"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
            >
              <HomeSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="flex flex-col gap-6"
            >
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.4 }}
              >
                <HomeSkeleton />
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
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-semibold text-text">{t('categories.title')}</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                        <div className="w-[72px] h-[72px] rounded-full bg-border" />
                        <div className="w-14 h-2.5 bg-border rounded" />
                      </div>
                    ))}
                  </div>
                </div>
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

              <div className="flex justify-center py-4">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-xs text-text-tertiary hover:text-text-muted transition-colors disabled:opacity-50"
                >
                  {refreshing ? t('common.loading') : '↻ Refresh'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </Screen>
  )
}
