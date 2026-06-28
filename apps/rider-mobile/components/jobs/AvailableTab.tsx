import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  AccessibilityInfo,
  RefreshControl,
} from 'react-native'
import Animated, {
  FadeIn,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { WifiOff, Lock, Landmark } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, duration } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { useAvailableJobs } from '@chinooz/hooks'
import { useCodLimitStatus } from '@chinooz/state'
import { RIDER_LOCATION, getDemandZones, type DemandZone } from '@chinooz/mock-data'
import type { GeoPoint } from '@chinooz/types'
import type { JobRequest, AvailableSort, AvailableView, AvailableFilters } from './types'
import { DEFAULT_FILTERS } from './types'
import JobCard, { JobCardSkeleton } from './JobCard'
import { SortViewToggle, JobFilters } from './JobFilters'
import JobMiniMap from './JobMiniMap'
import { riderJobToJobRequest } from './convert'
import { ErrorStateView, QuietStateView } from './JobStateViews'

/** A job is COD when it carries a positive codAmount. */
function isCodJob(job: JobRequest): boolean {
  return !!job.codAmount && job.codAmount > 0
}

/**
 * Translate with an inline English fallback. The rider i18n namespace is
 * under concurrent restructuring, so the tab always renders correct copy.
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

interface AvailableTabProps {
  isOnline: boolean
  onGoOnline: () => void
  onAccept?: (job: JobRequest) => void
  /** Open the job detail (RJ4) surface for a request. */
  onView?: (job: JobRequest) => void
  /** Open the demand hotspots heatmap (quiet-state nudge). */
  onOpenHotspots?: () => void
  /** Open the deposit / settle flow to unlock COD jobs. */
  onDepositToUnlock?: () => void
}

export default function AvailableTab({
  isOnline,
  onGoOnline,
  onAccept,
  onView,
  onOpenHotspots,
  onDepositToUnlock,
}: AvailableTabProps) {
  const tt = useTt()
  const reduced = useReducedMotion()

  // COD float limit — at limit, new COD jobs are blocked (shared store).
  const codLimitStatus = useCodLimitStatus()
  const codAtLimit = codLimitStatus.kind === 'atLimit'

  // Available jobs from the mock API (TanStack Query, 15s staleTime).
  const { data: rawJobs, isLoading, isError, refetch, isFetching } = useAvailableJobs()

  const [sort, setSort] = useState<AvailableSort>('nearest')
  const [view, setView] = useState<AvailableView>('list')
  const [filters, setFilters] = useState<AvailableFilters>(DEFAULT_FILTERS)
  const [refreshing, setRefreshing] = useState(false)

  // Zones for the zone filter (demand zones double as job zones).
  const zones = useMemo<{ id: string; name: string }[]>(() => {
    try {
      return getDemandZones().map((z: DemandZone) => ({ id: z.id, name: z.name }))
    } catch {
      return []
    }
  }, [])

  // Pickup geo per job id (for the mini map pins).
  const jobPoints = useMemo(() => {
    const m = new Map<string, GeoPoint>()
    for (const j of rawJobs ?? []) {
      m.set(j.id, { lat: j.pickup.lat, lng: j.pickup.lng })
    }
    return m
  }, [rawJobs])

  // Convert RiderJob[] → JobRequest[] with pickup distance + expiry windows.
  const allJobs = useMemo<JobRequest[]>(() => {
    if (!rawJobs) return []
    return rawJobs.map((j, i) =>
      riderJobToJobRequest(j, RIDER_LOCATION, {
        expiresInSeconds: 90 + (i % 4) * 30,
        zone: (j.dropoff as { area?: string }).area,
      }),
    )
  }, [rawJobs])

  // Live expiry pruning: tick every 5s, drop expired jobs + announce politely.
  // This is the realtime boundary — expired jobs vanish from the list.
  const [liveJobs, setLiveJobs] = useState<JobRequest[]>(allJobs)
  const prevIds = useRef<Set<string>>(new Set(allJobs.map(j => j.id)))

  useEffect(() => {
    setLiveJobs(allJobs)
    prevIds.current = new Set(allJobs.map(j => j.id))
  }, [allJobs])

  useEffect(() => {
    if (!isOnline) return
    const id = setInterval(() => {
      const now = Date.now()
      setLiveJobs(prev => {
        const expired = prev.filter(j => j.expiresAtMs && j.expiresAtMs <= now)
        for (const e of expired) {
          AccessibilityInfo.announceForAccessibility(
            tt('rider.jobs.available.liveExpired', { ref: e.orderRef }, `Job expired: ${e.orderRef}`),
          )
        }
        return prev.filter(j => !j.expiresAtMs || j.expiresAtMs > now)
      })
    }, 5000)
    return () => clearInterval(id)
  }, [isOnline, tt])

  // Announce newly-appeared jobs politely (live add boundary).
  useEffect(() => {
    if (!isOnline) return
    const curIds = new Set(liveJobs.map(j => j.id))
    const added = liveJobs.filter(j => !prevIds.current.has(j.id))
    for (const a of added) {
      AccessibilityInfo.announceForAccessibility(
        tt('rider.jobs.available.liveNew', { ref: a.orderRef }, `New job available: ${a.orderRef}`),
      )
    }
    prevIds.current = curIds
  }, [liveJobs, isOnline, tt])

  // Apply filters + sort.
  const filtered = useMemo(() => {
    let list = liveJobs
    if (filters.maxDistanceKm !== null) {
      list = list.filter(j => j.pickupDistanceKm <= filters.maxDistanceKm!)
    }
    if (filters.minPayout !== null) {
      list = list.filter(j => j.payout >= filters.minPayout!)
    }
    if (filters.payment === 'cod') list = list.filter(isCodJob)
    if (filters.payment === 'prepaid') list = list.filter(j => !isCodJob(j))
    if (filters.zoneId !== null) {
      const zone = zones.find(z => z.id === filters.zoneId)
      if (zone) {
        list = list.filter(j => j.zone === zone.name || j.dropoffLabel === zone.name)
      }
    }
    return [...list].sort((a, b) =>
      sort === 'nearest'
        ? a.pickupDistanceKm - b.pickupDistanceKm
        : b.payout - a.payout,
    )
  }, [liveJobs, filters, sort, zones])

  const tick = () => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }

  // -- Offline state --
  if (!isOnline) {
    return (
      <EmptyState
        testID="jobs-available-offline"
        icon={<WifiOff size={40} color={colors.textTertiary} />}
        title={tt('rider.jobs.availableEmptyOfflineTitle', undefined, 'Go online to see deliveries')}
        subtitle={tt('rider.jobs.availableEmptyOfflineSubtitle', undefined, "When you're online, nearby job requests show up here in real time.")}
        action={{ label: tt('rider.jobs.offlineAction', undefined, 'Go online'), onPress: onGoOnline }}
      />
    )
  }

  // -- Error state --
  if (isError && !rawJobs) {
    return (
      <ErrorStateView
        testID="jobs-available-error"
        onRetry={() => refetch()}
        title={tt('rider.jobs.states.errorTitle', undefined, 'Could not load deliveries')}
        subtitle={tt('rider.jobs.states.errorSubtitle', undefined, 'Something went wrong. Please try again.')}
      />
    )
  }

  // -- Loading state (skeletons) --
  if (isLoading && !rawJobs) {
    return (
      <View style={styles.list}>
        <View style={styles.skeletonControls} />
        <View style={styles.skeletonFilters} />
        {Array.from({ length: 3 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </View>
    )
  }

  const hasBlockedCod = codAtLimit && filtered.some(isCodJob)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    AccessibilityInfo.announceForAccessibility(tt('rider.jobs.refreshing', undefined, 'Refreshing jobs…'))
    refetch().finally(() => {
      setRefreshing(false)
      AccessibilityInfo.announceForAccessibility(tt('rider.jobs.refreshed', undefined, 'Jobs refreshed'))
    })
  }, [refetch, tt])

  const handleJobPress = useCallback((job: JobRequest) => {
    tick()
    onView?.(job)
  }, [onView])

  const handleJobAction = useCallback((job: JobRequest) => {
    tick()
    onAccept?.(job)
  }, [onAccept])

  const renderItem = ({ item }: { item: JobRequest }) => {
    const blocked = codAtLimit && isCodJob(item)
    if (blocked) {
      return <BlockedJobCard job={item} orderRef={item.orderRef} />
    }
    return (
      <JobCard
        tab="available"
        job={item}
        testID={`jobs-available-item-${item.id}`}
        onPress={() => handleJobPress(item)}
        onAction={() => handleJobAction(item)}
      />
    )
  }

  const resultsLabel =
    filtered.length === 0
      ? tt('rider.jobs.available.resultsCountNone', undefined, 'No jobs match your filters')
      : filtered.length === 1
        ? tt('rider.jobs.available.resultsCountOne', undefined, '1 job nearby')
        : tt('rider.jobs.available.resultsCount', { count: filtered.length }, `${filtered.length} jobs nearby`)

  return (
    <View style={styles.list} accessibilityLabel={resultsLabel}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tt('rider.jobs.availableTitle', undefined, 'Available deliveries')}</Text>
        <Text style={styles.sectionSubtitle}>{tt('rider.jobs.availableSubtitle', undefined, 'Nearby jobs waiting for a rider')}</Text>
      </View>

      {/* Sort + view toggle */}
      <SortViewToggle
        sort={sort}
        view={view}
        onSortChange={setSort}
        onViewChange={setView}
        testID="jobs-available-sort-view"
      />

      {/* Filters (quick chips) */}
      <JobFilters
        filters={filters}
        onChange={setFilters}
        zones={zones}
        testID="jobs-available-filters"
      />

      {/* Results count */}
      <Text style={styles.resultsCount}>{resultsLabel}</Text>

      {/* COD-limit banner (never a silent block) */}
      {hasBlockedCod && (
        <View
          accessibilityRole="summary"
          accessibilityLabel={tt('rider.wallet.jobsCodBlockedAria', { limit: codLimitStatus.maxCodFloat }, 'COD jobs are blocked. You are at the COD cash limit. Deposit cash to unlock COD orders.')}
          accessibilityLiveRegion="polite"
          style={styles.blockedBanner}
        >
          <View style={styles.blockedHeader}>
            <Lock size={16} color={colors.error} />
            <Text style={styles.blockedTitle}>{tt('rider.wallet.jobsCodBlockedTitle', undefined, 'COD jobs paused')}</Text>
          </View>
          <Text style={styles.blockedSub}>{tt('rider.wallet.jobsCodBlockedSub', undefined, "You're at the COD cash limit. Deposit to unlock COD orders.")}</Text>
          {onDepositToUnlock && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={tt('rider.wallet.jobsCodBlockedAction', undefined, 'Deposit to unlock')}
              onPress={() => { tick(); onDepositToUnlock() }}
              style={styles.blockedCta}
              activeOpacity={0.9}
            >
              <Landmark size={15} color={colors.white} />
              <Text style={styles.blockedCtaText}>{tt('rider.wallet.jobsCodBlockedAction', undefined, 'Deposit to unlock')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Map view — fade in */}
      {view === 'map' && (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(duration.normal)} style={{ flex: 1 }}>
          <JobMiniMap
            jobs={filtered}
            jobPoints={jobPoints}
            riderLocation={RIDER_LOCATION}
            width={Dimensions.get('window').width - spacing[4] * 2}
            height={260}
            onJobPress={handleJobPress}
            accessibilityLabel={tt('rider.jobs.available.mapAria', { count: filtered.length }, `Map showing ${filtered.length} available job pins`)}
            testID="jobs-available-map"
          />
        </Animated.View>
      )}

      {/* List view — fade in */}
      {view === 'list' && (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(duration.normal)} style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListEmptyComponent={
            <QuietStateView
              testID="jobs-available-quiet"
              onAction={onOpenHotspots}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isFetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          testID="jobs-available-flatlist"
        />
        </Animated.View>
      )}

      {/* Map view refresh button (FlatList above handles list refresh) */}
      {view === 'map' && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.pullToRefresh', undefined, 'Pull down to refresh jobs')}
          onPress={onRefresh}
          style={styles.mapRefreshBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.mapRefreshText}>{tt('rider.jobs.refreshed', undefined, 'Refresh jobs')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ----------------------------- quiet state ----------------------------- */

/* ----------------------------- blocked card ----------------------------- */

function BlockedJobCard({ job, orderRef }: { job: JobRequest; orderRef: string }) {
  const { t } = useTranslation()
  return (
    <View
      style={styles.cardBlocked}
      testID={`jobs-available-item-${job.id}`}
      accessibilityRole="summary"
      accessibilityLabel={t('rider.wallet.jobsCodBlockedTitle', { defaultValue: 'COD jobs paused' })}
    >
      <View style={styles.blockedHeader}>
        <Lock size={16} color={colors.error} />
        <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: orderRef, defaultValue: `Order ${orderRef}` })}</Text>
      </View>
      <Text style={styles.blockedSub}>{t('rider.wallet.jobsCodBlockedSub', { defaultValue: "You're at the COD cash limit. Deposit to unlock COD orders." })}</Text>
    </View>
  )
}

/* ------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionHeader: { gap: spacing[1], marginBottom: spacing[1] },
  sectionTitle: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
  resultsCount: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500' },
  skeletonControls: { height: 40, backgroundColor: colors.border, borderRadius: radii.full, opacity: 0.3 },
  skeletonFilters: { height: 40, width: '70%', backgroundColor: colors.border, borderRadius: radii.full, opacity: 0.3 },
  flatListContent: { gap: spacing[3], paddingBottom: spacing[4] },
  blockedBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing[4],
    gap: spacing[2],
  },
  blockedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  blockedTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansBold[0] },
  blockedSub: { fontSize: fontSize.sm[0], color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  blockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  blockedCtaText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  cardBlocked: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
    opacity: 0.6,
  },
  orderRef: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text, flex: 1 },
  mapRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  mapRefreshText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.primary },
})
