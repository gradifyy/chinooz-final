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
  AlertTriangle,
  Flag,
  ChevronDown,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, duration, easing } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import {
  useSellerReviews,
  useSellerProducts,
  useRespondToSellerReview,
  useEditSellerReviewResponse,
  useDeleteSellerReviewResponse,
  useToggleSellerReviewFlag,
  useFlagSellerReview,
  useUnflagSellerReview,
  useBulkUpdateSellerReviews,
} from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import { reviewResponseSchema } from '@chinooz/validation'
import { REVIEW_RESPONSE_TEMPLATES } from '@chinooz/mock-data'
import type {
  SellerReviewFilter,
  SellerReviewSort,
  SellerReviewStatus,
  SellerReviewResponseFilter,
} from '@chinooz/mock-data'
import type { ReviewFlagReason } from '@chinooz/types'
import { useNetInfo } from '@react-native-community/netinfo'
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
  const [composeMode, setComposeMode] = useState<'create' | 'edit'>('create')
  const [composeError, setComposeError] = useState<string | null>(null)
  const [composeSuccess, setComposeSuccess] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)
  const [flagSheetOpen, setFlagSheetOpen] = useState(false)
  const [flagReviewId, setFlagReviewId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState<ReviewFlagReason | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBarAnim] = useState(new Animated.Value(0))
  const netInfo = useNetInfo()
  const isOffline = netInfo.isConnected === false || (netInfo.isInternetReachable === false)
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
      60,
      barAnims.current.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: duration.slower,
          easing: undefined,
          useNativeDriver: false,
        }),
      ),
    ).start()
  }, [reducedMotion])

  const filter: SellerReviewFilter = useMemo(
    () => ({ status, rating, hasResponse, hasPhotos, productId, sort }),
    [status, rating, hasResponse, hasPhotos, productId, sort],
  )

  const { data, isLoading, isError, refetch } = useSellerReviews(filter)
  const { data: productsData } = useSellerProducts({ status: 'all', sort: 'best_selling' })
  const respond = useRespondToSellerReview()
  const editResponse = useEditSellerReviewResponse()
  const deleteResponse = useDeleteSellerReviewResponse()
  const toggleFlag = useToggleSellerReviewFlag()
  const flagReview = useFlagSellerReview()
  const unflagReview = useUnflagSellerReview()
  const bulkUpdate = useBulkUpdateSellerReviews()

  const activeMutation = composeMode === 'edit' ? editResponse : respond

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
    setComposeMode('create')
    setComposeError(null)
    setComposeSuccess(false)
    setComposeOpen(true)
  }

  const openEdit = (reviewId: string) => {
    const review = items.find(r => r.id === reviewId)
    setComposeReviewId(reviewId)
    setComposeDraft(review?.response?.text ?? '')
    setComposeMode('edit')
    setComposeError(null)
    setComposeSuccess(false)
    setComposeOpen(true)
  }

  const closeCompose = () => {
    setComposeOpen(false)
    setComposeReviewId(null)
    setComposeDraft('')
    setComposeError(null)
  }

  const submitResponse = () => {
    if (!composeReviewId) return
    const trimmed = composeDraft.trim()
    const result = reviewResponseSchema.safeParse({ text: trimmed })
    if (!result.success) {
      setComposeError(result.error.errors[0]?.message ?? 'Validation error')
      return
    }
    setComposeError(null)
    const mutation = composeMode === 'edit' ? editResponse : respond
    mutation.mutate(
      { reviewId: composeReviewId, text: trimmed },
      {
        onSuccess: () => {
          if (!reducedMotion) {
            setComposeSuccess(true)
            setTimeout(() => closeCompose(), 1200)
          } else {
            closeCompose()
          }
        },
        onError: () => {
          setComposeError(t('seller.reviews.responseError'))
        },
      },
    )
  }

  const openDeleteConfirm = (reviewId: string) => {
    setDeleteReviewId(reviewId)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteReviewId) return
    deleteResponse.mutate(deleteReviewId, {
      onSuccess: () => {
        setDeleteConfirmOpen(false)
        setDeleteReviewId(null)
      },
    })
  }

  // Flag flow
  const openFlagSheet = (reviewId: string) => {
    setFlagReviewId(reviewId)
    setFlagReason(null)
    setFlagSheetOpen(true)
  }

  const submitFlag = () => {
    if (!flagReviewId || !flagReason) return
    flagReview.mutate(
      { reviewId: flagReviewId, reason: flagReason },
      { onSuccess: () => {
        setFlagSheetOpen(false)
        setFlagReviewId(null)
        setFlagReason(null)
      } },
    )
  }

  const handleUnflag = (reviewId: string) => {
    unflagReview.mutate(reviewId)
  }

  // Bulk selection
  const toggleSelectMode = () => {
    setSelectMode(v => !v)
    setSelectedIds(new Set())
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(items.map(r => r.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const bulkMarkRespondedNotNeeded = () => {
    if (selectedIds.size === 0) return
    bulkUpdate.mutate(
      { reviewIds: [...selectedIds], action: 'mark_responded_not_needed' },
      { onSuccess: () => {
        setSelectMode(false)
        setSelectedIds(new Set())
      } },
    )
  }

  const bulkFlag = () => {
    if (selectedIds.size === 0) return
    bulkUpdate.mutate(
      { reviewIds: [...selectedIds], action: 'flag', reason: 'spam' },
      { onSuccess: () => {
        setSelectMode(false)
        setSelectedIds(new Set())
      } },
    )
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }, [refetch])

  // Bulk bar slide-up animation
  useEffect(() => {
    Animated.timing(bulkBarAnim, {
      toValue: selectMode && selectedIds.size > 0 ? 1 : 0,
      duration: reducedMotion ? 0 : duration.normal,
      useNativeDriver: true,
    }).start()
  }, [selectMode, selectedIds.size, reducedMotion, bulkBarAnim])

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
        {isLoading ? (
          <SummarySkeleton />
        ) : (
        <View
          accessibilityLabel={t('seller.reviews.summaryAria', {
            average: average.toFixed(1),
            total: totalReviews,
          })}
          style={styles.summaryCard}
        >
          <View style={styles.summaryTop}>
            <View style={styles.summaryLeft}>
              <CountUpText
                value={average}
                display={(v) => v.toFixed(1)}
                dur={duration.slow}
                reduced={reducedMotion}
                style={styles.averageText}
                accessibilityLabel={t('seller.reviews.averageLabel')}
              />
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

        )}

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

        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {t('seller.reviews.count', { count: data?.total ?? 0 })}
          </Text>
          {items.length > 0 && (
            <TouchableOpacity
              onPress={toggleSelectMode}
              accessibilityRole="button"
              accessibilityLabel={selectMode ? t('seller.reviews.exitSelectMode') : t('seller.reviews.selectModeAria')}
              hitSlop={8}
            >
              <Text style={[styles.selectModeBtn, selectMode && { color: colors.primary }]}>
                {selectMode ? t('seller.reviews.bulkDone') : t('seller.reviews.selectMode')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Select-all (visible in select mode) */}
        {selectMode && items.length > 0 && (
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              onPress={selectedIds.size === items.length && selectedIds.size > 0 ? deselectAll : selectAll}
              accessibilityRole="button"
              accessibilityLabel={t('seller.reviews.bulkSelectAllAria', { count: items.length })}
              hitSlop={8}
            >
              <Text style={styles.selectAllText}>
                {selectedIds.size === items.length && selectedIds.size > 0
                  ? t('seller.reviews.bulkDeselectAll')
                  : t('seller.reviews.bulkSelectAll')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCountText}>
              {t('seller.reviews.bulkSelected', { count: selectedIds.size })}
            </Text>
          </View>
        )}

        {/* Offline banner */}
        {isOffline && !isLoading && !isError && items.length > 0 && (
          <View accessibilityRole="alert" accessibilityLabel={t('seller.reviews.offlineAria')} style={offlineStyles.banner}>
            <View style={offlineStyles.dot} />
            <Text style={offlineStyles.text}>{t('seller.reviews.offlineSubtitle')}</Text>
          </View>
        )}

        {/* List slot (SV2) */}
        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.skeletonWrap}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ReviewCardSkeleton key={i} />
              ))}
            </View>
          ) : items.length === 0 ? (
            <ReviewsEmptyState
              status={status}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAll}
            />
          ) : (
            items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                responding={composeReviewId === review.id && activeMutation.isPending}
                onRespond={() => openCompose(review.id)}
                onEditResponse={() => openEdit(review.id)}
                onDeleteResponse={() => openDeleteConfirm(review.id)}
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

      {/* Compose / edit response sheet */}
      <BottomSheet
        visible={composeOpen}
        onClose={closeCompose}
        title={composeMode === 'edit' ? t('reviewCard.editResponse') : t('seller.reviews.respond')}
      >
        {/* Tone hint for low ratings */}
        {composeReviewId && (items.find(r => r.id === composeReviewId)?.rating ?? 5) <= 2 && (
          <View style={composeStyles.toneHint}>
            <Text style={composeStyles.toneHintText}>{t('seller.reviews.responseToneHint')}</Text>
          </View>
        )}

        {/* Templates */}
        <Text style={composeStyles.templatesLabel}>{t('seller.reviews.responseTemplates')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={composeStyles.templatesRow}>
          {REVIEW_RESPONSE_TEMPLATES.map(tpl => (
            <TouchableOpacity
              key={tpl.id}
              onPress={() => setComposeDraft(tpl.body)}
              style={composeStyles.templateChip}
              accessibilityLabel={`${t('seller.reviews.responseTemplatesAria')}: ${t(tpl.labelKey)}`}
            >
              <Text style={composeStyles.templateChipText}>{t(tpl.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Textarea */}
        <TextInput
          value={composeDraft}
          onChangeText={(text) => setComposeDraft(text.slice(0, 1000))}
          placeholder={t('seller.reviews.responsePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={composeStyles.input}
          accessibilityLabel={t('seller.reviews.responsePlaceholder')}
        />

        {/* Character counter */}
        <View style={composeStyles.counterRow} accessibilityRole="text">
          <Text style={[composeStyles.counterText, composeDraft.length > 900 && { color: colors.warning }]}>
            {t('seller.reviews.responseCounter', { count: composeDraft.length, max: 1000 })}
          </Text>
        </View>

        {/* Error */}
        {composeError && (
          <Text style={composeStyles.errorText} accessibilityRole="alert">{composeError}</Text>
        )}

        {/* Success state */}
        {composeSuccess && !reducedMotion && (
          <View style={composeStyles.successBox} accessibilityLiveRegion="polite">
            <CheckCircle2 size={20} color={colors.success} />
            <Text style={composeStyles.successText}>
              {composeMode === 'edit' ? t('seller.reviews.responseUpdated') : t('seller.reviews.responsePosted')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={composeStyles.actions}>
          <TouchableOpacity onPress={closeCompose} style={composeStyles.cancelBtn}>
            <Text style={composeStyles.cancelText}>{t('seller.reviews.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={submitResponse}
            disabled={!composeDraft.trim() || activeMutation.isPending || composeSuccess}
            style={[
              composeStyles.sendBtn,
              (!composeDraft.trim() || activeMutation.isPending || composeSuccess) && composeStyles.sendBtnDisabled,
            ]}
          >
            {composeSuccess ? (
              <CheckCircle2 size={14} color={colors.white} />
            ) : (
              <Send size={14} color={colors.white} />
            )}
            <Text style={composeStyles.sendText}>
              {composeSuccess
                ? (composeMode === 'edit' ? t('seller.reviews.responseUpdated') : t('seller.reviews.responsePosted'))
                : composeMode === 'edit'
                  ? (activeMutation.isPending ? t('seller.reviews.responseEditing') : t('seller.reviews.responseEdit'))
                  : (activeMutation.isPending ? t('seller.reviews.responding') : t('seller.reviews.responseSend'))}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Delete confirm sheet */}
      <BottomSheet
        visible={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteReviewId(null) }}
        title={t('seller.reviews.responseDeleteConfirmTitle')}
      >
        <Text style={deleteStyles.confirmText}>{t('seller.reviews.responseDeleteConfirm')}</Text>
        <View style={deleteStyles.actions}>
          <TouchableOpacity
            onPress={() => { setDeleteConfirmOpen(false); setDeleteReviewId(null) }}
            style={deleteStyles.cancelBtn}
          >
            <Text style={deleteStyles.cancelText}>{t('seller.reviews.responseDeleteConfirmCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmDelete}
            disabled={deleteResponse.isPending}
            style={[deleteStyles.deleteBtn, deleteResponse.isPending && deleteStyles.deleteBtnDisabled]}
          >
            <Text style={deleteStyles.deleteText}>{t('seller.reviews.responseDeleteConfirmAction')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Flag reason sheet */}
      <BottomSheet
        visible={flagSheetOpen}
        onClose={() => { setFlagSheetOpen(false); setFlagReviewId(null); setFlagReason(null) }}
        title={t('seller.reviews.flagTitle')}
      >
        <Text style={flagStyles.subtitle}>{t('seller.reviews.flagSubtitle')}</Text>
        {([
          { key: 'spam' as const, label: t('seller.reviews.flagReasonSpam') },
          { key: 'abusive' as const, label: t('seller.reviews.flagReasonAbusive') },
          { key: 'fake' as const, label: t('seller.reviews.flagReasonFake') },
          { key: 'off_topic' as const, label: t('seller.reviews.flagReasonOffTopic') },
        ]).map(r => (
          <TouchableOpacity
            key={r.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: flagReason === r.key }}
            accessibilityLabel={t('seller.reviews.flagReasonAria', { reason: r.label })}
            onPress={() => setFlagReason(r.key)}
            style={[flagStyles.reasonRow, flagReason === r.key && flagStyles.reasonRowActive]}
            activeOpacity={0.85}
          >
            <View style={[flagStyles.radio, flagReason === r.key && flagStyles.radioActive]}>
              {flagReason === r.key && <View style={flagStyles.radioDot} />}
            </View>
            <Text style={[flagStyles.reasonLabel, flagReason === r.key && flagStyles.reasonLabelActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={flagStyles.actions}>
          <TouchableOpacity
            onPress={() => { setFlagSheetOpen(false); setFlagReviewId(null); setFlagReason(null) }}
            style={flagStyles.cancelBtn}
          >
            <Text style={flagStyles.cancelText}>{t('seller.reviews.responseDeleteConfirmCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={submitFlag}
            disabled={!flagReason || flagReview.isPending}
            style={[flagStyles.submitBtn, (!flagReason || flagReview.isPending) && flagStyles.submitBtnDisabled]}
          >
            <Text style={flagStyles.submitText}>
              {flagReview.isPending ? t('seller.reviews.flagSubmitting') : t('seller.reviews.flagSubmit')}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Bulk action bar (slide up) */}
      {selectMode && selectedIds.size > 0 && (
        <Animated.View
          style={[
            bulkBarStyles.container,
            {
              transform: [{
                translateY: bulkBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              }],
            },
          ]}
          accessibilityRole="toolbar"
          accessibilityLabel={t('seller.reviews.bulkBarLabel')}
        >
          <Text style={bulkBarStyles.selectedCount}>
            {t('seller.reviews.bulkSelected', { count: selectedIds.size })}
          </Text>
          <View style={bulkBarStyles.actions}>
            <TouchableOpacity
              onPress={bulkMarkRespondedNotNeeded}
              disabled={bulkUpdate.isPending}
              style={bulkBarStyles.notNeededBtn}
            >
              <Text style={bulkBarStyles.notNeededText}>{t('seller.reviews.bulkMarkRespondedNotNeeded')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={bulkFlag}
              disabled={bulkUpdate.isPending}
              style={bulkBarStyles.flagBtn}
            >
              <Text style={bulkBarStyles.flagText}>{t('seller.reviews.bulkFlag')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSelectMode(false); setSelectedIds(new Set()) }}
              style={bulkBarStyles.doneBtn}
            >
              <Text style={bulkBarStyles.doneText}>{t('seller.reviews.bulkDone')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

function CountUpText({ value, display, dur, reduced, style, accessibilityLabel }: { value: number; display: (v: number) => string; dur: number; reduced: boolean; style?: any; accessibilityLabel?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<any>(null)

  useEffect(() => {
    if (reduced) {
      setDisplayed(value)
      return
    }
    const start = Date.now()
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(value * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, dur, reduced])

  return <Text style={style} accessibilityLabel={accessibilityLabel}>{display(displayed)}</Text>
}

function SummarySkeleton() {
  return (
    <View accessibilityState={{ busy: true }} accessibilityLabel="Loading review summary" style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryLeft}>
          <View style={skeletonStyles.bigNum} />
          <View style={skeletonStyles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (<View key={i} style={skeletonStyles.starDot} />))}
          </View>
          <View style={skeletonStyles.smallLine} />
        </View>
        <View style={styles.trendCol}>
          <View style={skeletonStyles.smallLine} />
          <View style={skeletonStyles.smallLine} />
        </View>
      </View>
      <View style={styles.distribution}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.distRow}>
            <View style={skeletonStyles.tinySquare} />
            <View style={skeletonStyles.barTrack} />
            <View style={skeletonStyles.tinyRect} />
            <View style={skeletonStyles.tinyRect} />
          </View>
        ))}
      </View>
    </View>
  )
}

function ErrorState({ title, subtitle, retryLabel, onRetry }: { title: string; subtitle: string; retryLabel: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <View accessibilityRole="alert" style={errorStyles.container}>
      <View style={errorStyles.iconWrap}><AlertTriangle size={24} color={colors.error} /></View>
      <Text style={errorStyles.title}>{title}</Text>
      <Text style={errorStyles.subtitle}>{subtitle}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('seller.reviews.errorRetryAria')} style={errorStyles.retryBtn} activeOpacity={0.85}>
        <RefreshCw size={15} color={colors.primary} />
        <Text style={errorStyles.retryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

function ReviewsEmptyState({ status, hasActiveFilters, onClearFilters }: { status: SellerReviewStatus; hasActiveFilters: boolean; onClearFilters: () => void }) {
  const { t } = useTranslation()
  if (hasActiveFilters) {
    return (<EmptyState icon={<MessageSquare size={40} color={colors.textTertiary} />} title={t('seller.reviews.noResultsTitle')} subtitle={t('seller.reviews.noResultsSubtitle')} action={{ label: t('seller.reviews.noResultsClearFilters'), onPress: onClearFilters }} />)
  }
  if (status === 'needs_response') {
    return (<EmptyState icon={<CheckCircle2 size={40} color={colors.success} />} title={t('seller.reviews.allCaughtUpTitle')} subtitle={t('seller.reviews.allCaughtUpSubtitle')} />)
  }
  if (status === 'responded') {
    return (<EmptyState icon={<CheckCircle2 size={40} color={colors.success} />} title={t('seller.reviews.allCaughtUpRespondedTitle')} subtitle={t('seller.reviews.allCaughtUpRespondedSubtitle')} />)
  }
  if (status === 'flagged') {
    return (<EmptyState icon={<Flag size={40} color={colors.textTertiary} />} title={t('seller.reviews.allCaughtUpFlaggedTitle')} subtitle={t('seller.reviews.allCaughtUpFlaggedSubtitle')} />)
  }
  return (<EmptyState icon={<MessageSquare size={40} color={colors.textTertiary} />} title={t('seller.reviews.noReviewsTitle')} subtitle={t('seller.reviews.noReviewsSubtitle')} />)
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

const skeletonStyles = StyleSheet.create({
  bigNum: { width: 80, height: 32, borderRadius: radii.md, backgroundColor: colors.shimmer },
  starsRow: { flexDirection: 'row', gap: 2 },
  starDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.shimmer },
  smallLine: { width: 100, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  tinySquare: { width: 16, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  barTrack: { flex: 1, height: 8, borderRadius: radii.full, backgroundColor: colors.shimmer },
  tinyRect: { width: 36, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
})

const errorStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8], paddingVertical: spacing[12], gap: spacing[3] },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.errorLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], borderWidth: 2, borderColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2], marginTop: spacing[1] },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.primary },
})

const offlineStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  text: { flex: 1, fontSize: 13, color: '#92400E' },
})

const composeStyles = StyleSheet.create({
  toneHint: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  },
  toneHintText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  templatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
  },
  templatesRow: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  templateChip: {
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
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
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  counterRow: {
    paddingHorizontal: spacing[4],
    alignItems: 'flex-end',
    marginBottom: spacing[2],
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
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

const deleteStyles = StyleSheet.create({
  confirmText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 36,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

const flagStyles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    lineHeight: 19,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  reasonRowActive: {
    backgroundColor: colors.primary50,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  reasonLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  reasonLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  cancelBtn: {
    paddingHorizontal: spacing[3],
    height: 36,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warning,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 36,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

const bulkBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingBottom: spacing[5],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  notNeededBtn: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notNeededText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  flagBtn: {
    backgroundColor: colors.warning,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 36,
    justifyContent: 'center',
  },
  flagText: { fontSize: 13, fontWeight: '600', color: colors.white },
  doneBtn: {
    paddingHorizontal: spacing[2],
    height: 36,
    justifyContent: 'center',
  },
  doneText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
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

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing[1],
  },
  resultCount: { fontSize: 13, color: colors.textMuted },
  selectModeBtn: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  selectAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  selectedCountText: { fontSize: 13, color: colors.textMuted },

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
