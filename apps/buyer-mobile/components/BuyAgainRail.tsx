import React, { memo, useCallback, useMemo } from 'react'
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInRight, useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useOrders, useReorder } from '@chinooz/hooks'
import { useRecentlyViewedStore } from '@chinooz/state'
import { useAppTheme } from './ThemeProvider'
import { spacing, radii, fontSz, springs, duration } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { SafeImage } from '@chinooz/ui'
import { SectionHeader } from './SectionHeader'
import ShimmerBar from './ShimmerBar'
import Icon from './Icon'
import type { Order } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function BuyAgainRailInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { colors } = useAppTheme()
  const { data: orders, isLoading } = useOrders({ status: 'delivered' })
  const reorderMutation = useReorder()
  const addViewed = useRecentlyViewedStore(s => s.addViewed)

  const deliveredOrders = useMemo(() => {
    if (!orders) return []
    return orders.slice(0, 8)
  }, [orders])

  const handleReorder = useCallback((order: Order) => {
    reorderMutation.mutate(order.id)
  }, [reorderMutation])

  const handlePress = useCallback((order: Order) => {
    const firstItem = order.items[0]
    if (firstItem) {
      addViewed(firstItem.productId)
      router.push({ pathname: '/product/[id]', params: { id: firstItem.productId } })
    }
  }, [router, addViewed])

  if (isLoading) {
    return (
      <View>
        <SectionHeader title={t('home.buyAgain')} icon="repeat" />
        <View style={styles.skeletonRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <ShimmerBar width={70} height={70} borderRadius={radii.md} delay={i * 80} />
              <ShimmerBar width="80%" height={10} delay={i * 80 + 100} />
              <ShimmerBar width="60%" height={12} delay={i * 80 + 200} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  if (!deliveredOrders.length) return null

  return (
    <View>
      <SectionHeader
        title={t('home.buyAgain')}
        icon="repeat"
        subtitle={t('home.buyAgainSubtitle')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {deliveredOrders.map((order, i) => (
          <BuyAgainCard
            key={order.id}
            order={order}
            index={i}
            onPress={() => handlePress(order)}
            onReorder={() => handleReorder(order)}
            isReordering={reorderMutation.isPending}
            t={t}
            colorBg={colors.background}
            colorBorder={colors.borderLight}
            colorText={colors.text}
            colorMuted={colors.textMuted}
            colorPrimary={colors.primary}
            colorWhite={colors.white}
            colorShimmer={colors.shimmer}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function BuyAgainCard({
  order,
  index,
  onPress,
  onReorder,
  isReordering,
  t,
  colorBg,
  colorBorder,
  colorText,
  colorMuted,
  colorPrimary,
  colorWhite,
  colorShimmer,
}: {
  order: Order
  index: number
  onPress: () => void
  onReorder: () => void
  isReordering: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
  colorBg: string
  colorBorder: string
  colorText: string
  colorMuted: string
  colorPrimary: string
  colorWhite: string
  colorShimmer: string
}) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handleReorderPress = () => {
    scale.value = withSequence(
      withSpring(0.95, springs.press),
      withSpring(1, springs.press),
    )
    onReorder()
  }

  const firstItem = order.items[0]
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Animated.View entering={FadeInRight.duration(duration.normal).delay(Math.min(index, 7) * 50)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colorBg, borderColor: colorBorder }]}
      >
        <View style={styles.imageRow}>
          {order.items.slice(0, 2).map((item, idx) => (
            <SafeImage
              key={item.id}
              source={item.image}
              style={[styles.thumb, { backgroundColor: colorShimmer }, idx === 1 && styles.thumbSecond]}
              accessibilityLabel={item.name}
            />
          ))}
          {itemCount > 2 && (
            <View style={[styles.thumbOverlay, { backgroundColor: colorBg }]}>
              <Text style={[styles.thumbOverlayText, { color: colorText }]}>
                +{itemCount - 2}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.orderId, { color: colorMuted }]} numberOfLines={1}>
          {firstItem?.name ?? t('home.orderItems', { count: itemCount })}
        </Text>
        <Text style={[styles.price, { color: colorText }]} numberOfLines={1}>
          {formatNPR(order.total)}
        </Text>
        <AnimatedTouchable
          onPress={handleReorderPress}
          activeOpacity={0.85}
          style={[styles.reorderBtn, { backgroundColor: colorPrimary }, animStyle]}
          disabled={isReordering}
        >
          <Icon name="cart" size={12} color={colorWhite} />
          <Text style={[styles.reorderText, { color: colorWhite }]}>
            {isReordering ? t('common.loading') : t('home.reorder')}
          </Text>
        </AnimatedTouchable>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: 140,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[2.5],
    gap: spacing[1.5],
  },
  imageRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
  },
  thumbSecond: {
    marginLeft: -30,
  },
  thumbOverlay: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    marginLeft: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlayText: {
    fontSize: fontSz('sm')[0],
    fontWeight: '700',
  },
  orderId: {
    fontSize: fontSz('xs')[0],
    fontWeight: '500',
  },
  price: {
    fontSize: fontSz('base')[0],
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
    borderRadius: radii.md,
  },
  reorderText: {
    fontSize: fontSz('xs')[0],
    fontWeight: '700',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCard: {
    width: 140,
    gap: 6,
    padding: spacing[2.5],
    borderRadius: radii.lg,
  },
})

export const BuyAgainRail = memo(BuyAgainRailInner)
export default BuyAgainRail
