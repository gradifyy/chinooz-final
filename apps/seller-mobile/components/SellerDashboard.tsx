import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Pressable,
  useWindowDimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  Bell,
  Search,
  Plus,
  Box,
  Layers,
  Wallet,
  Tag,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Menu,
  MessageCircle,
  Star,
  PackageX,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Settings,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import Svg, { Path, Circle as SvgCircle, Line as SvgLine, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import NetInfo from '@react-native-community/netinfo'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { useSellerReviews, useSellerDashboardStats, useGoLiveChecklist } from '@chinooz/hooks'
import {
  getEmptySellerDashboardMetrics,
  type SellerDateRange,
  type SellerDateRangeKey,
  type SellerKpi,
  type SellerChartPoint,
  type SellerChartMetric,
  type SellerAlert,
  type SellerQuickAction,
  type SellerActivityItem,
  type SellerActivityKind,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'

type GoLiveTask = { id: string; label: string; done: boolean }

const RANGE_KEYS: SellerDateRangeKey[] = ['today', '7d', '30d', 'custom']

function dateLabel(key: SellerDateRangeKey, t: (k: string) => string): string {
  switch (key) {
    case 'today':
      return t('seller.dashboard.rangeToday')
    case '7d':
      return t('seller.dashboard.range7d')
    case '30d':
      return t('seller.dashboard.range30d')
    case 'custom':
      return t('seller.dashboard.rangeCustom')
  }
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function statusInfo(goLive: string): { key: 'live' | 'review' | 'paused'; color: string; bg: string } {
  if (goLive === 'live') return { key: 'live', color: colors.success, bg: colors.successLight }
  if (goLive === 'review') return { key: 'review', color: colors.warning, bg: colors.warningLight }
  return { key: 'paused', color: colors.textMuted, bg: colors.borderLight }
}

export default function SellerDashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const store = useSellerSessionStore(s => s.store)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)

  const [rangeKey, setRangeKey] = useState<SellerDateRangeKey>('7d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null)
  const [customSheet, setCustomSheet] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false))
    })
    return () => unsub()
  }, [])

  const isFirstRun = goLiveStatus !== 'live'

  const range: SellerDateRange = useMemo(() => {
    const days = rangeKey === 'today' ? 1 : rangeKey === '7d' ? 7 : 30
    return {
      key: rangeKey,
      label: dateLabel(rangeKey, t),
      days,
      custom: rangeKey === 'custom' ? customRange ?? undefined : undefined,
    }
  }, [rangeKey, customRange, t])

  const statsQuery = useSellerDashboardStats(range)
  const goLiveQuery = useGoLiveChecklist()

  const loading = !isFirstRun && statsQuery.isLoading
  const error = !isFirstRun && statsQuery.isError
  const refreshing = statsQuery.isFetching && !statsQuery.isLoading

  const metrics = useMemo(() => {
    if (isFirstRun) return getEmptySellerDashboardMetrics(range)
    return statsQuery.data ?? getEmptySellerDashboardMetrics(range)
  }, [isFirstRun, statsQuery.data, range])

  useEffect(() => {
    analytics.screen({ name: 'seller-dashboard' })
  }, [])

  const goLiveTasks: GoLiveTask[] = goLiveQuery.data ?? []
  const goLiveDone = goLiveTasks.filter(t => t.done).length
  const goLiveComplete = goLiveDone === goLiveTasks.length

  const status = statusInfo(goLiveStatus)
  const statusLabel =
    status.key === 'live'
      ? t('seller.dashboard.statusLive')
      : status.key === 'review'
        ? t('seller.dashboard.statusReview')
        : t('seller.dashboard.statusPaused')

  const switchRange = useCallback(
    (key: SellerDateRangeKey) => {
      if (key === 'custom') {
        setCustomSheet(true)
        return
      }
      if (key === rangeKey) return
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: true,
      }).start(() => {
        setRangeKey(key)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: reducedMotion ? 0 : 200,
          useNativeDriver: true,
        }).start()
      })
    },
    [rangeKey, reducedMotion, fadeAnim],
  )

  const applyCustom = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    const start = customRange?.start ?? today
    const end = customRange?.end ?? today
    setCustomRange({ start, end })
    setCustomSheet(false)
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: reducedMotion ? 0 : 200,
      useNativeDriver: true,
    }).start(() => {
      setRangeKey('custom')
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: true,
      }).start()
    })
  }, [customRange, reducedMotion, fadeAnim])

  const onRefresh = useCallback(() => {
    statsQuery.refetch()
    goLiveQuery.refetch()
  }, [statsQuery, goLiveQuery])

  const onRetry = useCallback(() => {
    statsQuery.refetch()
  }, [statsQuery])

  return (
    <View style={styles.container}>
      <SellerTopBar onSearch={() => {}} onNotifications={() => {}} onMore={() => router.push('/settings')} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            accessibilityLabel={t('seller.dashboard.pullToRefresh')}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <Text
                accessibilityRole="header"
                style={styles.greeting}
                numberOfLines={1}
              >
                {t('seller.dashboard.greeting', { name: store?.name ?? t('seller.title') })}
              </Text>
              <Text style={styles.dateLine}>{t('seller.dashboard.dateLine', { date: todayLabel() })}</Text>
            </View>
            <View
              style={[styles.statusPill, { backgroundColor: status.bg }]}
              accessibilityLabel={t('seller.dashboard.statusAria', { status: statusLabel })}
              accessibilityRole="text"
            >
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{statusLabel}</Text>
            </View>
          </View>

          <DateRangeSelector
            activeKey={rangeKey}
            onChange={switchRange}
            accessibilityLabel={t('seller.dashboard.rangeAriaLabel')}
          />
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {isOffline && !loading && !error && (
            <View style={styles.offlineBanner} accessibilityRole="status" accessibilityLabel={t('seller.dashboard.offlineBannerAria')}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>{t('seller.dashboard.offlineBanner')}</Text>
            </View>
          )}

          {error ? (
            <DashboardErrorState onRetry={onRetry} t={t} reducedMotion={reducedMotion} />
          ) : loading ? (
            <DashboardSkeleton t={t} />
          ) : isFirstRun ? (
            <FirstRunEmpty onAddProduct={() => router.push('/products/new' as any)} t={t} reducedMotion={reducedMotion} />
          ) : (
            <>
              {!goLiveComplete && <GoLiveChecklist tasks={goLiveTasks} done={goLiveDone} total={goLiveTasks.length} onContinue={() => router.push('/onboarding')} />}

              <View style={styles.sections}>
                <StaggerSection index={0} reducedMotion={reducedMotion}>
                  <SectionHeader title={t('seller.dashboard.sectionKpis')} />
                  <KpiCards kpis={metrics.kpis} loading={refreshing} onPress={(kpi) => router.push(kpi.route as any)} t={t} />
                </StaggerSection>

                <StaggerSection index={1} reducedMotion={reducedMotion}>
                  <SalesChart points={metrics.chart} rangeLabel={range.label} t={t} />
                </StaggerSection>

                <StaggerSection index={2} reducedMotion={reducedMotion}>
                  <SectionHeader title={t('seller.dashboard.sectionAlerts')} seeAllLabel={t('seller.dashboard.seeAll')} onSeeAll={() => router.push('/orders')} />
                  <Alerts alerts={metrics.alerts} onRoute={(route) => router.push(route as any)} t={t} />
                </StaggerSection>

                <StaggerSection index={3} reducedMotion={reducedMotion}>
                  <SectionHeader title={t('seller.dashboard.sectionQuickActions')} />
                  <QuickActions
                    actions={metrics.quickActions}
                    onPress={id => {
                      const action = metrics.quickActions.find(a => a.id === id)
                      if (action?.href) router.push(action.href as any)
                    }}
                    t={t}
                  />
                </StaggerSection>

                <StaggerSection index={4} reducedMotion={reducedMotion}>
                  <SectionHeader title={t('seller.dashboard.sectionActivity')} seeAllLabel={t('seller.dashboard.seeAll')} onSeeAll={() => router.push('/orders')} />
                  <RecentActivity items={metrics.activity} loading={refreshing} onRoute={(route) => router.push(route as any)} lastViewed={0} t={t} />
                </StaggerSection>
              </View>
            </>
          )}
        </Animated.View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {customSheet && (
        <CustomRangeSheet
          onClose={() => setCustomSheet(false)}
          onApply={applyCustom}
          start={customRange?.start}
          end={customRange?.end}
          onChange={setCustomRange}
        />
      )}
    </View>
  )
}

function SellerTopBar({ onSearch, onNotifications, onMore }: { onSearch: () => void; onNotifications: () => void; onMore: () => void }) {
  const { t } = useTranslation()
  const { minTouchTarget } = useA11y()
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarBrand}>
        <View style={styles.topBarLogo}>
          <View style={styles.topBarLogoDot} />
        </View>
        <Text style={styles.topBarTitle}>{t('seller.dashboard.tab')}</Text>
      </View>
      <View style={styles.topBarActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.dashboard.search')}
          onPress={onSearch}
          hitSlop={8}
          style={[styles.topBarIconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <Search size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.dashboard.notifications')}
          onPress={onNotifications}
          hitSlop={8}
          style={[styles.topBarIconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <Bell size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('sellerReviews.moreAria')}
          onPress={onMore}
          hitSlop={8}
          style={[styles.topBarIconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function SectionHeader({ title, seeAllLabel, onSeeAll }: { title: string; seeAllLabel?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={styles.sectionTitle}>{title}</Text>
      {seeAllLabel && onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={8} accessibilityRole="link">
          <Text style={styles.seeAllLink}>{seeAllLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function DateRangeSelector({
  activeKey,
  onChange,
  accessibilityLabel,
}: {
  activeKey: SellerDateRangeKey
  onChange: (key: SellerDateRangeKey) => void
  accessibilityLabel: string
}) {
  const { t } = useTranslation()
  return (
    <View style={styles.rangeTrack} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {RANGE_KEYS.map(key => {
        const active = key === activeKey
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.rangeSegment, active && styles.rangeSegmentActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeLabel, active && styles.rangeLabelActive]}>{dateLabel(key, t)}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function GoLiveChecklist({
  tasks,
  done,
  total,
  onContinue,
}: {
  tasks: GoLiveTask[]
  done: number
  total: number
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <View style={styles.card}>
      <Text style={styles.goLiveTitle}>{t('seller.dashboard.goLiveTitle')}</Text>
      <Text style={styles.goLiveSubtitle}>{t('seller.dashboard.goLiveSubtitle')}</Text>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.goLiveProgress}>{t('seller.dashboard.goLiveProgress', { done, total })}</Text>
      <View style={styles.checklistRows}>
        {tasks.map(task => (
          <View key={task.id} style={styles.checklistRow}>
            {task.done ? (
              <CheckCircle2 size={20} color={colors.success} />
            ) : (
              <Circle size={20} color={colors.textTertiary} />
            )}
            <Text style={[styles.checklistLabel, task.done && styles.checklistLabelDone]}>{task.label}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.goLiveContinueBtn} onPress={onContinue} accessibilityRole="button">
        <Text style={styles.goLiveContinueText}>{t('seller.dashboard.goLiveContinue')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function KpiCards({ kpis, loading, onPress, t }: { kpis: SellerKpi[]; loading: boolean; onPress: (kpi: SellerKpi) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { width } = useWindowDimensions()
  const isTablet = width >= 768
  const columns = isTablet ? 3 : 2
  const cardWidth = (width - 16 * 2 - 8 * (columns - 1)) / columns

  if (loading) {
    return (
      <View style={[styles.kpiGrid, { gap: spacing[2] }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} width={cardWidth} />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.kpiGrid, { gap: spacing[2] }]}>
      {kpis.map(kpi => (
        <KpiCard key={kpi.key} kpi={kpi} onPress={onPress} width={cardWidth} t={t} />
      ))}
    </View>
  )
}

function useCountUp(target: number, enabled: boolean, durationMs = 300): number {
  const [value, setValue] = useState(0)
  const raf = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled, durationMs])
  return value
}

function formatValue(kpi: SellerKpi, raw: number): string {
  const v = kpi.decimals ? Math.round(raw * 10) / 10 : Math.round(raw)
  if (kpi.prefix) return `${kpi.prefix} ${v.toLocaleString()}`
  if (kpi.suffix) return `${v.toFixed(kpi.decimals ?? 0)}${kpi.suffix}`
  return v.toLocaleString()
}

const KpiCard = React.memo(function KpiCard({ kpi, onPress, width, t }: { kpi: SellerKpi; onPress: (kpi: SellerKpi) => void; width: number; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { reducedMotion } = useA11y()
  const scale = useRef(new Animated.Value(1)).current
  const animatedValue = useCountUp(kpi.numericValue, !reducedMotion)
  const displayValue = formatValue(kpi, animatedValue)

  const direction = kpi.trend === 'up' ? t('seller.dashboard.kpiUp') : kpi.trend === 'down' ? t('seller.dashboard.kpiDown') : t('seller.dashboard.kpiFlat')
  const ariaLabel = t('seller.dashboard.kpiAria', {
    label: kpi.label,
    value: kpi.value,
    direction,
    delta: Math.abs(kpi.deltaPct),
    period: kpi.period,
  })

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }

  const valueColor = kpi.accent === 'plum' ? colors.primary : colors.text
  const deltaColor = kpi.trend === 'up' ? colors.success : kpi.trend === 'down' ? colors.error : colors.textMuted
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus

  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        onPress={() => onPress(kpi)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        style={styles.kpiCard}
      >
        <Text style={styles.kpiLabel}>{kpi.label}</Text>
        <Text style={[styles.kpiValue, { color: valueColor }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <Sparkline data={kpi.sparkline} accent={kpi.accent} />
        <Text style={styles.kpiPeriod}>{kpi.period}</Text>
        <View style={styles.kpiDeltaRow}>
          <TrendIcon size={12} color={deltaColor} />
          <Text style={[styles.kpiDelta, { color: deltaColor }]}>
            {kpi.deltaPct > 0 ? '+' : ''}
            {kpi.deltaPct}%
          </Text>
          <Text style={styles.kpiVsPrev}>{t('seller.dashboard.kpiVsPrev')}</Text>
        </View>
      </TouchableOpacity>
     </Animated.View>
   )
})

function Sparkline({ data, accent }: { data: number[]; accent: 'plum' | 'default' }) {
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const h = 32
  const stroke = accent === 'plum' ? colors.primary : colors.primary

  return (
    <View style={styles.sparklineContainer} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.sparklineTrack, { height: h }]}>
        {data.map((v, i) => {
          const barH = Math.max(2, ((v - min) / range) * h)
          const isLast = i === data.length - 1
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: barH,
                backgroundColor: isLast ? stroke : stroke + '50',
                borderRadius: 1,
                maxWidth: 4,
              }}
            />
          )
        })}
      </View>
    </View>
  )
}

function KpiCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.kpiCard, { width }]} accessibilityRole="text" accessibilityLabel="Loading metric" aria-busy>
      <View style={styles.skeletonLabel} />
      <View style={styles.skeletonValue} />
      <View style={styles.skeletonSpark} />
      <View style={styles.skeletonPeriod} />
      <View style={styles.skeletonDelta} />
    </View>
  )
}

const CHART_METRICS: { key: SellerChartMetric; labelKey: string }[] = [
  { key: 'revenue', labelKey: 'seller.dashboard.chartMetricRevenue' },
  { key: 'orders', labelKey: 'seller.dashboard.chartMetricOrders' },
  { key: 'units', labelKey: 'seller.dashboard.chartMetricUnits' },
]

const CHART_W = 340
const CHART_H = 180
const C_PAD_L = 8
const C_PAD_R = 8
const C_PAD_T = 16
const C_PAD_B = 28

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev.x + curr.x) / 2
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function metricValue(p: SellerChartPoint, metric: SellerChartMetric): number {
  return p[metric]
}

function metricPrefix(metric: SellerChartMetric): string {
  return metric === 'revenue' ? 'NPR ' : ''
}

const SalesChart = React.memo(function SalesChart({ points, rangeLabel, t }: { points: SellerChartPoint[]; rangeLabel: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { reducedMotion } = useA11y()
  const [metric, setMetric] = useState<SellerChartMetric>('revenue')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [drawProgress, setDrawProgress] = useState(reducedMotion ? 1 : 0)

  const values = points.map(p => metricValue(p, metric))
  const maxVal = Math.max(1, ...values)
  const allZero = values.every(v => v === 0)

  const coords = useMemo(() => {
    const innerW = CHART_W - C_PAD_L - C_PAD_R
    const innerH = CHART_H - C_PAD_T - C_PAD_B
    const n = points.length
    return points.map((p, i) => {
      const x = C_PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const v = metricValue(p, metric)
      const y = C_PAD_T + innerH - (v / maxVal) * innerH
      return { x, y, p }
    })
  }, [points, metric, maxVal])

  const linePath = useMemo(() => smoothPath(coords.map(c => ({ x: c.x, y: c.y }))), [coords])
  const areaPath = useMemo(() => {
    if (coords.length === 0) return ''
    const base = CHART_H - C_PAD_B
    return `${linePath} L ${coords[coords.length - 1].x} ${base} L ${coords[0].x} ${base} Z`
  }, [linePath, coords])

  useEffect(() => {
    if (reducedMotion || allZero) {
      setDrawProgress(1)
      return
    }
    setDrawProgress(0)
    const start = Date.now()
    const dur = 600
    const raf = setInterval(() => {
      const tt = Math.min(1, (Date.now() - start) / dur)
      setDrawProgress(1 - Math.pow(1 - tt, 3))
      if (tt >= 1) clearInterval(raf)
    }, 16)
    return () => clearInterval(raf)
  }, [linePath, reducedMotion, allZero])

  const ariaSummary = useMemo(() => {
    if (allZero) return t('seller.dashboard.chartEmpty')
    const metricLabel = t(`seller.dashboard.chartMetric${metric.charAt(0).toUpperCase() + metric.slice(1)}`)
    const from = metricPrefix(metric) + Math.min(...values).toLocaleString()
    const to = metricPrefix(metric) + Math.max(...values).toLocaleString()
    return t('seller.dashboard.chartAriaSummary', { metric: metricLabel, range: rangeLabel, from, to })
  }, [allZero, values, metric, rangeLabel, t])

  const hovered = hoverIdx != null ? points[hoverIdx] : null
  const hoveredValue = hovered ? metricValue(hovered, metric) : 0

  return (
    <View style={styles.card}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{t('seller.dashboard.sectionSales')}</Text>
        <View accessibilityRole="tablist" accessibilityLabel={t('seller.dashboard.chartToggleAria')} style={styles.chartToggleGroup}>
          {CHART_METRICS.map(m => {
            const active = m.key === metric
            return (
              <TouchableOpacity
                key={m.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMetric(m.key)}
                style={[styles.chartTogglePill, active && styles.chartTogglePillActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chartToggleText, active && styles.chartToggleTextActive]}>
                  {t(m.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {allZero ? (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>{t('seller.dashboard.chartEmpty')}</Text>
          <Text style={styles.chartEmptySub}>{t('seller.dashboard.chartEmptySub')}</Text>
        </View>
      ) : (
        <View accessibilityLabel={ariaSummary} accessibilityRole="image">
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.15} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75].map(f => (
              <SvgLine
                key={f}
                x1={C_PAD_L}
                x2={CHART_W - C_PAD_R}
                y1={C_PAD_T + (CHART_H - C_PAD_T - C_PAD_B) * f}
                y2={C_PAD_T + (CHART_H - C_PAD_T - C_PAD_B) * f}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}

            <Path d={areaPath} fill="url(#chartGradient)" />

            <Path
              d={linePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1"
              strokeDashoffset={1 - drawProgress}
            />

            {hoverIdx != null && coords[hoverIdx] && (
              <>
                <SvgLine
                  x1={coords[hoverIdx].x}
                  x2={coords[hoverIdx].x}
                  y1={C_PAD_T}
                  y2={CHART_H - C_PAD_B}
                  stroke={colors.primary}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                <SvgCircle
                  cx={coords[hoverIdx].x}
                  cy={coords[hoverIdx].y}
                  r={6}
                  fill={colors.primary}
                  stroke={colors.white}
                  strokeWidth={2}
                />
              </>
            )}

            {coords.map((c, i) => (
              <SvgCircle
                key={'pt' + i}
                cx={c.x}
                cy={c.y}
                r={hoverIdx === i ? 6 : 3}
                fill={hoverIdx === i ? colors.primary : colors.white}
                stroke={colors.primary}
                strokeWidth={2}
              />
            ))}

            {coords.map((c, i) => (
              <SvgText key={'lbl' + i} x={c.x} y={CHART_H - 6} textAnchor="middle" fontSize={10} fill={colors.textMuted}>
                {c.p.label}
              </SvgText>
            ))}
          </Svg>

          <View style={styles.chartTouchLayer}>
            {coords.map((c, i) => (
              <TouchableOpacity
                key={'hit' + i}
                accessibilityRole="button"
                accessibilityLabel={`${c.p.label}: ${metricPrefix(metric)}${metricValue(c.p, metric).toLocaleString()}`}
                onPressIn={() => setHoverIdx(i)}
                onPressOut={() => setHoverIdx(null)}
                style={[
                  styles.chartTouchPoint,
                  { left: `${(c.x / CHART_W) * 100}%`, top: `${(c.y / CHART_H) * 100}%` },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {hovered && !allZero && (
        <View style={styles.chartTooltip} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.chartTooltipValue}>
            {metricPrefix(metric)}{hoveredValue.toLocaleString()}
          </Text>
          <Text style={styles.chartTooltipDate}>{hovered.label}</Text>
        </View>
      )}

      <View style={styles.chartTableFallback} accessibilityRole="summary">
        <Text style={styles.chartTableTitle}>{t('seller.dashboard.chartDataTable')}</Text>
        {points.map((p, i) => (
          <Text key={i} style={styles.chartTableRow}>
            {p.label}: {metricPrefix(metric)}{metricValue(p, metric).toLocaleString()}
          </Text>
        ))}
      </View>
    </View>
  )
})

const ALERT_SEVERITY_STYLE = {
  error: { color: colors.error, bg: colors.errorLight },
  warning: { color: colors.warning, bg: colors.warningLight },
  info: { color: colors.info, bg: colors.infoLight },
  success: { color: colors.success, bg: colors.successLight },
} as const

const ALERT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'new-orders': Box,
  'low-stock': AlertTriangle,
  'out-of-stock': PackageX,
  'returns': RotateCcw,
  'messages': MessageCircle,
  'reviews': Star,
  'payout': Wallet,
  'kyc': ShieldAlert,
}

const ALERT_TITLE_KEY: Record<string, string> = {
  'new-orders': 'seller.dashboard.alertNewOrders',
  'low-stock': 'seller.dashboard.alertLowStock',
  'out-of-stock': 'seller.dashboard.alertOutOfStock',
  'returns': 'seller.dashboard.alertReturns',
  'messages': 'seller.dashboard.alertMessages',
  'reviews': 'seller.dashboard.alertReviews',
  'payout': 'seller.dashboard.alertPayout',
  'kyc': 'seller.dashboard.alertKyc',
}

function Alerts({ alerts, onRoute, t }: { alerts: SellerAlert[]; onRoute: (route: string) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { reducedMotion } = useA11y()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [slidingOut, setSlidingOut] = useState<string | null>(null)

  const visible = alerts.filter(a => !dismissed.has(a.id))
  const allCaughtUp = visible.length === 0

  const dismiss = useCallback((id: string) => {
    if (reducedMotion) {
      setDismissed(prev => new Set(prev).add(id))
      return
    }
    setSlidingOut(id)
    setTimeout(() => {
      setDismissed(prev => new Set(prev).add(id))
      setSlidingOut(null)
    }, 250)
  }, [reducedMotion])

  if (allCaughtUp) {
    return (
      <View style={styles.alertsCard}>
        <View style={styles.allCaughtUp}>
          <Animated.View style={styles.allCaughtUpIcon}>
            <CheckCircle2 size={40} color={colors.success} />
          </Animated.View>
          <Text style={styles.allCaughtUpTitle}>{t('seller.dashboard.alertAllCaughtUp')}</Text>
          <Text style={styles.allCaughtUpSub}>{t('seller.dashboard.alertAllCaughtUpSub')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.alertsCard}>
      {visible.map((a, idx) => {
        const sev = ALERT_SEVERITY_STYLE[a.severity]
        const Icon = ALERT_ICON_MAP[a.icon] ?? AlertTriangle
        const title = t(ALERT_TITLE_KEY[a.icon] ?? a.title)
        const isSlidingOut = slidingOut === a.id
        const ariaLabel = t('seller.dashboard.alertAria', { title, count: a.count })

        return (
          <Animated.View
            key={a.id}
            style={[
              styles.alertRowWrap,
              idx > 0 && styles.alertRowBorder,
              isSlidingOut && { opacity: reducedMotion ? 0 : 0, transform: [{ translateX: reducedMotion ? 0 : 300 }] },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={ariaLabel}
              onPress={() => onRoute(a.route)}
              style={styles.alertRowInner}
              activeOpacity={0.7}
            >
              <View style={[styles.alertIconBox, { backgroundColor: sev.bg }]}>
                <Icon size={24} color={sev.color} />
              </View>
              <Text style={styles.alertRowText} numberOfLines={2}>{title}</Text>
              <View style={[styles.alertCountBadge, { backgroundColor: sev.bg }]}>
                <Text style={[styles.alertCountText, { color: sev.color }]}>{a.count}</Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            {a.dismissible && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('seller.dashboard.alertDismiss')}
                onPress={() => dismiss(a.id)}
                hitSlop={8}
                style={styles.alertDismissBtn}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )
      })}
    </View>
  )
}

const ACTION_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  plus: Plus,
  box: Box,
  layers: Layers,
  wallet: Wallet,
  tag: Tag,
  settings: Settings,
}

const ACTION_LABEL_KEY: Record<string, string> = {
  'add-product': 'seller.dashboard.actionAddProduct',
  'orders': 'seller.dashboard.actionViewOrders',
  'promotions': 'seller.dashboard.actionCreatePromotion',
  'inventory': 'seller.dashboard.actionUpdateInventory',
  'payouts': 'seller.dashboard.actionViewPayouts',
  'settings': 'seller.dashboard.actionStoreSettings',
}

function QuickActions({ actions, onPress, t }: { actions: SellerQuickAction[]; onPress: (id: string) => void; t: (k: string) => string }) {
  const { reducedMotion } = useA11y()

  return (
    <View style={styles.quickActionsGrid}>
      {actions.map(a => {
        const Icon = ACTION_ICON[a.icon] ?? Plus
        const label = t(ACTION_LABEL_KEY[a.id] ?? a.label)
        return (
          <QuickActionTile
            key={a.id}
            icon={Icon}
            label={label}
            reducedMotion={reducedMotion}
            onPress={() => onPress(a.id)}
          />
        )
      })}
    </View>
  )
}

function QuickActionTile({
  icon: Icon,
  label,
  reducedMotion,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  reducedMotion: boolean
  onPress: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current
  const handlePressIn = () => {
    if (!reducedMotion) Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    if (!reducedMotion) Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start()
  }
  return (
    <Animated.View style={[styles.quickActionTileWrap, { transform: reducedMotion ? [] : [{ scale }] }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.quickActionBtn}
      >
        <View style={styles.quickActionIcon}>
          <Icon size={28} color={colors.primary} />
        </View>
        <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const ACTIVITY_ICON: Record<SellerActivityKind, { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string; bg: string }> = {
  order: { Icon: Box, color: colors.info, bg: colors.infoLight },
  review: { Icon: Star, color: colors.gold, bg: colors.warningLight },
  message: { Icon: MessageCircle, color: colors.primary, bg: colors.primary50 },
}

const ACTIVITY_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  new: { color: colors.info, bg: colors.infoLight },
  confirmed: { color: colors.info, bg: colors.infoLight },
  shipped: { color: colors.warning, bg: colors.warningLight },
  delivered: { color: colors.success, bg: colors.successLight },
  pending: { color: colors.warning, bg: colors.warningLight },
  positive: { color: colors.success, bg: colors.successLight },
  neutral: { color: colors.textMuted, bg: colors.borderLight },
}

const ACTIVITY_STATUS_KEY: Record<string, string> = {
  new: 'seller.dashboard.activityStatusNew',
  confirmed: 'seller.dashboard.activityStatusConfirmed',
  shipped: 'seller.dashboard.activityStatusShipped',
  delivered: 'seller.dashboard.activityStatusDelivered',
  pending: 'seller.dashboard.activityStatusPending',
  positive: 'seller.dashboard.activityStatusPositive',
  neutral: 'seller.dashboard.activityStatusNeutral',
}

const ACTIVITY_FILTERS: { key: 'all' | SellerActivityKind; labelKey: string }[] = [
  { key: 'all', labelKey: 'seller.dashboard.activityFilterAll' },
  { key: 'order', labelKey: 'seller.dashboard.activityFilterOrders' },
  { key: 'review', labelKey: 'seller.dashboard.activityFilterReviews' },
  { key: 'message', labelKey: 'seller.dashboard.activityFilterMessages' },
]

const ACTIVITY_SEE_ALL_ROUTE: Record<SellerActivityKind, string> = {
  order: '/orders',
  review: '/reviews',
  message: '/messages',
}

function RecentActivity({ items, loading, onRoute, lastViewed, t }: { items: SellerActivityItem[]; loading: boolean; onRoute: (route: string) => void; lastViewed: number; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { reducedMotion } = useA11y()
  const [filter, setFilter] = useState<'all' | SellerActivityKind>('all')

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp)
    if (filter === 'all') return sorted
    return sorted.filter(i => i.kind === filter)
  }, [items, filter])

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityFilterBar filter={filter} setFilter={setFilter} t={t} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.activityRowInner, i > 0 && styles.activityRowBorder]} aria-busy accessibilityLabel="Loading activity">
            <View style={styles.activitySkeletonIcon} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.activitySkeletonTitle} />
              <View style={styles.activitySkeletonSub} />
            </View>
            <View style={styles.activitySkeletonBadge} />
          </View>
        ))}
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.activityEmpty}>
          <Circle size={36} color={colors.textTertiary} />
          <Text style={styles.activityEmptyTitle}>{t('seller.dashboard.activityEmpty')}</Text>
          <Text style={styles.activityEmptySub}>{t('seller.dashboard.activityEmptySub')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <ActivityFilterBar filter={filter} setFilter={setFilter} t={t} />
      {filtered.length === 0 ? (
        <View style={styles.activityEmpty}>
          <Text style={styles.activityEmptyTitle}>{t('seller.dashboard.activityEmpty')}</Text>
        </View>
      ) : (
        filtered.map((item, i) => (
          <ActivityRow
            key={item.id}
            item={item}
            index={i}
            reducedMotion={reducedMotion}
            isNew={item.timestamp > lastViewed}
            onRoute={onRoute}
            t={t}
          />
        ))
      )}
    </View>
  )
}

function ActivityFilterBar({ filter, setFilter, t }: { filter: 'all' | SellerActivityKind; setFilter: (f: 'all' | SellerActivityKind) => void; t: (k: string) => string }) {
  return (
    <View style={styles.activityFilterBar} accessibilityRole="tablist">
      {ACTIVITY_FILTERS.map(f => {
        const active = f.key === filter
        return (
          <TouchableOpacity
            key={f.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => setFilter(f.key)}
            style={[styles.activityFilterPill, active && styles.activityFilterPillActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.activityFilterText, active && styles.activityFilterTextActive]}>
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function ActivityRow({ item, index, reducedMotion, isNew, onRoute, t }: { item: SellerActivityItem; index: number; reducedMotion: boolean; isNew: boolean; onRoute: (route: string) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const { Icon, color, bg } = ACTIVITY_ICON[item.kind]
  const highlightAnim = useRef(new Animated.Value(isNew && !reducedMotion ? 1 : 0)).current

  useEffect(() => {
    if (isNew && !reducedMotion) {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: false,
      }).start()
    }
  }, [isNew, reducedMotion, highlightAnim])

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primary + '14'],
  })

  const statusLabel = item.status ? t(ACTIVITY_STATUS_KEY[item.status] ?? item.status) : undefined
  const statusStyle = item.status ? ACTIVITY_STATUS_STYLE[item.status] : undefined
  const ariaLabel = t('seller.dashboard.activityAria', {
    title: item.title,
    subtitle: item.subtitle,
    status: statusLabel ?? '',
    at: item.at,
  })

  return (
    <Animated.View style={[styles.activityRowWrap, index > 0 && styles.activityRowBorder, { backgroundColor: highlightBg }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        onPress={() => onRoute(item.route)}
        style={styles.activityRowInner}
        activeOpacity={0.7}
      >
        <View style={[styles.activityIcon, { backgroundColor: bg }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={styles.activityBody}>
          <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        {statusLabel && statusStyle && (
          <View style={[styles.activityStatusPill, { backgroundColor: statusStyle.bg }]} accessibilityLabel={statusLabel}>
            <Text style={[styles.activityStatusText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        )}
        {item.amount && (
          <Text style={styles.activityAmount}>{item.amount}</Text>
        )}
        <ChevronRight size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  )
}

function StaggerSection({ children, index, reducedMotion }: { children: React.ReactNode; index: number; reducedMotion: boolean }) {
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current
  useEffect(() => {
    if (reducedMotion) return
    const delay = index * 50
    const timer = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        damping: 20,
        stiffness: 300,
        mass: 0.8,
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [index, reducedMotion, anim])
  const style = reducedMotion
    ? null
    : {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }
  return <Animated.View style={style}>{children}</Animated.View>
}

function DashboardSkeleton({ t }: { t: (k: string) => string }) {
  return (
    <View style={styles.sections} aria-busy accessibilityLabel={t('seller.dashboard.loadingDashboard')}>
      <View>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonKpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonKpiCard}>
              <View style={styles.skeletonBlock} />
              <View style={styles.skeletonBlockWide} />
              <View style={styles.skeletonBlockNarrow} />
            </View>
          ))}
        </View>
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonChartCard} />
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={[styles.skeletonAlertRow, i > 0 && styles.skeletonRowBorder]} />
        ))}
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonQuickRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonQuickTile} />
          ))}
        </View>
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonActivityRow, i > 0 && styles.skeletonRowBorder]} />
        ))}
      </View>
    </View>
  )
}

function FirstRunEmpty({ onAddProduct, t, reducedMotion }: { onAddProduct: () => void; t: (k: string) => string; reducedMotion: boolean }) {
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.8)).current
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current
  useEffect(() => {
    if (reducedMotion) return
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 200, mass: 0.8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [reducedMotion, scale, opacity])
  return (
    <Animated.View style={[styles.firstRunCard, { opacity, transform: [{ scale }] }]} accessibilityRole="summary" accessibilityLabel={t('seller.dashboard.firstRunTitle')}>
      <View style={styles.firstRunIllustration}>
        <View style={styles.firstRunCircle}>
          <Plus size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.firstRunTitle}>{t('seller.dashboard.firstRunTitle')}</Text>
      <Text style={styles.firstRunSubtitle}>{t('seller.dashboard.firstRunSubtitle')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('seller.dashboard.firstRunCtaAria')}
        onPress={onAddProduct}
        style={styles.firstRunCta}
        activeOpacity={0.9}
      >
        <Text style={styles.firstRunCtaText}>{t('seller.dashboard.firstRunCta')}</Text>
      </TouchableOpacity>

      <View style={styles.firstRunZeroKpis}>
        {['NPR 0', '0', '0', 'NPR 0', '0%', 'NPR 0'].map((v, i) => (
          <View key={i} style={styles.firstRunZeroKpi}>
            <Text style={styles.firstRunZeroValue}>{v}</Text>
            <Text style={styles.firstRunZeroDelta}>—</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  )
}

function DashboardErrorState({ onRetry, t, reducedMotion }: { onRetry: () => void; t: (k: string) => string; reducedMotion: boolean }) {
  return (
    <View style={styles.errorCard} accessibilityRole="alert" accessibilityLabel={t('seller.dashboard.errorTitle')}>
      <View style={styles.errorIcon}>
        <XCircle size={40} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>{t('seller.dashboard.errorTitle')}</Text>
      <Text style={styles.errorSubtitle}>{t('seller.dashboard.errorSubtitle')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('seller.dashboard.errorRetryAria')}
        onPress={onRetry}
        style={styles.errorRetryBtn}
        activeOpacity={0.9}
      >
        <Text style={styles.errorRetryText}>{t('seller.dashboard.errorRetry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function CustomRangeSheet({
  onClose,
  onApply,
  start,
  end,
  onChange,
}: {
  onClose: () => void
  onApply: () => void
  start?: string
  end?: string
  onChange: (r: { start: string; end: string }) => void
}) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const s = start ?? today
  const e = end ?? today
  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t('seller.dashboard.rangeCustomTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.sheetFields}>
          <View style={styles.sheetField}>
            <Text style={styles.sheetFieldLabel}>{t('seller.dashboard.rangeStart')}</Text>
            <TextInputLike value={s} onChange={v => onChange({ start: v, end: e })} />
          </View>
          <View style={styles.sheetField}>
            <Text style={styles.sheetFieldLabel}>{t('seller.dashboard.rangeEnd')}</Text>
            <TextInputLike value={e} onChange={v => onChange({ start: s, end: v })} />
          </View>
        </View>
        <TouchableOpacity style={styles.sheetApplyBtn} onPress={onApply} accessibilityRole="button">
          <Text style={styles.sheetApplyText}>{t('seller.dashboard.rangeApply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function TextInputLike({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.dateInput}>
      <Text style={styles.dateInputText}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing[4], gap: spacing[2] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  topBarLogo: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLogoDot: { width: 12, height: 12, borderRadius: radii.full, backgroundColor: colors.primary },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  topBarIconBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },
  header: { gap: spacing[3], marginBottom: spacing[2] },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] },
  headerText: { flex: 1, gap: 2 },
  greeting: { fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  dateLine: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: radii.full },
  statusText: { fontSize: 12, fontWeight: '600' },
  rangeTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: spacing[0.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignSelf: 'flex-start',
  },
  rangeSegment: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  rangeSegmentActive: { backgroundColor: colors.primary },
  rangeLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  rangeLabelActive: { color: colors.white },
  sections: { gap: spacing[2] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    marginBottom: spacing[1],
    paddingHorizontal: spacing[1],
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  seeAllLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  goLiveTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  goLiveSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing[3] },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: radii.full },
  goLiveProgress: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[3] },
  checklistRows: { gap: spacing[2.5] },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  checklistLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  checklistLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  goLiveContinueBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginTop: spacing[4],
  },
  goLiveContinueText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  kpiCard: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: 6,
  },
  kpiLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  kpiValue: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  kpiPeriod: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  kpiDelta: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  kpiVsPrev: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  sparklineContainer: { marginVertical: 2 },
  sparklineTrack: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' },
  skeletonLabel: { width: 80, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonValue: { width: 120, height: 28, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 4 },
  skeletonSpark: { width: '100%', height: 32, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 4 },
  skeletonPeriod: { width: 70, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 4 },
  skeletonDelta: { width: 90, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 4 },
  chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3], flexWrap: 'wrap', gap: spacing[2] },
  chartTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  chartToggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 2,
  },
  chartTogglePill: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full },
  chartTogglePillActive: { backgroundColor: colors.primary },
  chartToggleText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chartToggleTextActive: { color: colors.white },
  chartEmpty: {
    height: CHART_H,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  chartEmptyText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chartEmptySub: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1], textAlign: 'center' },
  chartTouchLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H },
  chartTouchPoint: { position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14 },
  chartTooltip: {
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chartTooltipValue: { fontSize: 12, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  chartTooltipDate: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  chartTableFallback: { marginTop: spacing[3] },
  chartTableTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[1] },
  chartTableRow: { fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'], marginTop: 1 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginBottom: spacing[3],
  },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  offlineText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  skeletonSectionTitle: { width: 120, height: 18, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginBottom: spacing[3] },
  skeletonKpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  skeletonKpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  skeletonBlock: { width: 80, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonBlockWide: { width: 120, height: 28, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonBlockNarrow: { width: 60, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonChartCard: { height: 220, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.shimmer },
  skeletonAlertRow: { height: 56, paddingHorizontal: spacing[4], backgroundColor: colors.shimmer, borderRadius: radii.lg, marginTop: spacing[2] },
  skeletonQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  skeletonQuickTile: { width: '48%', flexGrow: 1, height: 90, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.shimmer },
  skeletonActivityRow: { height: 56, paddingHorizontal: spacing[3], backgroundColor: colors.shimmer, borderRadius: radii.lg, marginTop: spacing[2] },
  skeletonRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  firstRunCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  firstRunIllustration: { marginBottom: spacing[2] },
  firstRunCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstRunTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  firstRunSubtitle: { fontSize: 14, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  firstRunCta: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    marginTop: spacing[2],
  },
  firstRunCtaText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  firstRunZeroKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4], width: '100%' },
  firstRunZeroKpi: {
    width: '31%',
    flexGrow: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    alignItems: 'center',
    gap: 2,
  },
  firstRunZeroValue: { fontSize: 16, fontWeight: '700', color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  firstRunZeroDelta: { fontSize: 12, fontWeight: '600', color: colors.textTertiary },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  errorIcon: { marginBottom: spacing[1] },
  errorTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  errorRetryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    marginTop: spacing[2],
  },
  errorRetryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  alertsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  alertRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing[4],
  },
  alertRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  alertRowInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertRowText: { flex: 1, fontSize: 16, fontWeight: '400', color: colors.text, lineHeight: 22 },
  alertCountBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
    flexShrink: 0,
  },
  alertCountText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  alertDismissBtn: { paddingHorizontal: spacing[2], paddingVertical: spacing[2] },
  allCaughtUp: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[8], gap: spacing[2] },
  allCaughtUpIcon: { marginBottom: spacing[1] },
  allCaughtUpTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  allCaughtUpSub: { fontSize: 12, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  quickActionTileWrap: { width: '48%', flexGrow: 1 },
  quickActionBtn: {
    alignItems: 'center',
    gap: spacing[2.5],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing[4],
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  activityRowWrap: { minHeight: 56, paddingHorizontal: spacing[3] },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  activityRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2.5] },
  activityIcon: { width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityBody: { flex: 1, gap: 1, minWidth: 0 },
  activityTitle: { fontSize: 16, fontWeight: '400', color: colors.text, lineHeight: 22 },
  activitySubtitle: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  activityStatusPill: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5], borderRadius: radii.full, flexShrink: 0 },
  activityStatusText: { fontSize: 12, fontWeight: '600' },
  activityAmount: { fontSize: 12, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 0 },
  activityFilterBar: { flexDirection: 'row', gap: spacing[1.5], padding: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight, marginBottom: spacing[1] },
  activityFilterPill: { paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radii.full, backgroundColor: colors.background },
  activityFilterPillActive: { backgroundColor: colors.primary },
  activityFilterText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  activityFilterTextActive: { color: colors.white },
  activityEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[6], gap: spacing[2] },
  activityEmptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  activityEmptySub: { fontSize: 12, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  activitySkeletonIcon: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.shimmer },
  activitySkeletonTitle: { width: 140, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  activitySkeletonSub: { width: 100, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  activitySkeletonBadge: { width: 50, height: 20, borderRadius: radii.full, backgroundColor: colors.shimmer },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[3] },
  sheetOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay, justifyContent: 'flex-end', zIndex: 40 },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sheetFields: { flexDirection: 'row', gap: spacing[3] },
  sheetField: { flex: 1, gap: 4 },
  sheetFieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  dateInputText: { fontSize: 14, color: colors.text },
  sheetApplyBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  sheetApplyText: { color: colors.white, fontWeight: '700', fontSize: 14 },
})
