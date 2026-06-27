import React, { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  FadeInRight,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useRecommendedProducts } from '@chinooz/hooks'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function EmptyCart() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: recommended, isLoading } = useRecommendedProducts()

  const scale = useSharedValue(reduced ? 1 : 0.85)
  const opacity = useSharedValue(reduced ? 1 : 0)
  const ctaScale = useSharedValue(1)

  useEffect(() => {
    if (reduced) return
    opacity.value = withDelay(100, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }))
    scale.value = withDelay(100, withSpring(1, { damping: 18, stiffness: 120, mass: 1 }))
  }, [])

  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }))

  const handlePressIn = () => {
    if (!reduced) ctaScale.value = withSpring(0.97, { damping: 15, stiffness: 400 })
  }
  const handlePressOut = () => {
    if (!reduced) ctaScale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing[8] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Illustration + CTA */}
      <View style={styles.centerArea}>
        <Animated.View style={[styles.illustrationWrap, illustrationStyle]}>
          <View style={styles.illustrationCircle}>
            <View style={styles.illustrationInner}>
              <View style={styles.cartIcon}>
                <Text style={{ fontSize: 28 }}>🛒</Text>
              </View>
            </View>
          </View>
          {/* Floating badges */}
          <View style={[styles.floatingBadge, { top: 10, left: 20 }]}>
            <Text style={{ fontSize: 16 }}>📦</Text>
          </View>
          <View style={[styles.floatingBadge, { top: 30, right: 15 }]}>
            <Text style={{ fontSize: 14 }}>✨</Text>
          </View>
          <View style={[styles.floatingBadge, { bottom: 20, left: 10 }]}>
            <Text style={{ fontSize: 12 }}>🛍️</Text>
          </View>
        </Animated.View>

        <Text style={styles.title}>{t('cart.empty')}</Text>
        <Text style={styles.subtitle}>{t('cart.emptySubtitle')}</Text>

        <AnimatedTouchable
          onPress={() => router.replace('/(tabs)')}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          style={[styles.ctaButton, ctaStyle]}
        >
          <Text style={styles.ctaText}>{t('cart.startShopping')}</Text>
        </AnimatedTouchable>
      </View>

      {/* Recommended rail */}
      {recommended && recommended.length > 0 && (
        <View style={styles.railSection}>
          <Text style={styles.railTitle}>{t('cart.recentlyViewed')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: spacing[4] }}>
            {recommended.slice(0, 8).map((product, i) => (
              <Animated.View
                key={product.id}
                entering={FadeInRight.duration(250).delay(i * 40).springify().damping(18)}
              >
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
                  style={styles.railCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.railImage}>
                    <Text style={{ fontSize: 24 }}>📦</Text>
                  </View>
                  <View style={styles.railBody}>
                    <Text style={styles.railName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.railPrice}>{formatNPR(product.price)}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  )
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const styles = {
  centerArea: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[8],
    paddingTop: spacing[12],
    gap: spacing[3],
  },
  illustrationWrap: {
    width: 160,
    height: 160,
    marginBottom: spacing[4],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  illustrationInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(138,27,87,0.08)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cartIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(138,27,87,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  floatingBadge: {
    position: 'absolute' as const,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3.5],
    borderRadius: radii.lg,
    marginTop: spacing[2],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.white,
  },
  railSection: {
    marginTop: spacing[8],
    gap: spacing[3],
  },
  railTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    paddingHorizontal: spacing[4],
  },
  railCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden' as const,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  railImage: {
    width: 160,
    height: 160,
    backgroundColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  railBody: {
    padding: spacing[2.5],
    gap: spacing[1],
  },
  railName: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text,
  },
  railPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
}
