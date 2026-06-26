import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
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
import { useTrendingProducts, useNewestProducts, useNearbyProducts } from '@chinooz/hooks'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16

function HeroSkeleton() {
  return (
    <View style={{ width: SCREEN_WIDTH - EDGE_PADDING * 2, height: 180, borderRadius: 16, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ flex: 1, backgroundColor: colors.shimmer }} />
    </View>
  )
}

function ProductCardSkeleton() {
  const cardWidth = (SCREEN_WIDTH - EDGE_PADDING * 2 - 12) / 2
  return (
    <View style={{ width: cardWidth, gap: 6 }}>
      <View style={{ width: cardWidth, height: cardWidth * 1.25, borderRadius: 12, backgroundColor: colors.border }} />
      <View style={{ width: '100%', height: 14, borderRadius: 6, backgroundColor: colors.border }} />
      <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
      <View style={{ width: '40%', height: 16, borderRadius: 6, backgroundColor: colors.border }} />
    </View>
  )
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      {action && <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{action}</Text>}
    </View>
  )
}

function CategoryCircleSkeleton() {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border }} />
      <View style={{ width: 48, height: 10, borderRadius: 5, backgroundColor: colors.border }} />
    </View>
  )
}

export default function HomeScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const [refreshing, setRefreshing] = useState(false)
  const scrollY = useSharedValue(0)
  const scrollViewRef = useRef<any>(null)

  const { setScrollToTop } = getHomeScrollHandlers()
  const trending = useTrendingProducts()
  const newest = useNewestProducts()
  const nearby = useNearbyProducts()

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
      <HeroSkeleton />

      <FlashDeals />

      <ProductRail
        titleKey="home.trendingNow"
        seeAllHref="/search?sort=trending"
        products={trending.data}
        isLoading={trending.isLoading}
        isError={trending.isError}
        onRetry={() => trending.refetch()}
      />

      <ProductRail
        titleKey="home.newArrivals"
        seeAllHref="/search?sort=newest"
        products={newest.data}
        isLoading={newest.isLoading}
        isError={newest.isError}
        onRetry={() => newest.refetch()}
      />

      <View>
        <SectionHeader title={t('categories.title')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CategoryCircleSkeleton key={i} />
          ))}
        </ScrollView>
      </View>

      <ProductRail
        titleKey="home.nearYou"
        seeAllHref="/search?filter=nearby"
        products={nearby.data}
        isLoading={nearby.isLoading}
        isError={nearby.isError}
        onRetry={() => nearby.refetch()}
      />

      <RecommendedGrid />
    </Animated.ScrollView>
  )
}
