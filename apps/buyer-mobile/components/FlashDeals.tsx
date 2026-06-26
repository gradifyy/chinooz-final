import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  SlideOutRight,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useDeals, useProducts } from '@chinooz/hooks'
import { formatNPR } from '@chinooz/utils'
import { colors, spacing, radii } from '@chinooz/theme'
import type { Deal, Product } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function getTimeRemaining(endsAt: string): { total: number; hours: number; minutes: number; seconds: number } {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  const total = Math.max(0, end - now)
  const hours = Math.floor(total / 3600000)
  const minutes = Math.floor((total % 3600000) / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  return { total, hours, minutes, seconds }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function CountdownDigit({ value, ended }: { value: string; ended: boolean }) {
  const opacity = useSharedValue(1)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current !== value && !ended) {
      opacity.value = withSequence(
        withTiming(0, { duration: 75, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 75, easing: Easing.in(Easing.ease) }),
      )
      prevValue.current = value
    }
  }, [value, ended])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View style={style}>
      <Text style={[styles.countdownDigit, ended && styles.countdownDigitEnded]}>
        {ended ? '00' : value}
      </Text>
    </Animated.View>
  )
}

function DiscountBadge({ deal }: { deal: Deal }) {
  const scale = useSharedValue(1)

  useEffect(() => {
    const pulse = () => {
      scale.value = withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      )
    }
    pulse()
    const interval = setInterval(pulse, 2000)
    return () => clearInterval(interval)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const label = deal.discountType === 'percentage' ? `-${deal.discount}%` : `-NPR ${deal.discount.toLocaleString('en-IN')}`

  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  )
}

function DealCard({
  deal,
  product,
  onExpired,
}: {
  deal: Deal
  product: Product | undefined
  onExpired: (id: string) => void
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [time, setTime] = useState(() => getTimeRemaining(deal.endsAt))
  const [ended, setEnded] = useState(false)
  const [removing, setRemoving] = useState(false)
  const scale = useSharedValue(1)

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(deal.endsAt)
      setTime(remaining)
      if (remaining.total <= 0 && !ended) {
        setEnded(true)
        setTimeout(() => {
          setRemoving(true)
          setTimeout(() => onExpired(deal.id), 400)
        }, 3000)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [deal.endsAt, ended, deal.id, onExpired])

  const salePrice = product
    ? deal.discountType === 'percentage'
      ? Math.round(product.price * (1 - deal.discount / 100))
      : product.price - deal.discount
    : 0

  const handlePress = useCallback(() => {
    if (product) router.push({ pathname: '/product/[id]', params: { id: product.id } })
  }, [product, router])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (removing) {
    return (
      <Animated.View exiting={SlideOutRight.duration(300)}>
        <View style={styles.card} />
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }) }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }) }}
        activeOpacity={0.9}
        style={[styles.card, animStyle, ended && styles.cardEnded]}
      >
        <View style={styles.imageWrap}>
          <View style={[styles.image, ended && styles.imageEnded]}>
            <DiscountBadge deal={deal} />
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.dealTitle, ended && styles.dealTitleEnded]} numberOfLines={1}>
            {deal.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.salePrice, ended && styles.salePriceEnded]}>
              {formatNPR(salePrice)}
            </Text>
            {product && (
              <Text style={styles.originalPrice}>{formatNPR(product.price)}</Text>
            )}
          </View>

          {ended ? (
            <Text style={styles.endedText}>{t('common.dealEnded')}</Text>
          ) : (
            <View style={styles.countdownRow}>
              <CountdownDigit value={pad(time.hours)} ended={ended} />
              <Text style={styles.countdownSep}>:</Text>
              <CountdownDigit value={pad(time.minutes)} ended={ended} />
              <Text style={styles.countdownSep}>:</Text>
              <CountdownDigit value={pad(time.seconds)} ended={ended} />
            </View>
          )}
        </View>
      </AnimatedTouchable>
    </Animated.View>
  )
}

export default function FlashDeals() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: deals, isLoading } = useDeals()
  const { data: products } = useProducts()
  const [activeDealIds, setActiveDealIds] = useState<Set<string>>(new Set())

  const activeDeals = useMemo(() => {
    if (!deals) return []
    return deals.filter(d => !activeDealIds.has(d.id))
  }, [deals, activeDealIds])

  useEffect(() => {
    if (deals) {
      setActiveDealIds(new Set())
    }
  }, [deals])

  const handleExpired = useCallback((id: string) => {
    setActiveDealIds(prev => new Set([...prev, id]))
  }, [])

  const productMap = useMemo(() => {
    if (!products?.items) return new Map<string, Product>()
    return new Map(products.items.map(p => [p.id, p]))
  }, [products])

  if (isLoading) {
    return (
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>⚡ {t('home.flashDeals')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '50%' }]} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  if (!activeDeals.length) return null

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ {t('home.flashDeals')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/deals')}
          style={styles.seeAll}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeDeals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            product={productMap.get(deal.productId)}
            onExpired={handleExpired}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardEnded: {
    opacity: 0.6,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: 160,
    height: 140,
    backgroundColor: colors.border,
  },
  imageEnded: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  cardBody: {
    padding: spacing[3],
    gap: 4,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dealTitleEnded: {
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  salePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  salePriceEnded: {
    color: colors.textMuted,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  countdownDigit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.primary50,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    minWidth: 26,
    textAlign: 'center',
  },
  countdownDigitEnded: {
    color: colors.textTertiary,
    backgroundColor: colors.border,
  },
  countdownSep: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  endedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 4,
  },
  skeletonCard: {
    width: 160,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skeletonImage: {
    width: 160,
    height: 140,
    backgroundColor: colors.border,
  },
  skeletonBody: {
    padding: spacing[3],
    gap: 6,
  },
  skeletonLine: {
    width: '80%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
})
