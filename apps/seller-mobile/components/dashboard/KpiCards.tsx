import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import { colors, spacing } from '../../lib/theme'
import type { SellerKpi } from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { styles } from './styles'

function useCountUp(target: number, enabled: boolean, durationMs = 320): number {
  const [value, setValue] = useState(enabled ? 0 : target)
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

/** Build a smooth (catmull-ish) line + closed area path for a sparkline. */
function buildSpark(data: number[], w: number, h: number, pad: number) {
  const safe = data.length ? data : [0, 0]
  const max = Math.max(...safe)
  const min = Math.min(...safe)
  const range = max - min || 1
  const n = safe.length
  const pts = safe.map((v, i) => ({
    x: n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / range) * (h - pad * 2),
  }))
  let line = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev.x + curr.x) / 2
    line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`
  return { line, area, last: pts[pts.length - 1] }
}

/** Elegant area+line mini chart. `light` = white-on-gradient hero variant. */
function MiniSpark({ data, light = false }: { data: number[]; light?: boolean }) {
  const W = light ? 300 : 150
  const H = light ? 64 : 26
  const pad = light ? 6 : 3
  const { line, area, last } = buildSpark(data, W, H, pad)
  const stroke = light ? 'rgba(255,255,255,0.96)' : colors.primary
  const gradId = light ? 'sparkHero' : 'sparkGrid'

  return (
    <View
      style={light ? styles.kpiFeaturedChart : styles.kpiSparkChart}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={light ? 0.3 : 0.16} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Path d={area} fill={`url(#${gradId})`} />
        <Path d={line} fill="none" stroke={stroke} strokeWidth={light ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
        <SvgCircle cx={last.x} cy={last.y} r={light ? 3.5 : 2.5} fill={light ? colors.white : colors.primary} />
      </Svg>
    </View>
  )
}

function trendMeta(kpi: SellerKpi, t: (k: string, o?: Record<string, unknown>) => string) {
  const direction =
    kpi.trend === 'up'
      ? t('seller.dashboard.kpiUp')
      : kpi.trend === 'down'
        ? t('seller.dashboard.kpiDown')
        : t('seller.dashboard.kpiFlat')
  const ariaLabel = t('seller.dashboard.kpiAria', {
    label: kpi.label,
    value: kpi.value,
    direction,
    delta: Math.abs(kpi.deltaPct),
    period: kpi.period,
  })
  const Icon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const deltaText = `${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct}%`
  return { ariaLabel, Icon, deltaText }
}

const FeaturedKpiCard = React.memo(function FeaturedKpiCard({
  kpi,
  onPress,
  t,
}: {
  kpi: SellerKpi
  onPress: (kpi: SellerKpi) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { reducedMotion } = useA11y()
  const scale = useRef(new Animated.Value(1)).current
  const animatedValue = useCountUp(kpi.numericValue, !reducedMotion)
  const displayValue = formatValue(kpi, animatedValue)
  const { ariaLabel, Icon, deltaText } = trendMeta(kpi, t)

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        activeOpacity={0.92}
        onPress={() => onPress(kpi)}
        onPressIn={() => Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        style={styles.kpiFeaturedCard}
      >
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Almost-invisible depth — a soft diagonal light-catch, no blobs. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.kpiFeaturedLabel}>{kpi.label}</Text>
        <Text style={styles.kpiFeaturedValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {displayValue}
        </Text>
        <View style={styles.kpiFeaturedMetaRow}>
          <View style={styles.kpiFeaturedDeltaPill}>
            <Icon size={13} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.kpiFeaturedDeltaText}>{deltaText}</Text>
          </View>
          <Text style={styles.kpiFeaturedPeriod}>
            {kpi.period} · {t('seller.dashboard.kpiVsPrev')}
          </Text>
        </View>
        <MiniSpark data={kpi.sparkline} light />
      </TouchableOpacity>
    </Animated.View>
  )
})

const KpiCard = React.memo(function KpiCard({
  kpi,
  onPress,
  width,
  t,
}: {
  kpi: SellerKpi
  onPress: (kpi: SellerKpi) => void
  width: number
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { reducedMotion } = useA11y()
  const scale = useRef(new Animated.Value(1)).current
  const animatedValue = useCountUp(kpi.numericValue, !reducedMotion)
  const displayValue = formatValue(kpi, animatedValue)
  const { ariaLabel, Icon, deltaText } = trendMeta(kpi, t)

  const valueColor = kpi.accent === 'plum' ? colors.primary : colors.text
  const trendColor = kpi.trend === 'up' ? colors.success : kpi.trend === 'down' ? colors.error : colors.textMuted
  const trendBg = kpi.trend === 'up' ? colors.successLight : kpi.trend === 'down' ? colors.errorLight : colors.borderLight

  return (
    <Animated.View style={{ width, flexGrow: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        onPress={() => onPress(kpi)}
        onPressIn={() => Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        activeOpacity={0.95}
        style={styles.kpiCard}
      >
        <Text style={styles.kpiLabel}>{kpi.label}</Text>
        <Text style={[styles.kpiValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {displayValue}
        </Text>
        <MiniSpark data={kpi.sparkline} />
        <View style={styles.kpiDeltaRow}>
          <View style={[styles.kpiDeltaPill, { backgroundColor: trendBg }]}>
            <Icon size={11} color={trendColor} strokeWidth={2.5} />
            <Text style={[styles.kpiDeltaPillText, { color: trendColor }]}>{deltaText}</Text>
          </View>
          <Text style={styles.kpiPeriod}>{kpi.period}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
})

function KpiCardSkeleton({ width }: { width: number }) {
  const { t } = useTranslation()
  return (
    <View style={[styles.kpiCard, { width, flexGrow: 1 }]} accessibilityRole="text" accessibilityLabel={t('seller.analytics.loadingMetric')} aria-busy>
      <View style={styles.skeletonLabel} />
      <View style={styles.skeletonValue} />
      <View style={styles.skeletonSpark} />
      <View style={styles.skeletonDelta} />
    </View>
  )
}

export function KpiCards({
  kpis,
  loading,
  onPress,
  t,
}: {
  kpis: SellerKpi[]
  loading: boolean
  onPress: (kpi: SellerKpi) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { width } = useWindowDimensions()
  const columns = width >= 768 ? 3 : 2
  const cardWidth = (width - spacing[5] * 2 - spacing[3] * (columns - 1)) / columns

  if (loading) {
    return (
      <View style={{ gap: spacing[2] }}>
        <View style={[styles.kpiFeaturedCard, { backgroundColor: colors.shimmer, height: 168 }]} />
        <View style={[styles.kpiGrid, { gap: spacing[3] }]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      </View>
    )
  }

  const [featured, ...rest] = kpis

  return (
    <View>
      {featured && <FeaturedKpiCard kpi={featured} onPress={onPress} t={t} />}
      {rest.length > 0 && (
        <View style={[styles.kpiGrid, { gap: spacing[3] }]}>
          {rest.map(kpi => (
            <KpiCard key={kpi.key} kpi={kpi} onPress={onPress} width={cardWidth} t={t} />
          ))}
        </View>
      )}
    </View>
  )
}
