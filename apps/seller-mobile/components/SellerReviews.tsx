import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  TextInput,
  Dimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Send,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import {
  useSellerReviews,
  useSellerProducts,
  useRespondToSellerReview,
  useToggleSellerReviewFlag,
} from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import type {
  SellerReviewFilter,
  SellerReviewSort,
  SellerReviewStatus,
  SellerReviewResponseFilter,
} from '@chinooz/mock-data'
import { ReviewCard, ReviewCardSkeleton } from '@chinooz/ui'
import BottomSheet from '@chinooz/ui/BottomSheet'
import EmptyState from '@chinooz/ui/EmptyState'

type RatingFilter = number | 'all'
const STARS = [5, 4, 3, 2, 1] as const

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export default function SellerReviews() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()

  const [status, setStatus] = useState<SellerReviewStatus>('all')
  const [rating, setRating] = useState<RatingFilter>('all')
  const [hasResponse, setHasResponse] = useState<SellerReviewResponseFilter>('all')
  const [hasPhotos, setHasPhotos] = useState(false)
  const [productId, setProductId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<SellerReviewSort>('newest')
  const [sortSheet, setSortSheet] = useState(false)
  const [productSheet, setProductSheet] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeReviewId, setComposeReviewId] = useState<string | null>(null)
  const [composeDraft, setComposeDraft] = useState('')
  const barAnims = useRef<Animated.Value[]>(STARS.map(() => new Animated.Value(0)))

  useEffect(() => {
    analytics.screen({ name: 'seller-reviews' })
  }, [])

  // Distribution bars fill on load (SV6).
  useEffect(() => {
    barAnims.current.forEach(a => a.setValue(0))
    if (reducedMotion) {
      barAnims.current.forEach(a => a.setValue(1))
      return
    }
    Animated.stagger(
      80,
      barAnims.current.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
      ),
    ).start()
  }, [reducedMotion])

  const filter: SellerReviewFilter = useMemo(
    () => ({ status, rating, hasResponse, hasPhotos, productId, sort }),
    [status, rating, hasResponse, hasPhotos, productId, sort],
  )

  const { data, isLoading, refetch } = useSellerReviews(filter)
  const { data: productsData } = useSellerProducts({ status: 'all', sort: 'best_selling' })
  const respond = useRespondToSellerReview()
  const toggleFlag = useToggleSellerReviewFlag()

  const summary = data?.summary
  const counts = data?.counts
  const items = data?.items ?? []
  const productOptions = productsData?.items ?? []

  const average = summary?.average ?? 0
  const totalReviews = summary?.total ?? 0
  const distribution = summary?.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const trendPct = summary?.trendPct ?? 0
  const trendUp = trendPct > 0
  const trendDown = trendPct < 0

  const sortOptions: { key: SellerReviewSort; label: string }[] = [
    { key: 'newest', label: t('seller.reviews.sortNewest') },
    { key: 'oldest', label: t('seller.reviews.sortOldest') },
    { key: 'lowest', label: t('seller.reviews.sortLowest') },
    { key: 'highest', label: t('seller.reviews.sortHighest') },
  ]
  const activeSortLabel = sortOptions.find(s => s.key === sort)?.label ?? sortOptions[0].label

  const tabs: { key: SellerReviewStatus; label: string; count: number; warning?: boolean }[] = [
    { key: 'all', label: t('seller.reviews.tabAll'), count: counts?.all ?? 0 },
    { key: 'needs_response', label: t('seller.reviews.tabNeedsResponse'), count: counts?.needs_response ?? 0, warning: true },
    { key: 'responded', label: t('seller.reviews.tabResponded'), count: counts?.responded ?? 0 },
    { key: 'flagged', label: t('seller.reviews.tabFlagged'), count: counts?.flagged ?? 0 },
  ]

  const ratingChips: { key: RatingFilter; label: string }[] = [
    { key: 'all', label: t('seller.reviews.filterRatingAll') },
    { key: 5, label: '5 ★' },
    { key: 4, label: '4 ★' },
    { key: 3, label: '3 ★' },
    { key: 2, label: '2 ★' },
    { key: 1, label: '1 ★' },
  ]
  const responseChips: { key: SellerReviewResponseFilter; label: string }[] = [
    { key: 'all', label: t('seller.reviews.filterResponseAll') },
    { key: 'with', label: t('seller.reviews.filterResponseWith') },
    { key: 'without', label: t('seller.reviews.filterResponseWithout') },
  ]

  const hasActiveFilters =
    rating !== 'all' || hasResponse !== 'all' || hasPhotos || !!productId || status !== 'all'

  const clearAll = () => {
    setRating('all')
    setHasResponse('all')
    setHasPhotos(false)
    setProductId(undefined)
    setStatus('all')
  }

  const openCompose = (reviewId: string) => {
    setComposeReviewId(reviewId)
    setComposeDraft('')
    setComposeOpen(true)
  }

  const closeCompose = () => {
    setComposeOpen(false)
    setComposeReviewId(null)
    setComposeDraft('')
  }

  const submitResponse = () => {
    if (!composeReviewId || !composeDraft.trim()) return
    respond.mutate(
      { reviewId: composeReviewId, text: composeDraft.trim() },
      { onSuccess: closeCompose },
    )
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }, [refetch])

  const selectedProductName =
    productOptions.find(p => p.id === productId)?.name ?? t('seller.reviews.filterProductAll')

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.reviews.back')}
          onPress={() => router.push('/dashboard')}
          hitSlop={8}
          style={[styles.topBarIconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.topBarTitleText}>
            {t('seller.reviews.title')}
          </Text>
          <Text numberOfLines={1} style={styles.topBarSubtitle}>
            {t('seller.reviews.subtitle')}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.reviews.refreshAria')}
          onPress={() => refetch()}
          hitSlop={8}
          style={[styles.topBarIconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <RefreshCw size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            accessibilityLabel={t('seller.reviews.refreshAria')}
          />
        }
      >
        {/* Summary card (e1) */}
        <View
          accessibilityLabel={t('seller.reviews.summaryAria', {
            average: average.toFixed(1),
            total: totalReviews,
          })}
          style={styles.summaryCard}
        >
          <View style={styles.summaryTop}>
            <View style={styles.summaryLeft}>
              <Text
                style={styles.averageText}
                accessibilityLabel={t('seller.reviews.averageLabel')}
              >
                {average.toFixed(1)}
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={16}
                    color={s <= Math.round(average) ? colors.gold : colors.border}
                    fill={s <= Math.round(average) ? colors.gold : 'none'}
                  />
                ))}
              </View>
              <Text style={styles.totalReviewsText}>
                {totalReviews.toLocaleString()} {t('seller.reviews.totalReviews')}
              </Text>
            </View>

            <View style={styles.trendCol}>
              <Text
                style={[
                  styles.trendValue,
                  { color: trendUp ? colors.success : trendDown ? colors.error : colors.textMuted },
                ]}
              >
                {trendUp ? `↑ ${trendPct}%` : trendDown ? `↓ ${Math.abs(trendPct)}%` : '—'}
              </Text>
              <Text style={styles.trendLabel}>{t('seller.reviews.trend')}</Text>
            </View>
          </View>

          {/* Distribution */}
          <View
            accessibilityLabel={t('seller.reviews.distributionAria')}
            style={styles.distribution}
          >
            {STARS.map((stars, idx) => {
              const count = distribution[stars]
              const p = pct(count, totalReviews)
              return (
                <View
                  key={stars}
                  style={styles.distRow}
                  accessibilityLabel={t('seller.reviews.rowAria', { stars, count, pct: p })}
                >
                  <Text style={styles.distStar}>{stars}</Text>
                  <View style={styles.distTrack}>
                    <Animated.View
                      style={[
                        styles.distFill,
                        {
                          width: barAnims.current[idx].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', `${p}%`],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                  <Text style={styles.distPct}>{p}%</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Filter / sort bar */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {ratingChips.map(c => (
              <FilterChip
                key={String(c.key)}
                label={c.label}
                pressed={rating === c.key}
                onPress={() => setRating(c.key)}
              />
            ))}
            <View style={styles.chipDivider} />
            {responseChips.map(c => (
              <FilterChip
                key={c.key}
                label={c.label}
                pressed={hasResponse === c.key}
                onPress={() => setHasResponse(c.key)}
              />
            ))}
            <View style={styles.chipDivider} />
            <FilterChip
              label={t('seller.reviews.filterPhotos')}
              pressed={hasPhotos}
              onPress={() => setHasPhotos(v => !v)}
              icon={<ImageIcon size={14} color={hasPhotos ? colors.white : colors.text} />}
            />
          </ScrollView>

          <View style={styles.dropdownRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('seller.reviews.filterProduct')}
              onPress={() => setProductSheet(true)}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownLabel} numberOfLines={1}>
                {selectedProductName}
              </Text>
              <ChevronDown size={15} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('seller.reviews.sortAria')}
              onPress={() => setSortSheet(true)}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownLabel} numberOfLines={1}>
                {activeSortLabel}
              </Text>
              <ChevronDown size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity onPress={clearAll} hitSlop={8} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>{t('seller.products.clearAll')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status tabs (segment control) */}
        <View
          accessibilityRole="tablist"
          accessibilityLabel={t('seller.reviews.title')}
          style={styles.tabsTrack}
        >
          {tabs.map(tab => {
            const isActive = tab.key === status
            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => setStatus(tab.key)}
                style={[styles.tabSegment, isActive && styles.tabSegmentActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    isActive
                      ? tab.warning && tab.count > 0
                        ? { backgroundColor: colors.warning }
                        : { backgroundColor: 'rgba(255,255,255,0.25)' }
                      : tab.warning && tab.count > 0
                        ? { backgroundColor: colors.warningLight }
                        : { backgroundColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      {
                        color: isActive
                          ? colors.white
                          : tab.warning && tab.count > 0
                            ? '#92400E'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.resultCount}>
          {t('seller.reviews.count', { count: data?.total ?? 0 })}
        </Text>

        {/* List slot (SV2) */}
        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.skeletonWrap}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ReviewCardSkeleton key={i} />
              ))}
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={40} color={colors.textTertiary} />}
              title={hasActiveFilters ? t('seller.reviews.noFilteredTitle') : t('seller.reviews.noReviewsTitle')}
              subtitle={hasActiveFilters ? t('seller.reviews.noFilteredSubtitle') : t('seller.reviews.noReviewsSubtitle')}
              action={
                hasActiveFilters
                  ? { label: t('seller.products.clearAll'), onPress: clearAll }
                  : undefined
              }
            />
          ) : (
            items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                responding={composeReviewId === review.id && respond.isPending}
                onRespond={() => openCompose(review.id)}
                onFlag={() => toggleFlag.mutate(review.id)}
                onContactBuyer={() => router.push('/messages')}
              />
            ))
          )}
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Sort sheet */}
      <BottomSheet visible={sortSheet} onClose={() => setSortSheet(false)} title={t('seller.reviews.sort')}>
        {sortOptions.map(opt => {
          const active = sort === opt.key
          return (
            <TouchableOpacity
              key={opt.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSort(opt.key)
                setSortSheet(false)
              }}
              style={styles.sheetRow}
            >
              <Text style={[styles.sheetRowLabel, active && styles.sheetRowLabelActive]}>
                {opt.label}
              </Text>
              {active && <CheckCircle2 size={18} color={colors.primary} />}
            </TouchableOpacity>
          )
        })}
      </BottomSheet>

      {/* Product sheet */}
      <BottomSheet visible={productSheet} onClose={() => setProductSheet(false)} title={t('seller.reviews.filterProduct')}>
        <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.6 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: !productId }}
            onPress={() => {
              setProductId(undefined)
              setProductSheet(false)
            }}
            style={styles.sheetRow}
          >
            <Text style={[styles.sheetRowLabel, !productId && styles.sheetRowLabelActive]}>
              {t('seller.reviews.filterProductAll')}
            </Text>
            {!productId && <CheckCircle2 size={18} color={colors.primary} />}
          </TouchableOpacity>
          {productOptions.map(p => {
            const active = productId === p.id
            return (
              <TouchableOpacity
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setProductId(p.id)
                  setProductSheet(false)
                }}
                style={styles.sheetRow}
              >
                <Text style={[styles.sheetRowLabel, active && styles.sheetRowLabelActive]} numberOfLines={1}>
                  {p.name}
                </Text>
                {active && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </BottomSheet>

      {/* Compose response sheet */}
      <BottomSheet visible={composeOpen} onClose={closeCompose} title={t('seller.reviews.respond')}>
        <TextInput
          value={composeDraft}
          onChangeText={setComposeDraft}
          placeholder={t('seller.reviews.responsePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={composeStyles.input}
          accessibilityLabel={t('seller.reviews.responsePlaceholder')}
        />
        <View style={composeStyles.actions}>
          <TouchableOpacity onPress={closeCompose} style={composeStyles.cancelBtn}>
            <Text style={composeStyles.cancelText}>{t('seller.reviews.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={submitResponse}
            disabled={!composeDraft.trim() || respond.isPending}
            style={[composeStyles.sendBtn, (!composeDraft.trim() || respond.isPending) && composeStyles.sendBtnDisabled]}
          >
            <Send size={14} color={colors.white} />
            <Text style={composeStyles.sendText}>
              {respond.isPending ? t('seller.reviews.responding') : t('seller.reviews.responseSend')}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  )
}

function FilterChip({
  label,
  pressed,
  onPress,
  icon,
}: {
  label: string
  pressed: boolean
  onPress: () => void
  icon?: React.ReactNode
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: pressed }}
      onPress={onPress}
      style={[styles.chip, pressed && styles.chipActive]}
      activeOpacity={0.8}
    >
      {icon}
      <Text style={[styles.chipText, pressed && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const composeStyles = StyleSheet.create({
  input: {
    minHeight: 80,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  cancelBtn: {
    paddingHorizontal: spacing[3],
    height: 36,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 36,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  topBarTitle: { flex: 1, gap: 1 },
  topBarTitleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  topBarSubtitle: { fontSize: 12, color: colors.textMuted },
  scrollContent: { padding: spacing[4], gap: spacing[4] },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[4],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLeft: { gap: 4 },
  averageText: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  starRow: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  totalReviewsText: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  trendCol: { alignItems: 'flex-end', gap: 2 },
  trendValue: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  trendLabel: { fontSize: 12, fontWeight: '400', color: colors.textMuted },

  distribution: { gap: spacing[1.5] },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  distStar: { width: 16, fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  distTrack: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: radii.full, overflow: 'hidden' },
  distFill: { height: 8, backgroundColor: colors.gold, borderRadius: radii.full },
  distCount: { width: 36, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  distPct: { width: 34, fontSize: 12, fontWeight: '400', color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },

  // Filters
  filterSection: { gap: spacing[2] },
  chipRow: { gap: spacing[2], paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  chipTextActive: { color: colors.white },
  chipDivider: { width: 1, height: 24, backgroundColor: colors.borderLight, marginHorizontal: spacing[1], alignSelf: 'center' },

  dropdownRow: { flexDirection: 'row', gap: spacing[2] },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  dropdownLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text },
  clearAllBtn: { alignSelf: 'flex-start', paddingVertical: spacing[1] },
  clearAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Tabs
  tabsTrack: {
    flexDirection: 'row',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    height: 40,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    height: 32,
    borderRadius: radii.full,
  },
  tabSegmentActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  tabBadge: {
    minWidth: 18,
    paddingHorizontal: spacing[1],
    height: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 11, fontWeight: '600' },

  resultCount: { fontSize: 13, color: colors.textMuted, marginTop: -spacing[1] },

  // List
  list: { gap: spacing[3] },

  // Review card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  cardNeedsResponse: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  cardFlagged: { borderLeftWidth: 3, borderLeftColor: colors.error },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  cardHeadBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  cardTime: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  productThumb: { width: 22, height: 22, borderRadius: radii.sm, backgroundColor: colors.borderLight },
  productName: { flex: 1, fontSize: 12, color: colors.textSecondary },

  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  photosRow: { flexDirection: 'row', gap: spacing[2] },
  photo: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.borderLight },

  responseBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    gap: 2,
  },
  responseLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  responseText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 32,
  },
  respondBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagBtnActive: { backgroundColor: colors.errorLight, borderColor: colors.errorLight },
  flagBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  flagBtnTextActive: { color: colors.error },
  helpfulText: { fontSize: 12, color: colors.textTertiary, marginLeft: 'auto' },

  composeBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    gap: spacing[2],
  },
  composeInput: {
    minHeight: 72,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    padding: 0,
  },
  composeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  composeCancel: { paddingHorizontal: spacing[2], height: 32, justifyContent: 'center' },
  composeCancelText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  composeSend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 32,
  },
  composeSendDisabled: { opacity: 0.5 },
  composeSendText: { fontSize: 13, fontWeight: '600', color: colors.white },

  // Sheets
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetRowLabel: { fontSize: 15, color: colors.text },
  sheetRowLabelActive: { color: colors.primary, fontWeight: '600' },

  // Skeleton
  skeletonWrap: { gap: spacing[3] },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.shimmer },
  skeletonBody: { flex: 1, gap: 6 },
  skeletonLineW30: { height: 12, width: '30%', borderRadius: 6, backgroundColor: colors.shimmer },
  skeletonLineW50: { height: 10, width: '50%', borderRadius: 6, backgroundColor: colors.shimmer },
  skeletonLineW60: { height: 10, width: '60%', borderRadius: 6, backgroundColor: colors.shimmer },
})
