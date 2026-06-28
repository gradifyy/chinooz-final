import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function ConfettiParticle({ delay, reduced }: { delay: number; reduced: boolean }) {
  if (reduced) return null

  const x = useSharedValue(Math.random() * SCREEN_WIDTH)
  const y = useSharedValue(-20)
  const rotate = useSharedValue(0)
  const opacity = useSharedValue(1)
  const scale = useSharedValue(0)

  useEffect(() => {
    const isPlum = Math.random() > 0.5
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }))
    y.value = withDelay(
      delay,
      withTiming(Math.random() * 300 + 200, {
        duration: 1200 + Math.random() * 600,
        easing: Easing.out(Easing.cubic),
      }),
    )
    x.value = withDelay(
      delay,
      withTiming(x.value + (Math.random() - 0.5) * 120, {
        duration: 1200 + Math.random() * 600,
        easing: Easing.out(Easing.cubic),
      }),
    )
    rotate.value = withDelay(
      delay,
      withTiming(Math.random() * 720 - 360, {
        duration: 1200 + Math.random() * 600,
        easing: Easing.out(Easing.cubic),
      }),
    )
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 400 }))
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  const isPlum = Math.random() > 0.5

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isPlum ? colors.primary : colors.gold,
        },
        style,
      ]}
    />
  )
}

function CheckDraw({ reduced }: { reduced: boolean }) {
  const scale = useSharedValue(reduced ? 1 : 0)
  const opacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 })
    opacity.value = withTiming(1, { duration: 300 })
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.checkWrap, style]}>
      <Text style={styles.checkMark}>✓</Text>
    </Animated.View>
  )
}

interface SubOrder {
  sellerName: string
  orderId: string
  eta: string
  total: number
  itemCount: number
}

interface OrderConfirmationProps {
  orderIds: string[]
  subOrders?: SubOrder[]
  total: number
  paymentMethod: string
  deliveryMethod: string
}

export default function OrderConfirmation({
  orderIds,
  subOrders = [],
  total,
  paymentMethod,
  deliveryMethod,
}: OrderConfirmationProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  useEffect(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Confetti */}
      {!reduced && (
        <View style={styles.confettiWrap} pointerEvents="none">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 30} reduced={reduced} />
          ))}
        </View>
      )}

      <View style={styles.content}>
        <CheckDraw reduced={reduced} />

        <Animated.Text
          entering={FadeInDown.delay(reduced ? 0 : 400).duration(300)}
          style={styles.title}
        >
          {t('checkout.orderPlaced')}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(reduced ? 0 : 500).duration(300)}
          style={styles.subtitle}
        >
          {t('checkout.orderConfirmed')}
        </Animated.Text>

        {/* Single order or sub-orders */}
        {subOrders.length > 1 ? (
          <Animated.View entering={FadeInDown.delay(reduced ? 0 : 600).duration(300)} style={styles.subOrders}>
            <Text style={styles.subOrdersTitle}>{t('checkout.subOrders')}</Text>
            {subOrders.map((so, i) => (
              <Animated.View
                key={so.orderId}
                entering={FadeIn.delay(reduced ? 0 : 700 + i * 100).duration(300)}
                style={styles.subOrderCard}
              >
                <View style={styles.subOrderHeader}>
                  <Text style={styles.sellerName}>{so.sellerName}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Confirmed</Text>
                  </View>
                </View>
                <Text style={styles.orderNum}>{t('checkout.orderNumber')}: {so.orderId}</Text>
                <View style={styles.subOrderMeta}>
                  <Text style={styles.metaText}>{t('checkout.eta')}: {so.eta}</Text>
                  <Text style={styles.metaText}>{formatNPR(so.total)}</Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(reduced ? 0 : 600).duration(300)} style={styles.singleOrder}>
            <Text style={styles.orderNum}>{t('checkout.orderNumber')}: {orderIds[0]}</Text>
          </Animated.View>
        )}

        {/* Summary */}
        <Animated.View entering={FadeInDown.delay(reduced ? 0 : 800).duration(300)} style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('cart.total')}</Text>
            <Text style={styles.summaryValue}>{formatNPR(total)}</Text>
          </View>
        </Animated.View>

        {/* Notes */}
        <Animated.View entering={FadeInDown.delay(reduced ? 0 : 900).duration(300)} style={styles.notes}>
          <Text style={styles.noteText}>📄 {t('checkout.digitalReceipt')}</Text>
          <Text style={styles.noteText}>🧾 {t('checkout.vatInvoice')}</Text>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(reduced ? 0 : 1000).duration(300)} style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.push('/orders')}
            style={styles.trackButton}
            activeOpacity={0.85}
            accessibilityLabel={t('orders.trackOrder')}
          >
            <Text style={styles.trackText}>{t('orders.trackOrder')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.shopButton}
            activeOpacity={0.7}
            accessibilityLabel={t('checkout.continueShopping')}
          >
            <Text style={styles.shopText}>{t('checkout.continueShopping')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  confettiWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  checkWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing[2],
  },
  checkMark: {
    fontSize: 32,
    color: colors.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  singleOrder: {
    alignItems: 'center' as const,
    gap: spacing[1],
  },
  subOrders: {
    width: '100%',
    gap: spacing[2],
  },
  subOrdersTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  subOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subOrderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.success,
  },
  orderNum: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'] as const,
  },
  subOrderMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summary: {
    width: '100%',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    fontVariant: ['tabular-nums'] as const,
  },
  notes: {
    gap: spacing[1],
    alignItems: 'center' as const,
  },
  noteText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  actions: {
    width: '100%',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  trackButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  trackText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.white,
  },
  shopButton: {
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  shopText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
}
