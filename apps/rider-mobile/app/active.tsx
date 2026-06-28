import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, BackHandler } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useActiveDeliveryStore } from '@chinooz/state'
import { useUpdateDeliveryStatus, useCollectCOD } from '@chinooz/hooks/useRider'
import { analytics } from '@chinooz/analytics'
import { useAppState } from '../components/AppStateProvider'
import ActiveMap from '../components/active/ActiveMap'
import ActiveTopBar from '../components/active/ActiveTopBar'
import ActiveBottomSheet from '../components/active/ActiveBottomSheet'
import ContactSheet from '../components/active/ContactSheet'
import SafetySheet from '../components/active/SafetySheet'
import IssueReportSheet from '../components/active/IssueReportSheet'
import {
  ActiveLoadingSkeleton,
  ErrorBanner,
  OfflineBanner,
  RestoreNotice,
  SystemCancelNotice,
  PausedBanner,
} from '../components/active/ActiveStates'
import type { DeliveryStatus } from '@chinooz/types'

/**
 * Active Delivery full-screen route (RA1).
 *
 * Launched on Accept. A full-screen RS3 map with the trip simulator animating
 * the rider along the route, a top bar (minimize, status, ETA/distance), and
 * an expandable bottom action sheet whose primary button changes per status.
 *
 * ALL state is driven by the shared activeDelivery store (single source of
 * truth). The simulator is ticked here on a 1s interval; the store converts
 * elapsed time into leg progress so the rider marker animates smoothly.
 */
export default function ActiveDeliveryScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  const delivery = useActiveDeliveryStore(s => s.activeDelivery)
  const advanceStatus = useActiveDeliveryStore(s => s.advanceStatus)
  const minimize = useActiveDeliveryStore(s => s.minimize)
  const cancel = useActiveDeliveryStore(s => s.cancel)
  const fail = useActiveDeliveryStore(s => s.fail)
  const pause = useActiveDeliveryStore(s => s.pause)
  const escalate = useActiveDeliveryStore(s => s.escalate)
  const tick = useActiveDeliveryStore(s => s.tick)
  const clearActiveDelivery = useActiveDeliveryStore(s => s.clearActiveDelivery)
  const pendingQueue = useActiveDeliveryStore(s => s.pendingQueue)
  const storeError = useActiveDeliveryStore(s => s.error)
  const restored = useActiveDeliveryStore(s => s.restored)
  const syncQueue = useActiveDeliveryStore(s => s.syncQueue)
  const clearError = useActiveDeliveryStore(s => s.clearError)
  const acknowledgeRestore = useActiveDeliveryStore(s => s.acknowledgeRestore)

  // TanStack Query mutations: status transitions + COD collection.
  // These call the mock API with optimistic + rollback, propagate to the
  // shared order store (buyer O4 + seller OM), and sync back to the
  // Zustand store on success.
  const statusMutation = useUpdateDeliveryStatus()
  const codMutation = useCollectCOD()

  const { connectivity, isForeground } = useAppState()
  const isOffline = connectivity === 'offline'

  const [cancelOpen, setCancelOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [backGuardOpen, setBackGuardOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-active-delivery' })
  }, [])

  // Loading: simulate map + route calc for 1.2s on first entry.
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  // Restore detection: if a non-terminal delivery is found in the persisted
  // store on mount, mark it as restored so the restore notice shows.
  useEffect(() => {
    if (delivery && !isTerminal(delivery.status) && restored) {
      try {
        const statusLabel = t(`rider.active.status_${delivery.status}`)
        analytics.track({
          event: 'rider_active_restored',
          screen: 'rider-active-delivery',
          status: delivery.status,
        })
        void statusLabel
      } catch {}
    }
  }, [delivery, restored, t])

  // Offline → online: sync the queued updates.
  const prevOffline = useRef(false)
  useEffect(() => {
    if (prevOffline.current && !isOffline && pendingQueue.length > 0) {
      setSyncing(true)
      setSynced(false)
      // Mock: simulate sync latency.
      const timer = setTimeout(() => {
        syncQueue()
        setSyncing(false)
        setSynced(true)
        setTimeout(() => setSynced(false), 3000)
      }, 1500)
      return () => clearTimeout(timer)
    }
    prevOffline.current = isOffline
  }, [isOffline, pendingQueue.length, syncQueue])

  // Back-press guard: intercept hardware back to prevent accidental exit.
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (delivery && !isTerminal(delivery.status)) {
        setBackGuardOpen(true)
        return true
      }
      return false
    })
    return () => backHandler.remove()
  }, [delivery])

  // RS3 trip simulator tick: advance movement every second while a leg is
  // active (heading_to_pickup / picked_up / in_transit) AND the app is in
  // the foreground. Pauses when backgrounded to save battery/data.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!delivery) return
    const moving =
      isForeground &&
      (delivery.status === 'heading_to_pickup' ||
        delivery.status === 'picked_up' ||
        delivery.status === 'in_transit')
    if (moving) {
      tickRef.current = setInterval(() => tick(1), 1000)
    } else if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [delivery?.status, tick, delivery, isForeground])

  // The simulator moves the rider toward the leg end but does NOT auto-advance
  // the state machine: the rider must tap "Arrived at pickup" / "Arrived at
  // drop-off" to confirm arrival, per the delivery state machine. The tick
  // loop stops once legProgress reaches 1 (the store's advance() is a no-op
  // when arrived), so the marker rests at the stop until the rider confirms.

  const handlePrimary = useCallback(() => {
    if (!delivery) return
    if (isTerminal(delivery.status)) {
      clearActiveDelivery()
      router.replace('/jobs')
      return
    }
    if (isOffline) {
      // Offline: queue the status update for sync on reconnect.
      const next = nextStatus(delivery.status)
      if (next) {
        useActiveDeliveryStore.getState().queueStatusUpdate({
          status: next,
          queuedAt: Date.now(),
        })
      }
      return
    }
    // Online: optimistic store advance + API mutation with rollback.
    const next = nextStatus(delivery.status)
    if (!next) return
    const opRef = `${delivery.jobId}:${delivery.status}->${next}:${Date.now()}`
    // Optimistic: advance the store immediately.
    advanceStatus()
    analytics.track('rider_active_status_advance', {
      jobId: delivery.jobId,
      from: delivery.status,
      to: next,
    })
    // Fire the mutation; on error, rollback + set error state.
    statusMutation.mutate(
      { jobId: delivery.jobId, next, opRef },
      {
        onError: () => {
          // Rollback: the mutation's onError already restored the query cache.
          // Set the store error so the ErrorBanner shows with retry.
          useActiveDeliveryStore.getState().setError('status_update_failed')
        },
      },
    )
    // If transitioning to delivered and COD, collect COD (idempotent).
    if (next === 'delivered' && delivery.isCod && delivery.codAmount > 0) {
      const codRef = `${delivery.jobId}:cod:${delivery.codAmount}`
      codMutation.mutate(
        { jobId: delivery.jobId, amountNpr: delivery.codAmount, opRef: codRef },
        {
          onError: () => {
            useActiveDeliveryStore.getState().setError('cod_record_failed')
          },
        },
      )
    }
  }, [delivery, advanceStatus, clearActiveDelivery, router, isOffline, statusMutation, codMutation])

  const handleErrorRetry = useCallback(() => {
    clearError()
    // Retry the last action (mock — just clears the error).
  }, [clearError])

  const handleResumeFromPause = useCallback(() => {
    // Clear the pause signal (failureReason with PAUSED: prefix).
    if (delivery?.failureReason?.startsWith('PAUSED:')) {
      useActiveDeliveryStore.setState(state => ({
        activeDelivery: state.activeDelivery
          ? { ...state.activeDelivery, failureReason: undefined, updatedAt: Date.now() }
          : null,
      }))
    }
  }, [delivery])

  const handleMinimize = useCallback(() => {
    minimize()
    router.replace('/jobs')
  }, [minimize, router])

  const handleCancel = useCallback((reason?: string) => {
    setCancelOpen(false)
    cancel(reason)
  }, [cancel])

  const handleCancelPress = useCallback(() => {
    setCancelOpen(true)
  }, [])

  const handleFailed = useCallback((reason: string) => {
    fail(reason)
  }, [fail])

  const handlePause = useCallback((reason: string) => {
    pause(reason)
  }, [pause])

  const handleEscalate = useCallback((reason: string) => {
    escalate(reason)
  }, [escalate])

  const handleIssueCancel = useCallback((reason: string) => {
    cancel(reason)
  }, [cancel])

  if (!delivery) {
    // Nothing active — redirect to Jobs after a brief delay so screen readers
    // announce the redirect.
    return (
      <View
        style={styles.empty}
        accessibilityRole="alert"
        accessibilityLabel={t('rider.active.emptyRedirectAria')}
        accessibilityLiveRegion="assertive"
      >
        <Text style={styles.emptyText}>{t('rider.active.emptyRedirect')}</Text>
        <RedirectToJobs router={router} />
      </View>
    )
  }

  // Loading state: map + route calc skeleton.
  if (loading) {
    return <ActiveLoadingSkeleton />
  }

  // System cancellation notice (mid-trip cancel by seller/system).
  if (delivery.cancelledBySystem) {
    return (
      <View style={styles.screen}>
        <SystemCancelNotice
          compensationNote={delivery.compensationNote}
          onDone={() => {
            clearActiveDelivery()
            router.replace('/jobs')
          }}
        />
      </View>
    )
  }

  const targetLabel =
    delivery.status === 'assigned' || delivery.status === 'heading_to_pickup' || delivery.status === 'at_pickup'
      ? delivery.pickup.label
      : delivery.dropoff.label

  const a11ySummary = isTerminal(delivery.status)
    ? delivery.status === 'delivered'
      ? t('rider.active.a11yMapSummaryDone')
      : delivery.status === 'cancelled'
        ? t('rider.active.a11yMapSummaryCancelled')
        : t('rider.active.a11yMapSummaryFailed')
    : delivery.distanceMeters <= 0
      ? t('rider.active.a11yMapSummaryArrived', { target: targetLabel })
      : t('rider.active.a11yMapSummary', {
          target: targetLabel,
          distance: formatDistance(delivery.distanceMeters),
          eta: formatEta(delivery.etaSeconds),
        })

  return (
    <View style={styles.screen}>
      <ActiveMap delivery={delivery} a11ySummary={a11ySummary} testID="active-map" />

      <ActiveTopBar
        delivery={delivery}
        onMinimize={handleMinimize}
        onCancel={handlePrimary}
        onContact={() => setContactOpen(true)}
        onSafety={() => setSafetyOpen(true)}
        onIssue={() => setIssueOpen(true)}
      />

      {/* Status live-region (announces status changes, invisible visually) */}
      <View
        accessibilityLiveRegion="polite"
        style={styles.liveRegion}
      >
        <Text accessibilityRole="text">{t(`rider.active.status_${delivery.status}`)}</Text>
      </View>

      {/* Offline banner: queued updates + sync on reconnect */}
      {!isTerminal(delivery.status) && (isOffline || syncing || synced) && (
        <View style={styles.bannerWrap}>
          <OfflineBanner
            queuedCount={pendingQueue.length}
            syncing={syncing}
            synced={synced}
          />
        </View>
      )}

      {/* Error banner: status/proof/COD/map failure with retry */}
      {storeError && (
        <View style={styles.bannerWrap}>
          <ErrorBanner
            error={storeError}
            onRetry={handleErrorRetry}
            onDismiss={clearError}
          />
        </View>
      )}

      {/* Paused banner: issue reported, dispatch reviewing */}
      {!isTerminal(delivery.status) && delivery.failureReason?.startsWith('PAUSED:') && (
        <View style={styles.bannerWrap}>
          <PausedBanner onResume={handleResumeFromPause} />
        </View>
      )}

      <ActiveBottomSheet delivery={delivery} onPrimary={handlePrimary} onCancel={handleCancelPress} onFailed={handleFailed} />

      {/* Cancel confirmation modal */}
      <Modal
        transparent
        visible={cancelOpen}
        animationType="fade"
        onRequestClose={() => setCancelOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCancelOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('rider.active.cancelConfirmTitle')}</Text>
            <Text style={styles.modalBody}>{t('rider.active.cancelConfirmMsg')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.cancelConfirmStay')}
                onPress={() => setCancelOpen(false)}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>{t('rider.active.cancelConfirmStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.cancelConfirmCancel')}
                onPress={() => handleCancel()}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>{t('rider.active.cancelConfirmCancel')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contact sheet: masked call + chat + canned messages */}
      <ContactSheet
        visible={contactOpen}
        delivery={delivery}
        onClose={() => setContactOpen(false)}
      />

      {/* Safety sheet: SOS + emergency calls + share trip + report safety */}
      <SafetySheet
        visible={safetyOpen}
        delivery={delivery}
        onClose={() => setSafetyOpen(false)}
      />

      {/* Issue report sheet: structured reasons + pause/cancel/escalate */}
      <IssueReportSheet
        visible={issueOpen}
        delivery={delivery}
        onClose={() => setIssueOpen(false)}
        onPause={handlePause}
        onCancel={handleIssueCancel}
        onEscalate={handleEscalate}
      />

      {/* Restore notice: app-kill relaunch with non-terminal delivery */}
      {restored && !isTerminal(delivery.status) && (
        <RestoreNotice
          statusLabel={t(`rider.active.status_${delivery.status}`)}
          onContinue={acknowledgeRestore}
        />
      )}

      {/* Back-press guard: confirm before leaving active delivery */}
      <Modal
        transparent
        visible={backGuardOpen}
        animationType="fade"
        onRequestClose={() => setBackGuardOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBackGuardOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('rider.active.backGuardTitle')}</Text>
            <Text style={styles.modalBody}>{t('rider.active.backGuardBody')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.backGuardStay')}
                onPress={() => setBackGuardOpen(false)}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>{t('rider.active.backGuardStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.backGuardLeave')}
                onPress={() => {
                  setBackGuardOpen(false)
                  handleMinimize()
                }}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>{t('rider.active.backGuardLeave')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function isTerminal(s: DeliveryStatus): boolean {
  return s === 'delivered' || s === 'cancelled' || s === 'failed'
}

/** Next status in the happy-path flow, or null if terminal. */
function nextStatus(s: DeliveryStatus): DeliveryStatus | null {
  const flow: DeliveryStatus[] = [
    'assigned', 'heading_to_pickup', 'at_pickup', 'picked_up', 'in_transit', 'at_dropoff', 'delivered',
  ]
  const idx = flow.indexOf(s)
  if (idx < 0 || idx >= flow.length - 1) return null
  return flow[idx + 1]
}

/** Redirect to Jobs after a brief delay for screen reader announcement. */
function RedirectToJobs({ router }: { router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/jobs'), 1500)
    return () => clearTimeout(timer)
  }, [router])
  return null
}

function formatEta(sec: number): string {
  if (sec <= 0) return '0 min'
  const mins = Math.max(1, Math.round(sec / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  emptyText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
    textAlign: 'center',
  },
  bannerWrap: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 25,
  },
  liveRegion: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    width: '100%',
  },
  modalTitle: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})
