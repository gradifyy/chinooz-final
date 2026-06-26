import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  FadeIn,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { colors, spacing } from '@chinooz/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { getHomeScrollHandlers } from './_layout'
import FlashDeals from '../../components/FlashDeals'
import RecommendedGrid from '../../components/RecommendedGrid'
import ProductRail from '../../components/ProductRail'
import OfflineBanner from '../../components/OfflineBanner'
import HomeSkeleton from '../../components/HomeSkeleton'
import HeroParallax from '../../components/HeroParallax'
import SectionReveal from '../../components/SectionReveal'
import { useTrendingProducts, useNewestProducts, useNearbyProducts } from '@chinooz/hooks'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16

function ShimmerBar({ w, h, r = 6 }: { w: number | `${number}%`; h: number; r?: number }) {
  return <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: colors.border }} />
}

function CategoryCircleSkeleton() {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <ShimmerBar w={64} h={64} r={32} />
      <ShimmerBar w={48} h={10} />
    </View>
  )
}

export default function HomeScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const scrollY = useSharedValue(0)
  const scrollViewRef = useRef<any>(null)

  const { setScrollToTop } = getHomeScrollHandlers()
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

  useEffect(() => {
    setScrollToTop(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: !reduced })
    })
  }, [reduced])

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    },
  })

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

  if (initialLoad && anyLoading) {
    return (
      <Animated.View entering={FadeIn.duration(reduced ? 0 : 250)} style={{ flex: 1, backgroundColor: colors.background }}>
        <OfflineBanner />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing[6] }}
          showsVerticalScrollIndicator={false}
        >
          <HomeSkeleton />
        </ScrollView>
      </Animated.View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: spacing[4],
          paddingBottom: insets.bottom + spacing[6],
          paddingHorizontal: EDGE_PADDING,
          gap: spacing[6],
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <SectionReveal delay={reduced ? 0 : 0}>
          <HeroParallax scrollY={scrollY} />
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 50}>
          <FlashDeals />
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 100}>
          <ProductRail
            titleKey="home.trendingNow"
            seeAllHref="/search?sort=trending"
            products={trending.data}
            isLoading={trending.isLoading}
            isError={trending.isError}
            onRetry={() => trending.refetch()}
          />
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 120}>
          <ProductRail
            titleKey="home.newArrivals"
            seeAllHref="/search?sort=newest"
            products={newest.data}
            isLoading={newest.isLoading}
            isError={newest.isError}
            onRetry={() => newest.refetch()}
          />
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 140}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing[3] }}>
              {t('categories.title')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <CategoryCircleSkeleton key={i} />
              ))}
            </ScrollView>
          </View>
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 160}>
          <ProductRail
            titleKey="home.nearYou"
            seeAllHref="/search?filter=nearby"
            products={nearby.data}
            isLoading={nearby.isLoading}
            isError={nearby.isError}
            onRetry={() => nearby.refetch()}
          />
        </SectionReveal>

        <SectionReveal delay={reduced ? 0 : 180}>
          <RecommendedGrid />
        </SectionReveal>
      </Animated.ScrollView>
    </View>
  )
}
