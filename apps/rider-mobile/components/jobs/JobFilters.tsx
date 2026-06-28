import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { List, Map, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import type { AvailableSort, AvailableView, AvailableFilters, PaymentFilter } from './types'
import { DISTANCE_OPTIONS, MIN_PAYOUT_OPTIONS, DEFAULT_FILTERS } from './types'

/**
 * Translate with an inline English fallback. The rider i18n namespace is under
 * concurrent restructuring, so controls always render correct copy even when a
 * key is momentarily missing.
 */
function useTt() {
  const { t } = useTranslation()
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) => {
      const raw = t(key, vars ?? {})
      if (raw === key || raw === undefined) return fallback ?? key
      return raw
    },
    [t],
  )
}

/* --------------------------- sort + view toggle --------------------------- */

interface SortViewToggleProps {
  sort: AvailableSort
  view: AvailableView
  onSortChange: (sort: AvailableSort) => void
  onViewChange: (view: AvailableView) => void
  testID?: string
}

export function SortViewToggle({ sort, view, onSortChange, onViewChange, testID }: SortViewToggleProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = () => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }

  const sortLabel = sort === 'nearest'
    ? tt('rider.jobs.available.sortNearest', undefined, 'Nearest')
    : tt('rider.jobs.available.sortBestPayout', undefined, 'Best payout')
  const nextSort: AvailableSort = sort === 'nearest' ? 'bestPayout' : 'nearest'
  const SortIcon = sort === 'nearest' ? ArrowDown : ArrowUp

  const viewLabel = view === 'list'
    ? tt('rider.jobs.available.viewList', undefined, 'List')
    : tt('rider.jobs.available.viewMap', undefined, 'Map')

  return (
    <View style={styles.sortViewRow} testID={testID}>
      {/* Sort toggle */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={tt('rider.jobs.available.sortAria', { sort: sortLabel }, `Sort jobs: ${sortLabel}`)}
        onPress={() => { tick(); onSortChange(nextSort) }}
        style={styles.sortBtn}
        activeOpacity={0.7}
      >
        <SortIcon size={15} color={colors.primary} />
        <Text style={styles.sortLabel}>{sortLabel}</Text>
      </TouchableOpacity>

      {/* View switch (list / map) */}
      <View
        style={styles.viewSwitch}
        accessibilityRole="tablist"
        accessibilityLabel={tt('rider.jobs.available.viewAria', { view: viewLabel }, `Switch view: ${viewLabel}`)}
      >
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'list' }}
          onPress={() => { tick(); onViewChange('list') }}
          style={[styles.viewSeg, view === 'list' && styles.viewSegActive]}
          activeOpacity={0.7}
        >
          <List size={14} color={view === 'list' ? colors.white : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'map' }}
          onPress={() => { tick(); onViewChange('map') }}
          style={[styles.viewSeg, view === 'map' && styles.viewSegActive]}
          activeOpacity={0.7}
        >
          <Map size={14} color={view === 'map' ? colors.white : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ------------------------------- filters --------------------------------- */

interface JobFiltersProps {
  filters: AvailableFilters
  onChange: (filters: AvailableFilters) => void
  zones: { id: string; name: string }[]
  testID?: string
}

export function JobFilters({ filters, onChange, zones, testID }: JobFiltersProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = () => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }

  const hasActiveFilters =
    filters.maxDistanceKm !== null ||
    filters.minPayout !== null ||
    filters.payment !== 'all' ||
    filters.zoneId !== null

  const reset = () => {
    tick()
    onChange({ ...DEFAULT_FILTERS })
  }

  // Cycle through distance options: any → 1 → 2 → 5 → 10 → any.
  const cycleDistance = () => {
    tick()
    const opts = DISTANCE_OPTIONS
    if (filters.maxDistanceKm === null) { onChange({ ...filters, maxDistanceKm: opts[0] }); return }
    const idx = opts.indexOf(filters.maxDistanceKm)
    onChange({ ...filters, maxDistanceKm: idx >= opts.length - 1 ? null : opts[idx + 1] })
  }

  // Cycle through min payout options: any → 80 → 120 → 150 → 200 → any.
  const cycleMinPayout = () => {
    tick()
    const opts = MIN_PAYOUT_OPTIONS
    if (filters.minPayout === null) { onChange({ ...filters, minPayout: opts[0] }); return }
    const idx = opts.indexOf(filters.minPayout)
    onChange({ ...filters, minPayout: idx >= opts.length - 1 ? null : opts[idx + 1] })
  }

  // Cycle payment: all → cod → prepaid → all.
  const cyclePayment = () => {
    tick()
    const order: PaymentFilter[] = ['all', 'cod', 'prepaid']
    const idx = order.indexOf(filters.payment)
    onChange({ ...filters, payment: order[(idx + 1) % order.length] })
  }

  // Cycle zones: all → zone[0] → ... → all.
  const cycleZone = () => {
    tick()
    if (filters.zoneId === null) { onChange({ ...filters, zoneId: zones[0]?.id ?? null }); return }
    const idx = zones.findIndex(z => z.id === filters.zoneId)
    onChange({ ...filters, zoneId: idx >= zones.length - 1 ? null : zones[idx + 1].id })
  }

  // Distance chip
  const distValue = filters.maxDistanceKm === null
    ? tt('rider.jobs.available.filterDistanceAny', undefined, 'Any distance')
    : tt('rider.jobs.available.filterDistanceValue', { km: filters.maxDistanceKm }, `${filters.maxDistanceKm} km`)
  const distActive = filters.maxDistanceKm !== null

  // Min payout chip
  const payoutValue = filters.minPayout === null
    ? tt('rider.jobs.available.filterMinPayoutAny', undefined, 'Any payout')
    : tt('rider.jobs.available.filterMinPayoutValue', { amount: filters.minPayout }, `Rs ${filters.minPayout}+`)
  const payoutActive = filters.minPayout !== null

  // Payment chip
  const paymentLabel =
    filters.payment === 'cod' ? tt('rider.jobs.available.filterPaymentCod', undefined, 'COD')
    : filters.payment === 'prepaid' ? tt('rider.jobs.available.filterPaymentPrepaid', undefined, 'Prepaid')
    : tt('rider.jobs.available.filterPaymentAll', undefined, 'All')
  const paymentActive = filters.payment !== 'all'

  // Zone chip
  const zone = zones.find(z => z.id === filters.zoneId)
  const zoneValue = zone
    ? zone.name
    : tt('rider.jobs.available.filterZoneAll', undefined, 'All zones')
  const zoneActive = filters.zoneId !== null

  return (
    <View
      style={styles.filtersWrap}
      testID={testID}
      accessibilityRole="toolbar"
      accessibilityLabel={tt('rider.jobs.available.filtersAria', undefined, 'Job filters')}
    >
      <FilterChip
        label={tt('rider.jobs.available.filterDistance', undefined, 'Distance')}
        value={distValue}
        active={distActive}
        aria={tt('rider.jobs.available.filterDistanceAria', { value: distValue }, `Filter by distance. Current: ${distValue}`)}
        onPress={cycleDistance}
      />
      <FilterChip
        label={tt('rider.jobs.available.filterMinPayout', undefined, 'Min payout')}
        value={payoutValue}
        active={payoutActive}
        aria={tt('rider.jobs.available.filterMinPayoutAria', { value: payoutValue }, `Filter by minimum payout. Current: ${payoutValue}`)}
        onPress={cycleMinPayout}
      />
      <FilterChip
        label={tt('rider.jobs.available.filterPayment', undefined, 'Payment')}
        value={paymentLabel}
        active={paymentActive}
        aria={tt('rider.jobs.available.filterPaymentAria', { value: paymentLabel }, `Filter by payment type. Current: ${paymentLabel}`)}
        onPress={cyclePayment}
      />
      <FilterChip
        label={tt('rider.jobs.available.filterZone', undefined, 'Zone')}
        value={zoneValue}
        active={zoneActive}
        aria={tt('rider.jobs.available.filterZoneAria', { value: zoneValue }, `Filter by zone. Current: ${zoneValue}`)}
        onPress={cycleZone}
      />
      {hasActiveFilters && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.available.filterResetAria', undefined, 'Reset all filters')}
          onPress={reset}
          style={styles.resetChip}
          activeOpacity={0.7}
        >
          <RotateCcw size={13} color={colors.textMuted} />
          <Text style={styles.resetText}>{tt('rider.jobs.available.filterReset', undefined, 'Reset')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function FilterChip({
  label,
  value,
  active,
  aria,
  onPress,
}: {
  label: string
  value: string
  active: boolean
  aria: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={aria}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
      <Text style={[styles.chipValue, active && styles.chipValueActive]} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  sortViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 40,
  },
  sortLabel: { fontSize: fontSize.sm[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
  viewSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 2,
  },
  viewSeg: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSegActive: { backgroundColor: colors.primary },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 40,
  },
  chipActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary,
  },
  chipLabel: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.textMuted },
  chipLabelActive: { color: colors.primary, fontWeight: '600' },
  chipValue: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  chipValueActive: { color: colors.primary },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    minHeight: 40,
  },
  resetText: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.textMuted },
})
