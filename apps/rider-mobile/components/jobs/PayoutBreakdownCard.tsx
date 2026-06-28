import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Receipt, Navigation, Star } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { formatNprTabular } from './format'

/**
 * Transparent payout breakdown for the Job Detail screen (RJ4).
 *
 * The mock `RiderJob.payout` is a flat total. We derive a transparent
 * three-line breakdown so the rider sees exactly how the payout is composed:
 *   base      = flat minimum fare (Rs 60)
 *   distance  = per-km rate × trip distance (Rs 15/km, rounded)
 *   bonus     = remainder (surge / incentive / tip), may be 0
 *
 * The sum always equals the total payout. NPR tabular-nums for alignment.
 */

export interface PayoutBreakdown {
  base: number
  distance: number
  bonus: number
  total: number
}

/** Derive a transparent breakdown from a total payout + trip distance. */
export function derivePayoutBreakdown(totalPayout: number, tripDistanceKm: number): PayoutBreakdown {
  const BASE_FARE = 60
  const PER_KM = 15
  const distance = Math.round(PER_KM * tripDistanceKm)
  const base = BASE_FARE
  const bonus = Math.max(0, totalPayout - base - distance)
  return { base, distance, bonus, total: totalPayout }
}

interface PayoutBreakdownCardProps {
  breakdown: PayoutBreakdown
  testID?: string
}

export default function PayoutBreakdownCard({ breakdown, testID }: PayoutBreakdownCardProps) {
  const rows: { icon: React.ReactNode; label: string; amount: number; iconBg: string }[] = [
    {
      icon: <Receipt size={14} color={colors.primary} />,
      label: 'Base fare',
      amount: breakdown.base,
      iconBg: colors.primary50,
    },
    {
      icon: <Navigation size={14} color={colors.info} />,
      label: 'Distance',
      amount: breakdown.distance,
      iconBg: colors.infoLight,
    },
  ]

  if (breakdown.bonus > 0) {
    rows.push({
      icon: <Star size={14} color={colors.warning} />,
      label: 'Bonus / surge',
      amount: breakdown.bonus,
      iconBg: colors.warningLight,
    })
  }

  return (
    <View
      style={styles.card}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`Payout breakdown: base ${formatNprTabular(breakdown.base)}, distance ${formatNprTabular(breakdown.distance)}, ${breakdown.bonus > 0 ? `bonus ${formatNprTabular(breakdown.bonus)}, ` : ''}total ${formatNprTabular(breakdown.total)}.`}
    >
      <Text style={styles.title}>Payout breakdown</Text>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
            {row.icon}
          </View>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowAmount} numberOfLines={1}>
            {formatNprTabular(row.amount)}
          </Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total payout</Text>
        <Text style={styles.totalValue} numberOfLines={1}>
          {formatNprTabular(breakdown.total)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.base[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    minWidth: 0,
  },
  rowAmount: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  totalValue: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
})
