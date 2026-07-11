import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useCartStore, useAddressStore, useWishlistStore } from '@chinooz/state'
import { useUnreadNotificationCount } from '@chinooz/hooks'
import { colors as lightColors, spacing, fontSz, radii, springs } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import Icon from './Icon'
import { useAppTheme } from './ThemeProvider'
import type { SharedValue } from 'react-native-reanimated'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)
// Pronounced deep→light vertical gradient (very deep maroon under the notch,
// easing up to a lighter plum by the search pill) — the onboarding language.
const HEADER_GRADIENT = [
  lightColors.plumDeep,
  lightColors.primaryDark,
  lightColors.plumLight,
] as const
const WORDMARK_INK = lightColors.creamInk
// One shared radius for every rounded surface (search pill, hero, card images,
// header bottom) so corners read identically across the home screen.
const SURFACE_RADIUS = 20

interface HomeHeaderProps {
  /** Drives the deepening drop-shadow as the feed scrolls beneath the header. */
  scrollY?: SharedValue<number>
}

/**
 * The maroon brand header for Home: wordmark + delivery location, a notification
 * bell and cart on the right, and a persistent white search pill. Rendered fixed
 * above the scrolling feed so the search pill always stays in reach. Replaces the
 * shared TopBar + GreetingBar on the Home route.
 */
function HomeHeaderInner({ scrollY }: HomeHeaderProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const cartItems = useCartStore(s => s.items)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const wishlistCount = useWishlistStore(s => s.entries.length)
  const { data: unreadNotifs } = useUnreadNotificationCount()
  const hasUnread = (unreadNotifs ?? 0) > 0

  // Pop the cart badge whenever the cart count grows (added-to-cart feedback).
  const reduced = useReducedMotion()
  const badgeScale = useSharedValue(1)
  const prevCount = useRef(cartCount)
  useEffect(() => {
    if (cartCount > prevCount.current && !reduced) {
      badgeScale.value = withSequence(withSpring(1.45, springs.pop), withSpring(1, springs.press))
    }
    prevCount.current = cartCount
  }, [cartCount, reduced, badgeScale])
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }))

  // Tactile press feedback on the search pill before navigating to the search screen.
  const pillScale = useSharedValue(1)
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ scale: pillScale.value }] }))
  const onPillIn = useCallback(() => {
    pillScale.value = withSpring(0.97, springs.press)
  }, [pillScale])
  const onPillOut = useCallback(() => {
    pillScale.value = withSpring(1, springs.press)
  }, [pillScale])

  const addresses = useAddressStore(s => s.addresses)
  const locationCoords = useAddressStore(s => s.locationCoords)
  const defaultAddress = addresses.find(a => a.isDefault) ?? addresses[0]
  const locationLabel = defaultAddress
    ? [defaultAddress.city, defaultAddress.area].filter(Boolean).join(' · ')
    : locationCoords
      ? t('home.currentLocation')
      : t('home.selectLocation')

  const goSearch = useCallback(() => router.push('/search'), [router])
  const goLocation = useCallback(() => router.push('/location'), [router])
  const goCart = useCallback(() => router.push('/cart'), [router])
  const goWishlist = useCallback(() => router.push('/wishlist'), [router])
  const goNotifications = useCallback(() => router.push('/(tabs)/inbox'), [router])

  const shadowStyle = useAnimatedStyle(() => {
    const scrolled = (scrollY?.value ?? 0) > 8
    return {
      shadowOpacity: withTiming(scrolled ? 0.22 : 0.12, { duration: 160 }),
      shadowRadius: withTiming(scrolled ? 16 : 10, { duration: 160 }),
      elevation: scrolled ? 8 : 4,
    }
  })

  return (
    <Animated.View style={[styles.shadowWrap, shadowStyle]}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradient, { paddingTop: insets.top + spacing[2] }]}
      >
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <TouchableOpacity
              onPress={() => router.dismissAll()}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.wordmark}>{t('common.appName')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goLocation}
              activeOpacity={0.7}
              style={styles.locationRow}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`${t('home.deliveringTo')} ${locationLabel}`}
            >
              <Icon name="location-sharp" size={13} color={colors.gold} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
              <Icon name="chevron-down" size={13} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={goNotifications}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('nav.inbox')}
            >
              <Icon name="notifications-outline" size={23} color={colors.white} />
              {hasUnread && <View style={styles.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goWishlist}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.wishlist')}
            >
              <Icon
                name={wishlistCount > 0 ? 'heart' : 'heart-outline'}
                size={23}
                color={wishlistCount > 0 ? colors.gold : colors.white}
              />
              {wishlistCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goCart}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('nav.cart')}
            >
              <Icon name="cart-outline" size={23} color={colors.white} />
              {cartCount > 0 && (
                <Animated.View style={[styles.cartBadge, badgeStyle]}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <AnimatedTouchable
          onPress={goSearch}
          onPressIn={onPillIn}
          onPressOut={onPillOut}
          activeOpacity={0.95}
          style={[styles.searchPill, pillStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('common.search')}
        >
          <Icon name="search" size={17} color={colors.primary} />
          <Text style={styles.searchText} numberOfLines={1}>
            {t('search.inputPlaceholder')}
          </Text>
        </AnimatedTouchable>
      </LinearGradient>
    </Animated.View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    shadowWrap: {
      zIndex: 30,
      shadowColor: c.plumShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    gradient: {
      paddingHorizontal: spacing[5],
      paddingBottom: spacing[4],
      borderBottomLeftRadius: SURFACE_RADIUS,
      borderBottomRightRadius: SURFACE_RADIUS,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandWrap: {
      flex: 1,
      gap: 3,
    },
    wordmark: {
      fontFamily: 'SpaceGrotesk',
      fontSize: fontSz('xl')[0],
      color: WORDMARK_INK,
      letterSpacing: -0.4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: 230,
    },
    locationText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: fontSz('sm')[0],
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
      flexShrink: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifDot: {
      position: 'absolute',
      top: 7,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: radii.full,
      backgroundColor: c.gold,
      borderWidth: 1.5,
      borderColor: c.plumMid,
    },
    cartBadge: {
      position: 'absolute',
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: radii.full,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.plumMid,
    },
    cartBadgeText: {
      fontFamily: 'Inter-Bold',
      fontSize: fontSz('2xs')[0],
      fontWeight: '700',
      color: c.plumInk,
    },
    searchPill: {
      marginTop: spacing[3],
      height: 46,
      backgroundColor: c.white,
      borderRadius: SURFACE_RADIUS,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2.5],
      paddingHorizontal: spacing[3.5],
      shadowColor: c.plumShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 4,
    },
    searchText: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.textTertiary,
      flex: 1,
    },
  })

export const HomeHeader = memo(HomeHeaderInner)
export default HomeHeader
