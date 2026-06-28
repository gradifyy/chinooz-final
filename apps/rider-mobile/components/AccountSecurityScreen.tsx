import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  AccessibilityInfo,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  Globe,
  Lock,
  Fingerprint,
  ScanFace,
  Smartphone,
  KeyRound,
  LogOut,
  ChevronRight,
  Banknote,
  LifeBuoy,
  FileText,
  ShieldCheck,
  UserX,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react-native'
import {
  colors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  duration,
  easing,
} from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  useRiderSecurity,
  useUpdateRiderSecurity,
  useChangeRiderPin,
  useSignOutAllSessions,
  useDeactivateRiderAccount,
  useDeleteRiderAccount,
} from '@chinooz/hooks'
import { useA11y } from './A11yProvider'
import { useUIStore, useRiderSessionStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'
import {
  type RiderSecurity,
  type RiderActiveSession,
} from '@chinooz/mock-data'

// ----- Toggle switch (animated knob) --------------------------------------

interface ToggleProps {
  value: boolean
  onValueChange: (v: boolean) => void
  ariaLabel: string
  disabled?: boolean
  reduced: boolean
}

function Toggle({ value, onValueChange, ariaLabel, disabled, reduced }: ToggleProps) {
  const knobX = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    knobX.value = reduced
      ? value ? 1 : 0
      : withSpring(value ? 1 : 0, { damping: 20, stiffness: 400, mass: 0.8, reduceMotion: ReduceMotion.System })
  }, [value, reduced])

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value * 20 }],
  }))

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toggleTrack,
        { backgroundColor: value ? colors.success : colors.border },
        disabled && styles.toggleDisabled,
        pressed && styles.togglePressed,
      ]}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  )
}

// ----- Confirm dialog -----------------------------------------------------

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  confirmAriaLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmAriaLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View
          style={styles.modalCard}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {destructive && (
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={24} color={colors.error} />
            </View>
          )}
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                destructive ? styles.destructiveBtn : styles.confirmBtn,
                pressed && (destructive ? styles.destructivePressed : styles.confirmPressed),
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmAriaLabel}
            >
              <Text
                style={destructive ? styles.destructiveText : styles.confirmText}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ----- Main screen --------------------------------------------------------

export default function AccountSecurityScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { reducedMotion } = useA11y()

  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)
  const logout = useRiderSessionStore(s => s.logout)

  // TanStack Query: security (120s staleTime, shared cache + optimistic).
  const { data: securityData, isLoading: loading } = useRiderSecurity()
  const updateSecurityMutation = useUpdateRiderSecurity()
  const changePinMutation = useChangeRiderPin()
  const signOutAllMutation = useSignOutAllSessions()
  const deactivateMutation = useDeactivateRiderAccount()
  const deleteMutation = useDeleteRiderAccount()

  const [security, setSecurity] = useState<RiderSecurity | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Confirm dialog state
  const [dialog, setDialog] = useState<
    | { kind: 'signOutAll' | 'deactivate' | 'delete'; title: string; message: string; confirmLabel: string; confirmAria: string; destructive: boolean }
    | null
  >(null)
  const [actionLoading, setActionLoading] = useState(false)

  const announce = useCallback((msg: string) => {
    try {
      ;(AccessibilityInfo as any).announceForScreenReader?.(msg)
    } catch {}
  }, [])

  // Sync query data → local state.
  useEffect(() => {
    if (securityData) setSecurity(securityData)
  }, [securityData])

  useFocusEffect(
    React.useCallback(() => {
      analytics.screen({ name: 'rider-account-security' })
    }, []),
  )

  // ----- Language switch (instant, app-wide) -----------------------------
  const handleLocaleChange = useCallback(
    (next: Locale) => {
      if (next === locale) return
      setLocale(next)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      announce(
        `${t('rider.security.sectionLanguage')}: ${next === 'ne' ? t('rider.security.languageNepali') : t('rider.security.languageEnglish')}`,
      )
    },
    [locale, setLocale, t, announce],
  )

  // ----- Security toggles (instant + persist) -----------------------------
  const updateSecurity = useCallback(
    (key: 'pinEnabled' | 'biometricEnabled', value: boolean) => {
      setSecurity(prev => (prev ? { ...prev, [key]: value } : prev))
      updateSecurityMutation.mutate({ [key]: value })
      try {
        Haptics.impactAsync(
          value ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
        )
      } catch {}
      const label =
        key === 'pinEnabled' ? t('rider.security.pinLock') : t('rider.security.biometricLock')
      announce(
        `${label}: ${value ? t('rider.security.saved') : t('rider.security.toggleAria', { label })}`,
      )
    },
    [t, announce],
  )

  const handleChangePin = useCallback(async () => {
    setActionLoading(true)
    try {
      await changePinMutation.mutateAsync(`change-pin-${Date.now()}`)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      announce(t('rider.security.pinChangedAria'))
      setStatusMsg(t('rider.security.pinChanged'))
      setTimeout(() => setStatusMsg(null), 3000)
    } catch {}
    setActionLoading(false)
  }, [t, announce])

  // ----- Sign out all sessions -------------------------------------------
  const handleSignOutAll = useCallback(async () => {
    setDialog(null)
    setActionLoading(true)
    try {
      await signOutAllMutation.mutateAsync(`signout-all-${Date.now()}`)
      // Keep only the current session.
      setSecurity(prev =>
        prev ? { ...prev, sessions: prev.sessions.filter(s => s.current) } : prev,
      )
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      announce(t('rider.security.signedOutAll'))
      setStatusMsg(t('rider.security.signedOutAll'))
      setTimeout(() => setStatusMsg(null), 3000)
    } catch {}
    setActionLoading(false)
  }, [announce, t])

  // ----- Destructive account actions -------------------------------------
  const handleDeactivate = useCallback(async () => {
    setDialog(null)
    setActionLoading(true)
    try {
      await deactivateMutation.mutateAsync(`deactivate-${Date.now()}`)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } catch {}
      announce(t('rider.security.deactivateDone'))
      setStatusMsg(t('rider.security.deactivateDone'))
      // Log out via the auth boundary after deactivation.
      setTimeout(() => {
        logout()
        router.replace('/home')
      }, 1200)
    } catch {}
    setActionLoading(false)
  }, [announce, t, logout, router])

  const handleDelete = useCallback(async () => {
    setDialog(null)
    setActionLoading(true)
    try {
      await deleteMutation.mutateAsync(`delete-account-${Date.now()}`)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      announce(t('rider.security.deleteDone'))
      // Log out via the auth boundary after deletion.
      logout()
      router.replace('/home')
    } catch {}
    setActionLoading(false)
  }, [announce, t, logout, router])

  // ----- Biometric type label --------------------------------------------
  const biometricTypeLabel = useMemo(() => {
    if (!security || security.biometricType === 'none') {
      return t('rider.security.biometricTypeNone')
    }
    return security.biometricType === 'face'
      ? t('rider.security.biometricTypeFace')
      : t('rider.security.biometricTypeFingerprint')
  }, [security, t])

  const biometricAvailable = !!security && security.biometricType !== 'none'

  // ----- Loading ---------------------------------------------------------
  if (loading || !security) {
    return (
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('rider.profile.back')}
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {t('rider.security.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <View style={styles.loadingWrap} accessibilityRole="summary" accessibilityLiveRegion="polite">
          <Text style={styles.loadingText}>{t('rider.security.skeletonAria')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('rider.profile.back')}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('rider.security.title')}
        </Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('rider.security.subtitle')}</Text>

        {/* ---------- Language ---------- */}
        <SectionLabel text={t('rider.security.sectionLanguage')} />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Globe size={18} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('rider.security.sectionLanguage')}</Text>
              <Text style={styles.rowDesc}>{t('rider.security.languageDesc')}</Text>
            </View>
          </View>
          <View style={styles.localeRow} accessibilityRole="radiogroup" accessibilityLabel={t('rider.security.languageAria')}>
            <Pressable
              onPress={() => handleLocaleChange('en')}
              style={({ pressed }) => [
                styles.localeBtn,
                locale === 'en' && styles.localeBtnActive,
                pressed && styles.localeBtnPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: locale === 'en' }}
              accessibilityLabel={t('rider.security.languageEnglish')}
            >
              <Check size={14} color={locale === 'en' ? colors.white : 'transparent'} />
              <Text
                style={[styles.localeBtnText, locale === 'en' && styles.localeBtnTextActive]}
              >
                {t('rider.security.languageEnglish')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleLocaleChange('ne')}
              style={({ pressed }) => [
                styles.localeBtn,
                locale === 'ne' && styles.localeBtnActive,
                pressed && styles.localeBtnPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: locale === 'ne' }}
              accessibilityLabel={t('rider.security.languageNepali')}
            >
              <Check size={14} color={locale === 'ne' ? colors.white : 'transparent'} />
              <Text
                style={[styles.localeBtnText, locale === 'ne' && styles.localeBtnTextActive]}
              >
                {t('rider.security.languageNepali')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ---------- Security ---------- */}
        <SectionLabel text={t('rider.security.sectionSecurity')} />

        <View style={styles.card}>
          {/* PIN lock toggle */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Lock size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('rider.security.pinLock')}</Text>
              <Text style={styles.rowDesc}>{t('rider.security.pinLockDesc')}</Text>
            </View>
            <Toggle
              value={security.pinEnabled}
              onValueChange={v => updateSecurity('pinEnabled', v)}
              ariaLabel={t('rider.security.toggleAria', { label: t('rider.security.pinLock') })}
              reduced={reduced}
            />
          </View>

          {/* Change PIN (only when PIN enabled) */}
          {security.pinEnabled && (
            <PressableRow
              icon={<KeyRound size={18} color={colors.textSecondary} />}
              label={t('rider.security.changePin')}
              onPress={handleChangePin}
              ariaLabel={t('rider.security.changePinAria')}
              loading={actionLoading}
              trailing="chevron"
              dividerTop
            />
          )}

          {/* Biometric toggle */}
          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.rowIcon}>
              {security.biometricType === 'face' ? (
                <ScanFace size={18} color={colors.textSecondary} />
              ) : (
                <Fingerprint size={18} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('rider.security.biometricLock')}</Text>
              <Text style={styles.rowDesc}>
                {biometricAvailable
                  ? t('rider.security.biometricLockDesc', { type: biometricTypeLabel })
                  : t('rider.security.biometricUnavailable')}
              </Text>
            </View>
            <Toggle
              value={security.biometricEnabled}
              onValueChange={v => updateSecurity('biometricEnabled', v)}
              ariaLabel={t('rider.security.toggleAria', { label: t('rider.security.biometricLock') })}
              disabled={!biometricAvailable}
              reduced={reduced}
            />
          </View>
        </View>

        {/* ---------- Active sessions ---------- */}
        <SectionLabel text={t('rider.security.sectionSessions')} />
        <Text style={styles.sectionDesc}>{t('rider.security.sessionsDesc')}</Text>

        <View style={styles.card}>
          {security.sessions.map((sess, idx) => (
            <SessionRow
              key={sess.id}
              session={sess}
              isLast={idx === security.sessions.length - 1}
              currentLabel={t('rider.security.currentSession')}
              lastActiveLabel={t('rider.security.lastActive', { date: formatDate(sess.lastActive) })}
            />
          ))}
        </View>

        {security.sessions.some(s => !s.current) && (
          <Pressable
            onPress={() =>
              setDialog({
                kind: 'signOutAll',
                title: t('rider.security.signOutAllConfirmTitle'),
                message: t('rider.security.signOutAllConfirmMsg'),
                confirmLabel: t('rider.security.signOutAllConfirmAction'),
                confirmAria: t('rider.security.signOutAllAria'),
                destructive: false,
              })
            }
            style={({ pressed }) => [styles.signOutAllBtn, pressed && styles.signOutAllPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('rider.security.signOutAllAria')}
          >
            <LogOut size={16} color={colors.primary} />
            <Text style={styles.signOutAllText}>{t('rider.security.signOutAll')}</Text>
          </Pressable>
        )}

        {/* ---------- Account ---------- */}
        <SectionLabel text={t('rider.security.sectionAccount')} />

        <View style={styles.card}>
          <PressableRow
            icon={<Banknote size={18} color={colors.success} />}
            label={t('rider.security.payoutMethods')}
            desc={t('rider.security.payoutMethodsDesc')}
            onPress={() => router.push('/earnings')}
            ariaLabel={t('rider.security.payoutMethodsAria')}
            trailing="chevron"
          />
          <PressableRow
            icon={<LifeBuoy size={18} color={colors.error} />}
            label={t('rider.security.helpCenter')}
            desc={t('rider.security.helpCenterDesc')}
            onPress={() => router.push('/profile/support')}
            ariaLabel={t('rider.security.helpCenterAria')}
            trailing="chevron"
            dividerTop
          />
        </View>

        {/* Legal links */}
        <View style={styles.card}>
          <PressableRow
            icon={<FileText size={18} color={colors.textSecondary} />}
            label={t('rider.security.terms')}
            onPress={() => router.push('/terms')}
            ariaLabel={t('rider.security.termsAria')}
            trailing="chevron"
          />
          <PressableRow
            icon={<ShieldCheck size={18} color={colors.textSecondary} />}
            label={t('rider.security.privacy')}
            onPress={() => router.push('/privacy')}
            ariaLabel={t('rider.security.privacyAria')}
            trailing="chevron"
            dividerTop
          />
          <PressableRow
            icon={<FileText size={18} color={colors.textSecondary} />}
            label={t('rider.security.riderAgreement')}
            onPress={() => router.push('/rider-agreement')}
            ariaLabel={t('rider.security.riderAgreementAria')}
            trailing="chevron"
            dividerTop
          />
        </View>

        {/* ---------- Account actions ---------- */}
        <SectionLabel text={t('rider.security.sectionActions')} />

        <View style={styles.card}>
          <PressableRow
            icon={<UserX size={18} color={colors.warning} />}
            label={t('rider.security.deactivate')}
            desc={t('rider.security.deactivateDesc')}
            onPress={() =>
              setDialog({
                kind: 'deactivate',
                title: t('rider.security.deactivateTitle'),
                message: t('rider.security.deactivateMsg'),
                confirmLabel: t('rider.security.deactivateAction'),
                confirmAria: t('rider.security.deactivateAria'),
                destructive: true,
              })
            }
            ariaLabel={t('rider.security.deactivateAria')}
            trailing="chevron"
          />
          <PressableRow
            icon={<Trash2 size={18} color={colors.error} />}
            label={t('rider.security.delete')}
            desc={t('rider.security.deleteDesc')}
            onPress={() =>
              setDialog({
                kind: 'delete',
                title: t('rider.security.deleteTitle'),
                message: t('rider.security.deleteMsg'),
                confirmLabel: t('rider.security.deleteAction'),
                confirmAria: t('rider.security.deleteAria'),
                destructive: true,
              })
            }
            ariaLabel={t('rider.security.deleteAria')}
            trailing="chevron"
            danger
            dividerTop
          />
        </View>

        {/* Status message — fade-in */}
        {statusMsg && (
          <AnimatedStatusRow
            text={statusMsg}
            reduced={reduced}
          />
        )}
      </ScrollView>

      {/* Confirm dialog */}
      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        cancelLabel={t('rider.security.cancel')}
        confirmLabel={dialog?.confirmLabel ?? ''}
        confirmAriaLabel={dialog?.confirmAria ?? ''}
        destructive={dialog?.destructive}
        onConfirm={() => {
          if (dialog?.kind === 'signOutAll') handleSignOutAll()
          else if (dialog?.kind === 'deactivate') handleDeactivate()
          else if (dialog?.kind === 'delete') handleDelete()
        }}
        onCancel={() => setDialog(null)}
      />
    </View>
  )
}

// ----- Helpers ------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

// ----- Sub-components -----------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {text}
      </Text>
    </View>
  )
}

function SessionRow({
  session,
  isLast,
  currentLabel,
  lastActiveLabel,
}: {
  session: RiderActiveSession
  isLast: boolean
  currentLabel: string
  lastActiveLabel: string
}) {
  return (
    <View
      style={[styles.sessionRow, !isLast && styles.rowDivider]}
      accessibilityRole="summary"
      accessibilityLabel={`${session.device}. ${session.location}. ${lastActiveLabel}${session.current ? `. ${currentLabel}` : ''}`}
    >
      <View style={styles.sessionIcon}>
        <Smartphone size={18} color={session.current ? colors.primary : colors.textTertiary} />
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionDevice} numberOfLines={1}>
          {session.device}
        </Text>
        <Text style={styles.sessionMeta} numberOfLines={1}>
          {session.location} · {lastActiveLabel}
        </Text>
      </View>
      {session.current && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>{currentLabel}</Text>
        </View>
      )}
    </View>
  )
}

interface PressableRowProps {
  icon: React.ReactNode
  label: string
  desc?: string
  onPress: () => void
  ariaLabel: string
  trailing?: 'chevron'
  loading?: boolean
  dividerTop?: boolean
  danger?: boolean
}

function PressableRow({
  icon,
  label,
  desc,
  onPress,
  ariaLabel,
  trailing,
  loading,
  dividerTop,
  danger,
}: PressableRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.row,
        dividerTop && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]} numberOfLines={1}>
          {label}
        </Text>
        {desc && <Text style={styles.rowDesc} numberOfLines={2}>{desc}</Text>}
      </View>
      {loading ? (
        <Text style={styles.loadingLabel}>…</Text>
      ) : trailing === 'chevron' ? (
        <ChevronRight size={18} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  )
}

// ----- Animated status row (fade-in) -------------------------------------

function AnimatedStatusRow({ text, reduced }: { text: string; reduced: boolean }) {
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : 8)

  useEffect(() => {
    if (reduced) {
      opacity.value = 1
      translateY.value = 0
      return
    }
    opacity.value = 0
    translateY.value = 8
    opacity.value = withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut), reduceMotion: ReduceMotion.System })
    translateY.value = withTiming(0, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut), reduceMotion: ReduceMotion.System })
  }, [text, reduced])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View
      style={[styles.statusRow, style]}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <Check size={15} color={colors.success} />
      <Text style={styles.statusText}>{text}</Text>
    </Animated.View>
  )
}

// ----- Styles -------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.background,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  backBtnPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  sectionLabelWrap: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[1],
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    paddingHorizontal: spacing[1],
    marginTop: -spacing[2],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    minHeight: 56,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rowLabelDanger: {
    color: colors.error,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  loadingLabel: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  // Locale switch
  localeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  localeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  localeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  localeBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  localeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  localeBtnTextActive: {
    color: colors.white,
  },
  // Toggle
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: radii.full,
    padding: 2,
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  togglePressed: {
    opacity: 0.8,
  },
  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    minHeight: 56,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDevice: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  currentBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    flexShrink: 0,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Sign out all
  signOutAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary50,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  signOutAllPressed: {
    backgroundColor: colors.primary50,
  },
  signOutAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    width: '100%',
    maxWidth: 340,
    gap: spacing[3],
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  modalTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    textAlign: 'center',
  },
  modalMsg: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: colors.borderLight,
  },
  cancelText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmPressed: {
    backgroundColor: colors.primaryDark,
  },
  confirmText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  destructiveBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  destructivePressed: {
    backgroundColor: '#B91C1C',
  },
  destructiveText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
