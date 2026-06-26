'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'
import FlashDeals from '@/components/FlashDeals'
import RecommendedGrid from '@/components/RecommendedGrid'
import ProductRail from '@/components/ProductRail'
import OfflineBanner from '@/components/OfflineBanner'
import HomeSkeleton from '@/components/HomeSkeleton'
import { useTrendingProducts, useNewestProducts, useNearbyProducts } from '@chinooz/hooks'

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{
        duration: reduced ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1],
        delay: reduced ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  )
}

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
              <SectionReveal delay={0}>
                <div className="w-full h-[220px] rounded-2xl bg-primary-50 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-0"
                    style={{ y: 0 }}
                    whileInView={{ y: -20 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <div className="w-full h-[260px] bg-primary-50 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary/15" />
                      </div>
                    </div>
                  </motion.div>
                  <div className="absolute bottom-4 left-4">
                    <div className="w-40 h-3.5 bg-white/30 rounded mb-1.5" />
                    <div className="w-24 h-2.5 bg-white/20 rounded" />
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.05}>
                <FlashDeals />
              </SectionReveal>

              <SectionReveal delay={0.08}>
                <ProductRail
                  titleKey="home.trendingNow"
                  seeAllHref="/search?sort=trending"
                  products={trending.data}
                  isLoading={trending.isLoading}
                  isError={trending.isError}
                  onRetry={() => trending.refetch()}
                />
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <ProductRail
                  titleKey="home.newArrivals"
                  seeAllHref="/search?sort=newest"
                  products={newest.data}
                  isLoading={newest.isLoading}
                  isError={newest.isError}
                  onRetry={() => newest.refetch()}
                />
              </SectionReveal>

              <SectionReveal delay={0.12}>
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
              </SectionReveal>

              <SectionReveal delay={0.14}>
                <ProductRail
                  titleKey="home.nearYou"
                  seeAllHref="/search?filter=nearby"
                  products={nearby.data}
                  isLoading={nearby.isLoading}
                  isError={nearby.isError}
                  onRetry={() => nearby.refetch()}
                />
              </SectionReveal>

              <SectionReveal delay={0.16}>
                <RecommendedGrid />
              </SectionReveal>

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
