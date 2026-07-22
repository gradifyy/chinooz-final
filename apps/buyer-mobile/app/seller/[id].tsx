import React, { useCallback, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors as lightColors, spacing, radii, fontSz, duration } from '@chinooz/theme'
import { useSellerStorefront, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore, useWishlistStore, useRecentlyViewedStore, useUIStore } from '@chinooz/state'
import { ProductCard, ProductCardSkeleton, EmptyState } from '@chinooz/ui'
import Icon, { type IconName } from '../../components/Icon'
import type { Product } from '@chinooz/types'
import { useAppTheme } from '../../components/ThemeProvider'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE = 16
const GAP = 12
const COLUMNS = SCREEN_WIDTH >= 768 ? 3 : 2
const CARD_WIDTH = (SCREEN_WIDTH - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS

interface SellerProfile {
  id: string
  name: string
  productCount: number
  rating: number
  reviewCount: number
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={15} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function StoreHeader({ seller, topInset }: { seller: SellerProfile; topInset: number }) {
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: spacing[3] }}>
      {/* Gradient banner */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: topInset + 96 }}
      />

      {/* Overlapping profile card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarRow}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{seller.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={styles.storeName} numberOfLines={1}>{seller.name}</Text>
              <View style={styles.verified}>
                <Icon name="checkmark" size={10} color={colors.white} />
              </View>
            </View>
            <Text style={styles.verifiedLabel}>{t('storefront.verifiedSeller')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat icon="star" value={seller.rating.toFixed(1)} label={t('storefront.rating')} />
          <View style={styles.statDivider} />
          <Stat icon="cube-outline" value={String(seller.productCount)} label={t('storefront.products')} />
          <View style={styles.statDivider} />
          <Stat icon="chatbubble-ellipses-outline" value={seller.reviewCount.toLocaleString('en-IN')} label={t('storefront.reviews')} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('storefront.allProducts')} · {seller.productCount}</Text>
    </Animated.View>
  )
}

export default function SellerStorefrontScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const { data, isLoading, isError } = useSellerStorefront(id || '')
  const addItem = useCartStore(s => s.addItem)
  const addViewed = useRecentlyViewedStore(s => s.addViewed)
  const prefetchProduct = usePrefetchProduct()
  const wishEntries = useWishlistStore(s => s.entries)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const addToast = useUIStore(s => s.addToast)

  const handlePress = useCallback((p: Product) => {
    addViewed(p.id)
    prefetchProduct(p.id)
    router.push({ pathname: '/product/[id]', params: { id: p.id } })
  }, [router, prefetchProduct, addViewed])

  const handleAddToCart = useCallback((p: Product) => {
    addItem({
      id: `ci-${p.id}`,
      productId: p.id,
      name: p.name,
      image: p.images?.[0]?.uri ?? '',
      price: p.price,
      quantity: 1,
      maxQuantity: 10,
    })
    addToast({ message: t('product.addedToCart'), variant: 'success' })
  }, [addItem, addToast, t])

  const handleToggleWishlist = useCallback((p: Product) => {
    const turningOn = !wishEntries.some(e => e.productId === p.id)
    toggleWishlist(p.id)
    addToast({ message: turningOn ? t('home.savedToWishlist') : t('home.removedFromWishlist'), variant: 'success' })
  }, [wishEntries, toggleWishlist, addToast, t])

  const BackButton = (
    <TouchableOpacity
      onPress={() => router.back()}
      style={[styles.backFab, { top: insets.top + spacing[2] }]}
      accessibilityLabel={t('common.back')}
      activeOpacity={0.8}
    >
      <Icon name="arrow-back" size={20} color={colors.text} />
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: insets.top + 96 }} />
        <View style={[styles.headerCard, { gap: spacing[3] }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]} />
            <View style={{ flex: 1, gap: spacing[2] }}>
              <View style={{ width: '60%', height: 16, borderRadius: radii.sm, backgroundColor: colors.border }} />
              <View style={{ width: '40%', height: 12, borderRadius: radii.sm, backgroundColor: colors.borderLight }} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: EDGE, marginTop: spacing[4] }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: CARD_WIDTH }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
        {BackButton}
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <EmptyState
          icon={<Icon name="storefront-outline" size={48} color={colors.textMuted} />}
          title={t('storefront.errorTitle')}
          subtitle={t('storefront.errorSubtitle')}
          action={{ label: t('common.back'), onPress: () => router.back() }}
        />
        {BackButton}
      </View>
    )
  }

  const { seller, products } = data

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={COLUMNS}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: EDGE, marginBottom: GAP }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        ListHeaderComponent={<StoreHeader seller={seller} topInset={insets.top} />}
        ListEmptyComponent={
          <View style={{ paddingVertical: spacing[10], alignItems: 'center' }}>
            <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted }}>{t('storefront.empty')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(duration.normal)}
            style={{ width: CARD_WIDTH }}
          >
            <ProductCard
              product={item}
              variant="default"
              wishlisted={wishEntries.some(e => e.productId === item.id)}
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              onLongPress={(p) => prefetchProduct(p.id)}
            />
          </Animated.View>
        )}
      />
      {BackButton}
    </View>
  )
}

const makeStyles = (c: typeof lightColors) => StyleSheet.create({
  backFab: {
    position: 'absolute',
    left: EDGE,
    width: 40,
    height: 40,
    borderRadius: radii['2xl'],
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headerCard: {
    marginHorizontal: EDGE,
    marginTop: -44,
    backgroundColor: c.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[4],
    shadowColor: c.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'SpaceGrotesk',
    fontSize: fontSz('2xl')[0],
    color: c.creamInk,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    fontFamily: 'Fraunces',
    fontSize: fontSz('xl')[0],
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verified: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedLabel: {
    fontSize: fontSz('xs')[0],
    color: c.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('base')[0],
    fontWeight: '800',
    color: c.text,
  },
  statLabel: {
    fontSize: fontSz('2xs')[0],
    color: c.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: c.borderLight,
  },
  sectionTitle: {
    fontFamily: 'Fraunces',
    fontSize: fontSz('lg')[0],
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.3,
    paddingHorizontal: EDGE,
    marginTop: spacing[5],
  },
})
