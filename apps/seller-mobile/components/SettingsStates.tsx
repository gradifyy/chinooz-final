import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, WifiOff, ShieldCheck, RefreshCw, Plus } from 'lucide-react-native'
import { colors, spacing, radii } from '@chinooz/theme'
import { Skeleton } from '@chinooz/ui'

// ── Hook: useOnline ───────────────────────────────────────────────────────

export function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    let unsub: (() => void) | undefined
    import('@react-native-community/netinfo').then(({ default: NetInfo }) => {
      unsub = NetInfo.addEventListener((state: { isConnected: boolean; isInternetReachable: boolean | null }) => {
        setOnline(state.isConnected && state.isInternetReachable !== false)
      })
    }).catch(() => {
      // NetInfo not available, assume online
    })
    return () => { unsub?.() }
  }, [])
  return online
}

// ── Skeletons ──────────────────────────────────────────────────────────────

export function SettingsHubSkeleton() {
  return (
    <View style={styles.skeletonWrap} accessible={false} aria-busy="true">
      <View style={styles.skelCard}>
        <View style={styles.skelHeaderRow}>
          <Skeleton circle width={48} height={48} />
          <View style={styles.skelFlex}>
            <Skeleton width={160} height={20} />
            <View style={{ height: 8 }} />
            <Skeleton width={96} height={12} />
          </View>
          <Skeleton width={80} height={24} borderRadius={radii.full} />
        </View>
      </View>
      <View style={styles.skelListCard}>
        {[0, 1, 2].map(g => (
          <View key={g}>
            <View style={styles.skelGroupHeader}>
              <Skeleton width={96} height={12} />
            </View>
            {[0, 1].map(r => (
              <View key={r} style={styles.skelRow}>
                <Skeleton width={36} height={36} borderRadius={radii.md} />
                <View style={styles.skelFlex}>
                  <Skeleton width={128} height={16} />
                  <View style={{ height: 6 }} />
                  <Skeleton width={80} height={12} />
                </View>
                <Skeleton width={16} height={16} circle />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

export function FormSkeleton() {
  return (
    <View style={styles.skeletonWrap} aria-busy="true">
      {[0, 1].map(s => (
        <View key={s} style={styles.skelCard}>
          <View style={styles.skelGroupHeader}>
            <Skeleton width={128} height={16} />
          </View>
          <View style={{ gap: spacing[4] }}>
            {[0, 1, 2].map(f => (
              <View key={f}>
                <Skeleton width={96} height={14} />
                <View style={{ height: 6 }} />
                <Skeleton width={'100%'} height={40} style={{ borderRadius: radii.md }} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

// ── Error State ────────────────────────────────────────────────────────────

export function SettingsErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.errorWrap} accessibilityRole="alert">
      <AlertTriangle size={32} color={colors.warning} />
      <Text style={styles.errorTitle}>{t('seller.settings.states.loadErrorTitle')}</Text>
      <Text style={styles.errorSubtitle}>{t('seller.settings.states.loadErrorSubtitle')}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('seller.settings.states.retryAria')} style={styles.retryBtn}>
        <RefreshCw size={14} color={colors.primary} />
        <Text style={styles.retryBtnText}>{t('seller.settings.states.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Save Error ─────────────────────────────────────────────────────────────

export function SaveErrorBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.saveErrorBanner} accessibilityRole="alert">
      <Text style={styles.saveErrorText}>{t('seller.settings.states.saveError')}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('seller.settings.states.retry')} style={styles.saveRetryBtn}>
        <Text style={styles.saveRetryText}>{t('seller.settings.states.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Offline Banner ─────────────────────────────────────────────────────────

export function SellerOfflineBanner({ blocked }: { blocked?: boolean }) {
  const { t } = useTranslation()
  return (
    <View style={styles.offlineBanner} accessibilityRole="status" accessibilityLiveRegion="polite">
      <WifiOff size={16} color={colors.warning} />
      <Text style={styles.offlineText}>{blocked ? t('seller.settings.states.offlineBlockSensitive') : t('seller.settings.states.offlineTitle')}</Text>
    </View>
  )
}

// ── Permission Denied ─────────────────────────────────────────────────────

export function PermissionDenied({ ownerName }: { ownerName?: string }) {
  const { t } = useTranslation()
  return (
    <View style={styles.permWrap}>
      <View style={styles.permIcon}>
        <ShieldCheck size={28} color={colors.primary} />
      </View>
      <Text style={styles.permTitle}>{t('seller.settings.states.permissionDeniedTitle')}</Text>
      <Text style={styles.permBody}>{t('seller.settings.states.permissionDeniedBody')}</Text>
      <View style={styles.permAskBox}>
        <Text style={styles.permAskTitle}>{t('seller.settings.states.permissionDeniedWhoToAsk')}</Text>
        <Text style={styles.permAskHint}>
          {t('seller.settings.states.permissionDeniedWhoToAskHint')}
          {ownerName ? ` — ${ownerName}` : ''}
        </Text>
      </View>
    </View>
  )
}

// ── Empty State with Illustration ─────────────────────────────────────────

export function SettingsEmptyState({ title, subtitle, ctaLabel, onCta }: { title: string; subtitle: string; ctaLabel: string; onCta: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Plus size={28} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      <TouchableOpacity onPress={onCta} accessibilityRole="button" accessibilityLabel={ctaLabel} style={styles.emptyCta}>
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Upload Error ───────────────────────────────────────────────────────────

export function UploadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.uploadError} accessibilityRole="alert">
      <Text style={styles.uploadErrorText}>{t('seller.settings.states.uploadError')}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('seller.settings.states.uploadRetry')}>
        <Text style={styles.uploadRetryText}>{t('seller.settings.states.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  skeletonWrap: { gap: spacing[3] },
  skelCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  skelListCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  skelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  skelFlex: { flex: 1 },
  skelGroupHeader: { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[1.5] },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[8], gap: spacing[2] },
  errorTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], borderWidth: 2, borderColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2], marginTop: spacing[2] },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  saveErrorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.errorLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  saveErrorText: { fontSize: 13, fontWeight: '600', color: colors.error, flex: 1 },
  saveRetryBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1] },
  saveRetryText: { fontSize: 12, fontWeight: '700', color: colors.error },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderBottomWidth: 1, borderBottomColor: colors.warning, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  offlineText: { fontSize: 13, fontWeight: '600', color: colors.warning, flex: 1 },
  permWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[8], gap: spacing[2] },
  permIcon: { width: 64, height: 64, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  permTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  permBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  permAskBox: { backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginTop: spacing[3] },
  permAskTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  permAskHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[8], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyIcon: { width: 72, height: 72, borderRadius: radii.full, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
  emptyCta: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5], marginTop: spacing[2] },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.white },
  uploadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.errorLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  uploadErrorText: { fontSize: 12, fontWeight: '600', color: colors.error, flex: 1 },
  uploadRetryText: { fontSize: 12, fontWeight: '700', color: colors.error },
})
