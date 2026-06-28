import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useActiveDeliveryStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import ActiveMap from '../components/active/ActiveMap'
import ActiveTopBar from '../components/active/ActiveTopBar'
import ActiveBottomSheet from '../components/active/ActiveBottomSheet'
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
  const tick = useActiveDeliveryStore(s => s.tick)
  const clearActiveDelivery = useActiveDeliveryStore(s => s.clearActiveDelivery)

  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-active-delivery' })
  }, [])

  // RS3 trip simulator tick: advance movement every second while a leg is
  // active (heading_to_pickup / picked_up / in_transit).
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!delivery) return
    const moving =
      delivery.status === 'heading_to_pickup' ||
      delivery.status === 'picked_up' ||
      delivery.status === 'in_transit'
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
  }, [delivery?.status, tick, delivery])

  // The simulator moves the rider toward the leg end but does NOT auto-advance
  // the state machine: the rider must tap "Arrived at pickup" / "Arrived at
  // drop-off" to confirm arrival, per the delivery state machine. The tick
  // loop stops once legProgress reaches 1 (the store's advance() is a no-op
  // when arrived), so the marker rests at the stop until the rider confirms.

  const handlePrimary = useCallback(() => {
    if (!delivery) return
    if (isTerminal(delivery.status)) {
      // Terminal: leave the route.
      clearActiveDelivery()
      router.replace('/jobs')
      return
    }
    advanceStatus()
  }, [delivery, advanceStatus, clearActiveDelivery, router])

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

  if (!delivery) {
    // Nothing active — bounce back to Jobs.
    return <View style={styles.empty} />
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

      <ActiveTopBar delivery={delivery} onMinimize={handleMinimize} onCancel={handlePrimary} />

      {/* Status live-region (announces status changes, invisible visually) */}
      <View
        accessibilityLiveRegion="polite"
        style={styles.liveRegion}
      >
        <Text accessibilityRole="text">{t(`rider.active.status_${delivery.status}`)}</Text>
      </View>

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
    </View>
  )
}

function isTerminal(s: DeliveryStatus): boolean {
  return s === 'delivered' || s === 'cancelled' || s === 'failed'
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
