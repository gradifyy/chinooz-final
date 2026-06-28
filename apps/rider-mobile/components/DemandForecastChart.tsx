import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg'
import { Flame, Zap, Clock, Sun, TrendingUp } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'
import { type DemandForecast } from '@chinooz/mock-data'

/**
 * RD4 — Demand forecast / peak timeline.
 *
 * An hourly demand bar chart (6am-11pm) with peak windows highlighted
 * (lunch/dinner), a "next peak in X" indicator, a plan-your-day hint, and
 * a surge tie-in to RI5. Reuses the SVG chart pattern from EarningsChart.
 *
 * Accessibility:
 *  - The chart has an accessible summary (aria-label) describing peak count,
 *    next peak, surge, and the plan hint.
 *  - A data-table fallback (collapsible) renders the same data tabularly so
 *    the chart is not the only way in.
 *  - Peak windows + next-peak are announced (not color-only): each bar's
 *    aria-label includes the demand value + peak/surge status.
 *  - The hint is readable text.
 */

interface DemandForecastChartProps {
  forecast: DemandForecast
  labels: {
    title: string
    sub: string
    nextPeak: (time: string) => string
    nextPeakNow: (label: string) => string
    nextPeakLabel: (label: string, hour: string) => string
    noPeak: string
    planHint: (hint: string) => string
    surgeTie: (mult: number, zone: string) => string
    lunch: string
    dinner: string
    ariaSummary: (p: {
      peakCount: number
      peaks: string
      nextPeak: string
      surge: string
      plan: string
    }) => string
    dataTableTitle: string
    dataTableHour: string
    dataTableDemand: string
    dataTablePeak: string
    dataTableSurge: string
    barAria: (label: string, demand: number, peak: string, surge: string) => string
    hoursShort: (hours: number, minutes: number) => string
    minutesShort: (minutes: number) => string
  }
}

const CHART_W = 340
const CHART_H = 160
const PAD_L = 4
const PAD_R = 4
const PAD_T = 16
const PAD_B = 24
const BAR_GAP = 2

/** Bar fill per demand band (on-brand, not garish). */
function barFill(demand: number, isPeak: boolean): string {
  if (isPeak) return colors.primary
  if (demand >= 60) return colors.primaryLight
  if (demand >= 40) return colors.gold
  return colors.primary50
}

export default function DemandForecastChart({
  forecast,
  labels,
}: DemandForecastChartProps) {
  const [showTable, setShowTable] = useState(false)

  const hours = forecast.hours
  const maxDemand = 100

  const nextPeakText = forecast.nextPeak
    ? forecast.nextPeak.minutesUntil <= 0
      ? labels.nextPeakNow(forecast.nextPeak.label)
      : labels.nextPeak(
          forecast.nextPeak.minutesUntil >= 60
            ? labels.hoursShort(
                Math.floor(forecast.nextPeak.minutesUntil / 60),
                forecast.nextPeak.minutesUntil % 60,
              )
            : labels.minutesShort(forecast.nextPeak.minutesUntil),
        )
    : labels.noPeak

  const surgeText = labels.surgeTie(forecast.surge.multiplier, forecast.surge.zoneLabel)

  const ariaSummary = labels.ariaSummary({
    peakCount: forecast.peaks.length,
    peaks: forecast.peaks.map(p => `${p.label} ${p.startHour}:00-${p.endHour}:00`).join(', '),
    nextPeak: nextPeakText,
    surge: surgeText,
    plan: forecast.planHint,
  })

  // Chart geometry
  const innerW = CHART_W - PAD_L - PAD_R
  const innerH = CHART_H - PAD_T - PAD_B
  const barW = (innerW - BAR_GAP * (hours.length - 1)) / hours.length

  const toggleTable = () => {
    setShowTable(prev => !prev)
    try {
      AccessibilityInfo.announceForAccessibility(
        showTable ? labels.dataTableTitle : labels.dataTableTitle,
      )
    } catch {}
  }

  return (
    <View style={styles.wrap} testID="demand-forecast">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.sub}>{labels.sub}</Text>
        </View>
        <Flame size={20} color={colors.primary} />
      </View>

      {/* Next-peak indicator + surge tie-in */}
      <View style={styles.indicatorRow}>
        <View style={styles.nextPeakChip}>
          <Clock size={14} color={colors.primary} />
          <Text style={styles.nextPeakText}>{nextPeakText}</Text>
        </View>
        <View style={styles.surgeChip}>
          <Zap size={13} color={colors.gold} fill={colors.gold} />
          <Text style={styles.surgeChipText}>{surgeText}</Text>
        </View>
      </View>

      {/* Chart (SVG, tabular figures, lightweight) */}
      <View
        accessibilityRole="image"
        accessibilityLabel={ariaSummary}
        style={styles.chartWrap}
      >
        <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          {/* Peak window background bands */}
          {forecast.peaks.map(peak => {
            const startIdx = hours.findIndex(h => h.hour === peak.startHour)
            const endIdx = hours.findIndex(h => h.hour === peak.endHour - 1)
            if (startIdx < 0 || endIdx < 0) return null
            const x = PAD_L + startIdx * (barW + BAR_GAP) - BAR_GAP / 2
            const w = (endIdx - startIdx + 1) * (barW + BAR_GAP) + BAR_GAP
            return (
              <Rect
                key={`peak-${peak.label}`}
                x={x}
                y={PAD_T - 4}
                width={w}
                height={innerH + 8}
                fill={colors.primary}
                fillOpacity={0.06}
                rx={4}
              />
            )
          })}

          {/* Bars */}
          {hours.map((h, i) => {
            const x = PAD_L + i * (barW + BAR_GAP)
            const barH = (h.demand / maxDemand) * innerH
            const y = PAD_T + innerH - barH
            const fill = barFill(h.demand, h.isPeak)
            const peakStr = h.isPeak ? ` Peak ${h.peakLabel}.` : ''
            const surgeStr = h.hasScheduledSurge ? ` Surge ${h.surgeMultiplier}x.` : ''
            return (
              <G key={`bar-${h.hour}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={fill}
                  rx={2}
                  accessible
                  accessibilityLabel={labels.barAria(h.label, h.demand, peakStr, surgeStr)}
                />
                {h.hasScheduledSurge ? (
                  <Rect
                    x={x}
                    y={y - 3}
                    width={barW}
                    height={2}
                    fill={colors.gold}
                    rx={1}
                  />
                ) : null}
              </G>
            )
          })}

          {/* Hour labels (every 3rd hour for tabular axis) */}
          {hours.map((h, i) => {
            if (i % 3 !== 0 && i !== hours.length - 1) return null
            const x = PAD_L + i * (barW + BAR_GAP) + barW / 2
            return (
              <SvgText
                key={`label-${h.hour}`}
                x={x}
                y={CHART_H - 6}
                fontSize={9}
                fontFamily={fontFamily.sans[0]}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                {h.label}
              </SvgText>
            )
          })}

          {/* Baseline */}
          <Line
            x1={PAD_L}
            y1={PAD_T + innerH}
            x2={CHART_W - PAD_R}
            y2={PAD_T + innerH}
            stroke={colors.borderLight}
            strokeWidth={1}
          />
        </Svg>
      </View>

      {/* Peak legend (labeled, not color-only) */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>{labels.lunch} / {labels.dinner}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendLabel}>Surge</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary50 }]} />
          <Text style={styles.legendLabel}>Low</Text>
        </View>
      </View>

      {/* Plan-your-day hint */}
      <View style={styles.hintRow}>
        <Sun size={15} color={colors.gold} />
        <Text style={styles.hintText}>{labels.planHint(forecast.planHint)}</Text>
      </View>

      {/* Data-table fallback toggle */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={labels.dataTableTitle}
        onPress={toggleTable}
        style={styles.tableToggle}
      >
        <TrendingUp size={14} color={colors.primary} />
        <Text style={styles.tableToggleText}>{labels.dataTableTitle}</Text>
      </TouchableOpacity>

      {/* Data table (collapsible fallback — the chart is not the only way in) */}
      {showTable ? (
        <View style={styles.dataTable} testID="forecast-data-table">
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>{labels.dataTableHour}</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>{labels.dataTableDemand}</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>{labels.dataTablePeak}</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>{labels.dataTableSurge}</Text>
          </View>
          {hours.map(h => (
            <View key={`row-${h.hour}`} style={styles.tableRow}>
              <Text style={styles.tableCell}>{h.label}</Text>
              <Text style={styles.tableCell}>{h.demand}/100</Text>
              <Text style={styles.tableCell}>{h.isPeak ? h.peakLabel : '—'}</Text>
              <Text style={styles.tableCell}>{h.hasScheduledSurge ? `${h.surgeMultiplier}x` : '—'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2.5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  sub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  nextPeakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
  },
  nextPeakText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.primary,
  },
  surgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
  },
  surgeChipText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
  chartWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: radii.sm,
  },
  legendLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  hintText: {
    flex: 1,
    fontSize: fontSize.base[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  tableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    paddingVertical: spacing[1],
  },
  tableToggleText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  dataTable: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableHeader: {
    backgroundColor: colors.background,
  },
  tableCell: {
    flex: 1,
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  tableHeaderCell: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
})
