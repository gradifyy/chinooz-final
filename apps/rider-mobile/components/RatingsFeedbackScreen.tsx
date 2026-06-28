import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated as RNAnimated,
  Modal as RNModal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Flag,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'
import { CountUp } from './CountUp'
import {
  RatingsSkeleton,
  LoadErrorState,
  OfflineState,
  NewRiderEmpty,
  NoCommentsEmpty,
  ReportFailState,
} from './PerformanceStates'
import { useRiderRatings, useReportRiderRating } from '@chinooz/hooks'
import {
  RIDER_RATING_TAGS,
  type RiderRatingsResult,
  type RiderRatingRow,
  type RiderRatingTag,
  type RiderRatingTagTone,
} from '@chinooz/mock-data'

/**
 * RP3 — Ratings & feedback view.
 *
 * Reuses the buyer/seller review summary pattern: average stars + 5→1
 * distribution bars + recent trend, a filterable feedback list (by stars and
 * by tag), positive highlights (top compliments) and constructive themes
 * (framed as "room to grow", never punishments), and an easy report-unfair-
 * rating path that routes to Support. Buyer identities are limited/
 * anonymized (zone-based labels, no names).
 *
 * Tone: fair + motivating. Compliments are celebrated; criticism is framed
 * constructively; the report path is always one tap away.
 */

const STARS = [5, 4, 3, 2, 1] as const

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function timeAgo(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - +new Date(iso)
  const day = 24 * 60 * 60 * 1000
  if (diff < 0) return ''
  if (diff < day) {
    const hrs = Math.floor(diff / (60 * 60 * 1000))
    if (hrs < 1) return t('rider.ratings.timeJustNow')
    return t('rider.ratings.timeHoursAgo', { count: hrs })
  }
  const days = Math.floor(diff / day)
  if (days < 7) return t('rider.ratings.timeDaysAgo', { count: days })
  if (days < 30) return t('rider.ratings.timeWeeksAgo', { count: Math.floor(days / 7) })
  return t('rider.ratings.timeMonthsAgo', { count: Math.floor(days / 30) })
}

function tagTone(id: RiderRatingTag): RiderRatingTagTone {
  return RIDER_RATING_TAGS.find(t => t.id === id)?.tone ?? 'positive'
}

const TAG_VISUAL: Record<
  RiderRatingTagTone,
  { bg: string; border: string; text: string }
> = {
  positive: { bg: colors.successLight, border: colors.success, text: colors.success },
  constructive: { bg: colors.warningLight, border: colors.warning, text: '#92400E' },
}

export default function RatingsFeedbackScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  const [starsFilter, setStarsFilter] = useState<number | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<RiderRatingTag | 'all'>('all')

  // TanStack Query — 120s staleTime per RS3 convention.
  const ratingsQuery = useRiderRatings(starsFilter, tagFilter)
  const data = ratingsQuery.data ?? null
  const cachedData = data
  const loading = ratingsQuery.isLoading
  const refreshing = ratingsQuery.isRefetching
  const error = ratingsQuery.isError

  // Report mutation — optimistic + rollback (RS3 pattern).
  const reportMutation = useReportRiderRating()

  // Report flow state.
  const [reportTarget, setReportTarget] = useState<RiderRatingRow | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [reportToast, setReportToast] = useState(false)
  const [reportFail, setReportFail] = useState(false)

  // Distribution bar fill animation (SV6-style staggered).
  const barAnims = useRef<RNAnimated.Value[]>(STARS.map(() => new RNAnimated.Value(0)))

  useEffect(() => {
    analytics.screen({ name: 'rider-ratings' })
  }, [])

  // Animate distribution bars on data change.
  useEffect(() => {
    if (!data || loading) return
    barAnims.current.forEach(a => a.setValue(0))
    if (reduced) {
      barAnims.current.forEach(a => a.setValue(1))
      return
    }
    RNAnimated.stagger(
      80,
      barAnims.current.map(a =>
        RNAnimated.timing(a, { toValue: 1, duration: duration.slower, useNativeDriver: false }),
      ),
    ).start()
  }, [data, loading, reduced])

  const onRefresh = useCallback(() => ratingsQuery.refetch(), [ratingsQuery])

  const goBack = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/profile/performance')
  }, [router, reduced])

  const summary = data?.summary
  const items = data?.items ?? []
  const highlights = data?.highlights

  const average = summary?.average ?? 0
  const totalReviews = summary?.total ?? 0
  const distribution = summary?.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const trendPct = summary?.trendPct ?? 0
  const trendUp = trendPct > 0
  const trendDown = trendPct < 0

  const hasActiveFilters = starsFilter !== 'all' || tagFilter !== 'all'

  const clearFilters = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setStarsFilter('all')
    setTagFilter('all')
  }, [reduced])

  const openReport = useCallback(
    (row: RiderRatingRow) => {
      try {
        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setReportTarget(row)
    },
    [reduced],
  )

  const closeReport = useCallback(() => {
    setReportTarget(null)
    setReportFail(false)
  }, [])

  const confirmReport = useCallback(async () => {
    if (!reportTarget) return
    setReportFail(false)
    try {
      const opRef = `report-${reportTarget.id}-${Date.now()}`
      await reportMutation.mutateAsync({ ratingId: reportTarget.id, opRef })
      setReportedIds(prev => new Set(prev).add(reportTarget.id))
      setReportToast(true)
      setTimeout(() => setReportToast(false), 2400)
      closeReport()
    } catch {
      setReportFail(true)
    }
  }, [reportTarget, closeReport, reportMutation])

  const starChips: { key: number | 'all'; label: string }[] = [
    { key: 'all', label: t('rider.ratings.filterStarsAll') },
    ...STARS.map(s => ({ key: s as number, label: t('rider.ratings.filterStars', { n: s }) })),
  ]

  const tagChips: { key: RiderRatingTag | 'all'; label: string }[] = [
    { key: 'all', label: t('rider.ratings.filterTagAll') },
    ...RIDER_RATING_TAGS.map(tag => ({ key: tag.id, label: t(tag.labelKey) })),
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.ratings.back')}
            onPress={goBack}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.ratings.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.ratings.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <RatingsSkeleton ariaLabel={t('rider.ratings.skeletonAria')} />
        ) : error ? (
          isOffline && cachedData ? (
            <View style={styles.body}>
              <OfflineState
                cachedDate={cachedData.summary.previousAverage.toString()}
                title={t('rider.ratings.offlineTitle')}
                body={t('rider.ratings.offlineBody', { date: cachedData.summary.previousAverage.toString() })}
                ariaLabel={t('rider.ratings.offlineAria', { date: cachedData.summary.previousAverage.toString() })}
                retry={t('rider.ratings.offlineRetry')}
                retryAria={t('rider.ratings.offlineRetryAria')}
                onRetry={onRefresh}
              />
              <CachedRatingsSummary data={cachedData} t={t} />
            </View>
          ) : (
            <LoadErrorState
              title={t('rider.ratings.errorTitle')}
              subtitle={t('rider.ratings.errorSubtitle')}
              retry={t('rider.ratings.retry')}
              retryAria={t('rider.ratings.retry')}
              onRetry={onRefresh}
            />
          )
        ) : summary ? (
          <View style={styles.body} nativeID="rider-ratings">
            {/* Offline banner — cached data still visible */}
            {isOffline && (
              <OfflineState
                cachedDate={summary.previousAverage.toString()}
                title={t('rider.ratings.offlineTitle')}
                body={t('rider.ratings.offlineBody', { date: summary.previousAverage.toString() })}
                ariaLabel={t('rider.ratings.offlineAria', { date: summary.previousAverage.toString() })}
                retry={t('rider.ratings.offlineRetry')}
                retryAria={t('rider.ratings.offlineRetryAria')}
                onRetry={onRefresh}
              />
            )}

            {/* New-rider empty — no ratings yet */}
            {totalReviews === 0 ? (
              <NewRiderEmpty
                title={t('rider.ratings.newRiderTitle')}
                body={t('rider.ratings.newRiderBody')}
                ariaLabel={t('rider.ratings.newRiderAria')}
              />
            ) : (
              <>
            {/* Summary — average + stars + distribution + trend */}
            <View
              accessibilityRole="summary"
              accessibilityLabel={t('rider.ratings.summaryAria', {
                average: average.toFixed(1),
                total: totalReviews,
              })}
              style={styles.summaryCard}
            >
              <View style={styles.summaryTop}>
                <View style={styles.summaryLeft}>
                  <CountUp
                    value={average}
                    format={v => v.toFixed(1)}
                    reduced={reduced}
                    delay={duration.normal}
                    style={styles.averageText}
                  />
                  <View style={styles.starRow} accessibilityLabel={t('rider.ratings.averageLabel')}>
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
                    {totalReviews.toLocaleString()} {t('rider.ratings.totalRatings')}
                  </Text>
                </View>

                <View style={styles.trendCol}>
                  <View style={styles.trendValueRow}>
                    {trendUp ? (
                      <TrendingUp size={14} color={colors.success} />
                    ) : trendDown ? (
                      <TrendingDown size={14} color={colors.error} />
                    ) : (
                      <Minus size={14} color={colors.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.trendValue,
                        {
                          color: trendUp
                            ? colors.success
                            : trendDown
                              ? colors.error
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {trendUp
                        ? t('rider.ratings.trendUp', { pct: Math.abs(trendPct) })
                        : trendDown
                          ? t('rider.ratings.trendDown', { pct: Math.abs(trendPct) })
                          : t('rider.ratings.trendFlat')}
                    </Text>
                  </View>
                  <Text style={styles.trendLabel}>{t('rider.ratings.trend')}</Text>
                </View>
              </View>

              {/* Distribution — 5→1 bars, aria per row */}
              <View
                accessibilityLabel={t('rider.ratings.distributionAria')}
                style={styles.distribution}
              >
                {STARS.map((stars, idx) => {
                  const count = distribution[stars]
                  const p = pct(count, totalReviews)
                  return (
                    <View
                      key={stars}
                      style={styles.distRow}
                      accessibilityLabel={t('rider.ratings.distRowAria', {
                        stars,
                        count,
                        pct: p,
                      })}
                    >
                      <Text style={styles.distStar}>{stars}</Text>
                      <Star size={11} color={colors.gold} fill={colors.gold} />
                      <View style={styles.distTrack}>
                        <RNAnimated.View
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

            {/* Positive highlights — top compliments, celebrated */}
            {highlights && (
              <HighlightsSection
                title={t('rider.ratings.sectionHighlights')}
                items={highlights.positive}
                tone="positive"
                total={totalReviews}
                t={t}
              />
            )}

            {/* Constructive themes — framed as room to grow */}
            {highlights && (
              <HighlightsSection
                title={t('rider.ratings.sectionConstructive')}
                items={highlights.constructive}
                tone="constructive"
                total={totalReviews}
                t={t}
              />
            )}

            {/* Feedback list — filters */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.ratings.sectionFeedback')}</Text>
            </View>
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {starChips.map(c => (
                  <FilterChip
                    key={String(c.key)}
                    label={c.label}
                    pressed={starsFilter === c.key}
                    onPress={() => {
                      try {
                        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      } catch {}
                      setStarsFilter(c.key)
                    }}
                    ariaLabel={c.label}
                  />
                ))}
                <View style={styles.chipDivider} />
                {tagChips.map(c => (
                  <FilterChip
                    key={String(c.key)}
                    label={c.label}
                    pressed={tagFilter === c.key}
                    onPress={() => {
                      try {
                        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      } catch {}
                      setTagFilter(c.key)
                    }}
                    ariaLabel={c.label}
                  />
                ))}
              </ScrollView>
              {hasActiveFilters && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.ratings.filterClearAria')}
                  onPress={clearFilters}
                  style={styles.clearBtn}
                >
                  <X size={14} color={colors.textMuted} />
                  <Text style={styles.clearText}>{t('rider.ratings.filterClear')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Feedback rows — no-comments empty vs filtered-empty */}
            {items.length === 0 ? (
              hasActiveFilters ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>{t('rider.ratings.emptyTitle')}</Text>
                  <Text style={styles.emptySubtitle}>{t('rider.ratings.emptySubtitle')}</Text>
                </View>
              ) : (
                <NoCommentsEmpty
                  title={t('rider.ratings.noCommentsTitle')}
                  body={t('rider.ratings.noCommentsBody')}
                  ariaLabel={t('rider.ratings.noCommentsAria')}
                />
              )
            ) : (
              <View style={styles.listWrap}>
                {items.map(row => (
                  <FeedbackRow
                    key={row.id}
                    row={row}
                    t={t}
                    reported={reportedIds.has(row.id)}
                    onReport={() => openReport(row)}
                  />
                ))}
              </View>
            )}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Report toast */}
      {reportToast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.toastText}>{t('rider.ratings.reportDone')}</Text>
          </View>
        </View>
      )}

      {/* Report confirm dialog — with failure state (preserves input) */}
      <ReportDialog
        visible={!!reportTarget}
        sending={reportMutation.isPending}
        failed={reportFail}
        title={t('rider.ratings.reportConfirmTitle')}
        msg={t('rider.ratings.reportConfirmMsg')}
        cancelLabel={t('rider.ratings.reportConfirmCancel')}
        confirmLabel={t('rider.ratings.reportConfirmConfirm')}
        failTitle={t('rider.ratings.reportFailTitle')}
        failBody={t('rider.ratings.reportFailBody')}
        failPreserved={t('rider.ratings.reportFailPreserved')}
        failRetry={t('rider.ratings.reportFailRetry')}
        failRetryAria={t('rider.ratings.reportFailRetryAria')}
        failCancelLabel={t('rider.ratings.reportConfirmCancel')}
        failCancelAria={t('rider.ratings.reportConfirmCancel')}
        onFailRetry={confirmReport}
        onFailCancel={closeReport}
        onCancel={closeReport}
        onConfirm={confirmReport}
        reduced={reduced}
      />
    </View>
  )
}

/** Cached ratings summary — renders a read-only summary from cached data when offline. */
function CachedRatingsSummary({
  data,
  t,
}: {
  data: RiderRatingsResult
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const summary = data.summary
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t('rider.ratings.summaryAria', {
        average: summary.average.toFixed(1),
        total: summary.total,
      })}
      style={styles.summaryCard}
    >
      <View style={styles.summaryTop}>
        <View style={styles.summaryLeft}>
          <Text style={styles.averageText}>{summary.average.toFixed(1)}</Text>
          <View style={styles.starRow} accessibilityLabel={t('rider.ratings.averageLabel')}>
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                size={16}
                color={s <= Math.round(summary.average) ? colors.gold : colors.border}
                fill={s <= Math.round(summary.average) ? colors.gold : 'none'}
              />
            ))}
          </View>
          <Text style={styles.totalReviewsText}>
            {summary.total.toLocaleString()} {t('rider.ratings.totalRatings')}
          </Text>
        </View>
      </View>
    </View>
  )
}

/** Highlights section — positive (celebrated) or constructive (room to grow). */
function HighlightsSection({
  title,
  items,
  tone,
  total,
  t,
}: {
  title: string
  items: { labelKey: string; count: number; share: number }[]
  tone: RiderRatingTagTone
  total: number
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const visual = TAG_VISUAL[tone]
  const top = items.filter(i => i.count > 0).slice(0, 4)
  const Icon = tone === 'positive' ? Sparkles : AlertTriangle

  return (
    <View style={styles.section}>
      <View style={styles.highlightHead}>
        <Icon size={15} color={visual.text} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {top.length === 0 ? (
        <Text style={styles.highlightEmpty}>{t('rider.ratings.highlightEmpty')}</Text>
      ) : (
        <View style={styles.highlightList}>
          {top.map(h => {
            const p = pct(h.count, total)
            return (
              <View
                key={h.labelKey}
                style={styles.highlightRow}
                accessibilityRole="text"
                accessibilityLabel={t('rider.ratings.highlightAria', {
                  label: t(h.labelKey),
                  count: h.count,
                  pct: p,
                })}
              >
                <View
                  style={[styles.highlightDot, { backgroundColor: visual.border }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.highlightLabel}>{t(h.labelKey)}</Text>
                <Text style={styles.highlightCount} numberOfLines={1}>
                  {h.count} · {p}%
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

/** Feedback row — anonymized buyer, stars, optional comment, tags, report. */
const FeedbackRow = React.memo(function FeedbackRow({
  row,
  t,
  reported,
  onReport,
}: {
  row: RiderRatingRow
  t: (key: string, opts?: Record<string, unknown>) => string
  reported: boolean
  onReport: () => void
}) {
  const tagsText = row.tags.length
    ? t('rider.ratings.rowTagsPrefix') +
      ' ' +
      row.tags.map(tag => t(`rider.ratings.tag${tag.charAt(0).toUpperCase()}${tag.slice(1)}`)).join(', ')
    : ''
  const aria = t('rider.ratings.rowAria', {
    date: row.date,
    stars: row.rating,
    buyer: row.buyerLabel,
    zone: row.zone,
    tags: tagsText,
  })

  return (
    <View style={styles.feedbackCard} accessibilityRole="summary" accessibilityLabel={aria}>
      <View style={styles.feedbackTop}>
        <View style={styles.feedbackIdentity}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.avatarText}>{row.buyerLabel.charAt(0)}</Text>
          </View>
          <View style={styles.feedbackMeta}>
            <Text style={styles.buyerLabel} numberOfLines={1}>
              {row.buyerLabel}
            </Text>
            <Text style={styles.zoneLabel} numberOfLines={1}>
              {row.zone} · {timeAgo(row.date, t)}
            </Text>
          </View>
        </View>
        <View style={styles.starsCol} accessibilityLabel={t('rider.ratings.rowStarsAria', { stars: row.rating })}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={13}
              color={s <= row.rating ? colors.gold : colors.border}
              fill={s <= row.rating ? colors.gold : 'none'}
            />
          ))}
        </View>
      </View>

      {row.comment ? <Text style={styles.commentText}>{row.comment}</Text> : null}

      {row.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {row.tags.map(tag => {
            const tone = tagTone(tag)
            const visual = TAG_VISUAL[tone]
            const ariaTone =
              tone === 'positive'
                ? t('rider.ratings.tagAriaPositive')
                : t('rider.ratings.tagAriaConstructive')
            return (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: visual.bg, borderColor: visual.border }]}
                accessibilityRole="text"
                accessibilityLabel={`${t(`rider.ratings.tag${tag.charAt(0).toUpperCase()}${tag.slice(1)}`)}, ${ariaTone}`}
              >
                <Text style={[styles.tagText, { color: visual.text }]}>
                  {t(`rider.ratings.tag${tag.charAt(0).toUpperCase()}${tag.slice(1)}`)}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Report action — easy, one tap */}
      <View style={styles.feedbackActions}>
        {reported ? (
          <View style={styles.reportedBadge}>
            <Flag size={13} color={colors.error} />
            <Text style={styles.reportedText}>{t('rider.ratings.reportedBadge')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.ratings.reportActionAria')}
            onPress={onReport}
            style={styles.reportBtn}
            activeOpacity={0.85}
          >
            <Flag size={13} color={colors.textMuted} />
            <Text style={styles.reportText}>{t('rider.ratings.reportAction')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
})

/** Filter chip — accessibilityRole + selected state. */
function FilterChip({
  label,
  pressed,
  onPress,
  ariaLabel,
}: {
  label: string
  pressed: boolean
  onPress: () => void
  ariaLabel: string
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected: pressed }}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, pressed && styles.chipPressed]}
    >
      <Text style={[styles.chipText, pressed && styles.chipTextPressed]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

/** Report confirm dialog — modal with cancel/confirm. */
function ReportDialog({
  visible,
  sending,
  failed,
  title,
  msg,
  cancelLabel,
  confirmLabel,
  failTitle,
  failBody,
  failPreserved,
  failRetry,
  failRetryAria,
  failCancelLabel,
  failCancelAria,
  onFailRetry,
  onFailCancel,
  onCancel,
  onConfirm,
  reduced,
}: {
  visible: boolean
  sending: boolean
  failed: boolean
  title: string
  msg: string
  cancelLabel: string
  confirmLabel: string
  failTitle: string
  failBody: string
  failPreserved: string
  failRetry: string
  failRetryAria: string
  failCancelLabel: string
  failCancelAria: string
  onFailRetry: () => void
  onFailCancel: () => void
  onCancel: () => void
  onConfirm: () => void
  reduced: boolean
}) {
  return (
    <RNModal
      transparent
      visible={visible}
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onCancel}
      accessibilityRole="alert"
    >
      <Pressable style={dialogStyles.overlay} onPress={onCancel}>
        <Pressable style={dialogStyles.sheet} onPress={e => e.stopPropagation()}>
          {failed ? (
            <>
              <View style={dialogStyles.failIconWrap}>
                <AlertCircle size={28} color={colors.warning} />
              </View>
              <Text style={dialogStyles.title}>{failTitle}</Text>
              <Text style={dialogStyles.msg}>{failBody}</Text>
              <Text style={dialogStyles.failPreserved}>{failPreserved}</Text>
              <View style={dialogStyles.btnRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={failCancelAria}
                  onPress={onFailCancel}
                  style={dialogStyles.cancelBtn}
                  activeOpacity={0.85}
                >
                  <Text style={dialogStyles.cancelText}>{failCancelLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={failRetryAria}
                  onPress={onFailRetry}
                  style={dialogStyles.confirmBtn}
                  activeOpacity={0.85}
                >
                  <Text style={dialogStyles.confirmText}>{failRetry}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={dialogStyles.title}>{title}</Text>
              <Text style={dialogStyles.msg}>{msg}</Text>
              <View style={dialogStyles.btnRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                  onPress={onCancel}
                  style={dialogStyles.cancelBtn}
                  activeOpacity={0.85}
                >
                  <Text style={dialogStyles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={confirmLabel}
                  onPress={onConfirm}
                  disabled={sending}
                  style={[dialogStyles.confirmBtn, sending && dialogStyles.confirmBtnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={dialogStyles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  body: { padding: spacing[4], paddingTop: spacing[2], gap: spacing[4] },

  // Summary card.
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    gap: spacing[4],
    ...shadow('md'),
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLeft: { gap: spacing[1.5] },
  averageText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  starRow: { flexDirection: 'row', gap: 2 },
  totalReviewsText: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  trendCol: { alignItems: 'flex-end', gap: spacing[1] },
  trendValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  trendValue: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  trendLabel: { fontSize: 11, color: colors.textMuted, fontFamily: fontFamily.sans[0] },

  // Distribution.
  distribution: { gap: spacing[2] },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  distStar: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    width: 12,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  distTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  distCount: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 32,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },
  distPct: {
    fontSize: 12,
    color: colors.textMuted,
    width: 34,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },

  // Section.
  section: { gap: spacing[2] },
  sectionHead: { marginTop: spacing[1] },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  highlightHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  highlightList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2.5],
  },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  highlightDot: { width: 8, height: 8, borderRadius: radii.full },
  highlightLabel: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  highlightCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },
  highlightEmpty: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },

  // Filters.
  filterSection: { gap: spacing[2] },
  chipRow: { paddingHorizontal: spacing[1], gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  chipTextPressed: { color: colors.white },
  chipDivider: { width: 1, height: 24, backgroundColor: colors.borderLight },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  clearText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },

  // Empty + list.
  emptyWrap: { paddingVertical: spacing[8], alignItems: 'center', gap: spacing[2] },
  emptyTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  emptySubtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  listWrap: { gap: spacing[3] },

  // Feedback card.
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  feedbackTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  feedbackIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  feedbackMeta: { flex: 1, gap: 2 },
  buyerLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  zoneLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  starsCol: { flexDirection: 'row', gap: 1 },
  commentText: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },

  // Tags.
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  tagChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Report action.
  feedbackActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reportText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  reportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
  },
  reportedText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Toast.
  toastWrap: {
    position: 'absolute',
    bottom: spacing[8],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.text,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    ...shadow('lg'),
  },
  toastText: {
    fontSize: fontSize.sm[0],
    color: colors.white,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})

const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  title: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  msg: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  btnRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  failIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[1],
  },
  failPreserved: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing[1],
  },
})
