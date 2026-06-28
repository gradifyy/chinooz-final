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
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import {
  getSellerDashboardMetrics,
  SELLER_GO_LIVE_TASKS,
  type SellerDateRange,
  type SellerDateRangeKey,
  type SellerKpi,
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
  const [refreshing, setRefreshing] = useState(false)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  const range: SellerDateRange = useMemo(() => {
    const days = rangeKey === 'today' ? 1 : rangeKey === '7d' ? 7 : 30
    return {
      key: rangeKey,
      label: dateLabel(rangeKey, t),
      days,
      custom: rangeKey === 'custom' ? customRange ?? undefined : undefined,
    }
  }, [rangeKey, customRange, t])

  const metrics = useMemo(() => getSellerDashboardMetrics(range), [range])

  useEffect(() => {
    analytics.screen({ name: 'seller-dashboard' })
  }, [])

  const goLiveTasks: GoLiveTask[] = SELLER_GO_LIVE_TASKS
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
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 900)
  }, [])

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
          {!goLiveComplete && <GoLiveChecklist tasks={goLiveTasks} done={goLiveDone} total={goLiveTasks.length} onContinue={() => router.push('/onboarding')} />}

          <View style={styles.sections}>
            <SectionHeader title={t('seller.dashboard.sectionKpis')} />
            <KpiCards kpis={metrics.kpis} loading={refreshing} onPress={(kpi) => router.push(kpi.route as any)} t={t} />

            <SectionHeader title={t('seller.dashboard.sectionSales')} />
            <SalesChart points={metrics.chart} />

            <SectionHeader title={t('seller.dashboard.sectionAlerts')} seeAllLabel={t('seller.dashboard.seeAll')} onSeeAll={() => router.push('/reviews')} />
            <Alerts alerts={metrics.alerts} onCtaPress={(id) => {
              if (id === 'reviews-needing-response') router.push('/reviews')
            }} />

            <SectionHeader title={t('seller.dashboard.sectionQuickActions')} />
            <QuickActions
              actions={metrics.quickActions}
              onPress={id => {
                const action = metrics.quickActions.find(a => a.id === id)
                if (action?.href) router.push(action.href as any)
              }}
            />

            <SectionHeader title={t('seller.dashboard.sectionActivity')} seeAllLabel={t('seller.dashboard.seeAll')} onSeeAll={() => router.push('/analytics')} />
            <RecentActivity items={metrics.activity} />
          </View>
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

function KpiCard({ kpi, onPress, width, t }: { kpi: SellerKpi; onPress: (kpi: SellerKpi) => void; width: number; t: (k: string, o?: Record<string, unknown>) => string }) {
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
}

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

function SalesChart({ points }: { points: { label: string; value: number }[] }) {
  const { reducedMotion } = useA11y()
  const max = Math.max(...points.map(p => p.value), 1)
  return (
    <View style={styles.card}>
      <View style={styles.chartArea}>
        {points.map((p, i) => {
          const h = Math.max(8, (p.value / max) * 100)
          return (
            <View key={p.label + i} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                <View
                  style={[styles.chartBar, { height: reducedMotion ? h : h, backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={styles.chartLabel}>{p.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const ALERT_ICON = {
  warning: { Icon: AlertTriangle, color: colors.warning },
  error: { Icon: XCircle, color: colors.error },
  info: { Icon: Info, color: colors.info },
} as const

function Alerts({ alerts, onCtaPress }: { alerts: { id: string; severity: 'warning' | 'error' | 'info'; title: string; body: string; cta?: string }[]; onCtaPress?: (id: string) => void }) {
  const { t } = useTranslation()
  if (alerts.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>{t('seller.dashboard.noAlerts')}</Text>
      </View>
    )
  }
  return (
    <View style={styles.alertsStack}>
      {alerts.map(a => {
        const { Icon, color } = ALERT_ICON[a.severity]
        return (
          <View key={a.id} style={[styles.card, styles.alertCard, { borderLeftColor: color }]}>
            <View style={styles.alertRow}>
              <Icon size={20} color={color} />
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertText}>{a.body}</Text>
                {a.cta && (
                  <TouchableOpacity
                    hitSlop={8}
                    accessibilityRole="button"
                    onPress={() => onCtaPress?.(a.id)}
                  >
                    <Text style={styles.alertCta}>{a.cta}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
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
}

function QuickActions({ actions, onPress }: { actions: { id: string; label: string; icon: string }[]; onPress: (id: string) => void }) {
  return (
    <View style={styles.quickActionsRow}>
      {actions.map(a => {
        const Icon = ACTION_ICON[a.icon] ?? Plus
        return (
          <TouchableOpacity
            key={a.id}
            style={styles.quickActionBtn}
            onPress={() => onPress(a.id)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionIcon}>
              <Icon size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{a.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const ACTIVITY_ICON = {
  order: { Icon: Box, color: colors.info },
  review: { Icon: CheckCircle2, color: colors.success },
  payout: { Icon: Wallet, color: colors.primary },
  stock: { Icon: Layers, color: colors.warning },
  follower: { Icon: TrendingUp, color: colors.info },
} as const

function RecentActivity({ items }: { items: { id: string; kind: 'order' | 'review' | 'payout' | 'stock' | 'follower'; title: string; subtitle: string; at: string }[] }) {
  const { t } = useTranslation()
  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>{t('seller.dashboard.noActivity')}</Text>
      </View>
    )
  }
  return (
    <View style={styles.card}>
      {items.map((item, i) => {
        const { Icon, color } = ACTIVITY_ICON[item.kind]
        return (
          <View key={item.id} style={[styles.activityRow, i > 0 && styles.activityRowBorder]}>
            <View style={[styles.activityIcon, { backgroundColor: color + '14' }]}>
              <Icon size={18} color={color} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.activityAt}>{item.at}</Text>
          </View>
        )
      })}
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
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: spacing[2] },
  chartBarCol: { flex: 1, alignItems: 'center', gap: spacing[1.5], height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '60%', borderRadius: radii.sm, minHeight: 8 },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  alertsStack: { gap: spacing[2] },
  alertCard: { borderLeftWidth: 3 },
  alertRow: { flexDirection: 'row', gap: spacing[2.5] },
  alertBody: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  alertText: { fontSize: 13, color: colors.textMuted },
  alertCta: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4 },
  quickActionsRow: { flexDirection: 'row', gap: spacing[2] },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing[3.5],
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2.5] },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  activityIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1, gap: 2 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  activitySubtitle: { fontSize: 12, color: colors.textMuted },
  activityAt: { fontSize: 11, color: colors.textTertiary },
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
