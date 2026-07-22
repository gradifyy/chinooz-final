import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { Box, ChevronRight, Circle, MessageCircle, Star } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import type { SellerActivityItem, SellerActivityKind } from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { styles } from './styles'

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

function ActivityFilterBar({
  filter,
  setFilter,
  t,
}: {
  filter: 'all' | SellerActivityKind
  setFilter: (f: 'all' | SellerActivityKind) => void
  t: (k: string) => string
}) {
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

function ActivityRow({
  item,
  index,
  reducedMotion,
  isNew,
  onRoute,
  t,
}: {
  item: SellerActivityItem
  index: number
  reducedMotion: boolean
  isNew: boolean
  onRoute: (route: string) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
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

export function RecentActivity({
  items,
  loading,
  onRoute,
  lastViewed,
  t,
}: {
  items: SellerActivityItem[]
  loading: boolean
  onRoute: (route: string) => void
  lastViewed: number
  t: (k: string, o?: Record<string, unknown>) => string
}) {
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
          <View key={i} style={[styles.activityRowInner, i > 0 && styles.activityRowBorder]} aria-busy accessibilityLabel={t('seller.dashboard.loadingActivity')}>
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
