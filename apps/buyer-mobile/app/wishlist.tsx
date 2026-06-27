import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing, duration } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { getProducts } from '@chinooz/mock-data'
import { useWishlistStore, useCartStore, useSessionStore } from '@chinooz/state'
import { SafeImage } from '@chinooz/ui'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import type { Product } from '@chinooz/types'

type SortKey = 'recent' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'recent', labelKey: 'wishlist.recentlyAdded' },
  { key: 'price_asc', labelKey: 'wishlist.priceLowHigh' },
  { key: 'price_desc', labelKey: 'wishlist.priceHighLow' },
]

function WishlistCard({
  product,
  onRemove,
  onAddToCart,
  onPress,
  index,
  reduced,
}: {
  product: Product
  onRemove: () => void
  onAddToCart: () => void
  onPress: () => void
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()
  const heartScale = useSharedValue(1)
  const isOOS = product.stock === 'out_of_stock'
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price
  const imageUri = product.images?.[0]?.uri

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const handleRemove = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 500 }),
      withSpring(0, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setTimeout(onRemove, 200)
  }, [onRemove])

  const handleAddToCart = useCallback(() => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    onAddToCart()
  }, [onAddToCart])

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.delay(Math.min(index, 10) * 50).duration(duration.normal)}
      layout={reduced ? undefined : Layout.springify()}
      exiting={reduced ? undefined : FadeOut.duration(250)}
      style={styles.cardWrap}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[styles.card, isOOS && styles.cardOOS]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatNPR(product.price)}`}
      >
        <View style={styles.imageWrap}>
          <SafeImage
            source={imageUri}
            style={[styles.image, isOOS && styles.imageDimmed]}
            accessibilityLabel={product.name}
          />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)}%
              </Text>
            </View>
          )}
          {isOOS && (
            <View style={styles.oosOverlay}>
              <Text style={styles.oosText}>{t('wishlist.outOfStock')}</Text>
            </View>
          )}
          <Animated.View style={[styles.heartButton, heartStyle]}>
            <TouchableOpacity
              onPress={handleRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('wishlist.removeFromWishlist')}
            >
              <Text style={styles.heartActive}>♥</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatNPR(product.price)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>{formatNPR(product.compareAtPrice!)}</Text>
            )}
          </View>
        </View>

        {!isOOS && (
          <TouchableOpacity
            onPress={handleAddToCart}
            activeOpacity={0.85}
            style={styles.cartButton}
            accessibilityRole="button"
            accessibilityLabel={`${t('wishlist.addToCart')} ${product.name}`}
          >
            <Text style={styles.cartButtonText}>{t('wishlist.addToCart')}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function WishlistScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const entries = useWishlistStore(s => s.entries)
  const removeEntry = useWishlistStore(s => s.remove)
  const addToCart = useCartStore(s => s.addItem)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [showSort, setShowSort] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/phone-entry')
    }
  }, [isLoggedIn])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { items } = await getProducts()
        if (!cancelled) {
          const ids = new Set(entries.map(e => e.productId))
          setProducts(items.filter(p => ids.has(p.id)))
        }
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [entries])

  const sorted = useMemo(() => {
    const list = [...products]
    if (sortKey === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sortKey === 'price_desc') list.sort((a, b) => b.price - a.price)
    else {
      const orderMap = new Map(entries.map((e, i) => [e.productId, i]))
      list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
    }
    return list
  }, [products, sortKey, entries])

  const handleRemove = useCallback((productId: string) => {
    removeEntry(productId)
  }, [removeEntry])

  const handleAddToCart = useCallback((product: Product) => {
    addToCart({
      id: `ci-${product.id}`,
      productId: product.id,
      variantId: product.variants?.[0]?.id,
      name: product.name,
      image: product.images?.[0]?.uri ?? '',
      price: product.price,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [addToCart])

  const renderItem = useCallback(({ item, index }: { item: Product; index: number }) => (
    <WishlistCard
      product={item}
      index={index}
      reduced={reduced}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      onRemove={() => handleRemove(item.id)}
      onAddToCart={() => handleAddToCart(item)}
    />
  ), [router, handleRemove, handleAddToCart, reduced])

  if (!isLoggedIn) return null

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('wishlist.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>{t('wishlist.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('wishlist.emptySubtitle')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
            style={styles.emptyCta}
          >
            <Text style={styles.emptyCtaText}>{t('wishlist.browseProducts')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.count}>
              {t('wishlist.itemsCount', { count: sorted.length })}
            </Text>
            <TouchableOpacity
              onPress={() => setShowSort(!showSort)}
              activeOpacity={0.7}
              style={styles.sortButton}
              accessibilityRole="button"
              accessibilityLabel={t('wishlist.sortBy')}
            >
              <Text style={styles.sortLabel}>{t('wishlist.sortBy')}</Text>
              <Text style={styles.sortChevron}>{showSort ? '▴' : '▾'}</Text>
            </TouchableOpacity>
          </View>

          {showSort && (
            <View style={styles.sortDropdown}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { setSortKey(opt.key); setShowSort(false) }}
                  activeOpacity={0.7}
                  style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
                >
                  <Text style={[styles.sortOptionText, sortKey === opt.key && styles.sortOptionTextActive]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  emptyIcon: { fontSize: 48, color: colors.textTertiary, marginBottom: spacing[2] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    height: 44,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  count: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sortLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  sortChevron: { fontSize: 12, color: colors.primary },
  sortDropdown: {
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortOptionActive: { backgroundColor: colors.primary50 },
  sortOptionText: { fontSize: 14, color: colors.text },
  sortOptionTextActive: { color: colors.primary, fontWeight: '600' },
  gridRow: { gap: spacing[3], paddingHorizontal: spacing[4] },
  gridContent: { paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  cardWrap: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardOOS: { opacity: 0.6 },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 1 },
  image: { width: '100%', height: '100%', backgroundColor: colors.shimmer },
  imageDimmed: { opacity: 0.5 },
  discountBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
  },
  discountText: { fontSize: 11, fontWeight: '700', color: colors.white },
  oosOverlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: colors.textMuted,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  oosText: { fontSize: 12, fontWeight: '600', color: colors.white },
  heartButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartActive: { fontSize: 18, color: colors.error },
  body: { padding: spacing[3], gap: spacing[1] },
  title: { fontSize: 13, fontWeight: '500', color: colors.text, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[1.5] },
  price: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  comparePrice: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'line-through' },
  cartButton: {
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartButtonText: { fontSize: 13, fontWeight: '600', color: colors.primary },
})
