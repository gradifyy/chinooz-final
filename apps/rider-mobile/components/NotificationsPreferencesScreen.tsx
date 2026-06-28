import React, {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Bell,
  Banknote,
  Target,
  Star,
  Megaphone,
  Moon,
  Volume2,
  Vibrate,
  Navigation,
  Ruler,
  Map as MapIcon,
  Battery,
  Wifi,
  MapPin,
  Check,
} from 'lucide-react-native'
import {
  colors,
  spacing,
  radii,
  fontFamily,
  fontSize,
} from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import {
  useRiderPreferences,
  useUpdateRiderPreferences,
} from '@chinooz/hooks'
import { useA11y } from './A11yProvider'
import { useCanAcceptCodJob, useRiderPrefsStore } from '@chinooz/state'
import {
  RIDER_PREFERENCE_ZONES,
  RIDER_MAX_DISTANCE_OPTIONS,
  type RiderPreferences,
  type RiderNavApp,
  type RiderDistanceUnit,
  type RiderSoundLevel,
  type RiderHapticsLevel,
  type RiderMapStyle,
  type RiderCodPreference,
} from '@chinooz/mock-data'

// ----- Toggle switch (instant, accessible) -------------------------------

interface ToggleProps {
  value: boolean
  onValueChange: (v: boolean) => void
  ariaLabel: string
  disabled?: boolean
  reducedMotion: boolean
}

function Toggle({ value, onValueChange, ariaLabel, disabled, reducedMotion }: ToggleProps) {
  const knob = useState({ left: value ? 22 : 2 })[0]
  const animLeft = useAnimValue(value ? 22 : 2, reducedMotion)

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
      <View
        style={[
          styles.toggleKnob,
          { transform: [{ translateX: animLeft }] },
        ]}
      />
    </Pressable>
  )
}

// Lightweight animated value (avoids reanimated for a simple slide).
function useAnimValue(target: number, reduced: boolean): number {
  return target // instant in this mock; reanimated is overkill for a 20px slide
}

// ----- Segmented control (pill chooser) ----------------------------------

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onValueChange: (v: T) => void
  ariaLabel: string
}

function Segmented<T extends string | number>({
  options,
  value,
  onValueChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <View style={styles.segmentRow} accessibilityRole="radiogroup" accessibilityLabel={ariaLabel}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onValueChange(opt.value)}
            style={({ pressed }) => [
              styles.segmentBtn,
              active && styles.segmentBtnActive,
              pressed && styles.segmentBtnPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text
              style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ----- Main screen --------------------------------------------------------

export default function NotificationsPreferencesScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { reducedMotion } = useA11y()
  const canAcceptCod = useCanAcceptCodJob()

  // TanStack Query: preferences (120s staleTime, shared cache + optimistic).
  const { data: prefsData, isLoading: loading } = useRiderPreferences()
  const updatePrefsMutation = useUpdateRiderPreferences()

  // Local persistence: app prefs survive app restarts even offline.
  const localPrefs = useRiderPrefsStore()

  const [prefs, setPrefs] = useState<RiderPreferences | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const announce = useCallback((msg: string) => {
    try {
      ;(AccessibilityInfo as any).announceForScreenReader?.(msg)
    } catch {}
  }, [])

  // Sync query data → local state + hydrate local prefs store.
  useEffect(() => {
    if (prefsData) {
      setPrefs(prefsData)
      // Hydrate local store from server (one-way sync on load).
      localPrefs.hydrateFromServer({
        navApp: prefsData.app.navApp,
        distanceUnit: prefsData.app.distanceUnit,
        soundLevel: prefsData.app.soundLevel,
        hapticsLevel: prefsData.app.hapticsLevel,
        batterySaver: prefsData.app.batterySaver,
        dataSaver: prefsData.app.dataSaver,
        mapStyle: prefsData.app.mapStyle,
        preferredZones: prefsData.job.preferredZones,
        maxDistanceKm: prefsData.job.maxDistanceKm,
        codPreference: prefsData.job.codPreference,
      })
    }
  }, [prefsData])

  useFocusEffect(
    React.useCallback(() => {
      analytics.screen({ name: 'rider-notifications-prefs' })
    }, []),
  )

  // ----- Update helpers (instant + persist) ------------------------------
  const updateNotif = useCallback(
    <K extends keyof RiderPreferences['notifications']>(
      key: K,
      value: RiderPreferences['notifications'][K],
    ) => {
      setPrefs(prev => {
        if (!prev) return prev
        const next = {
          ...prev,
          notifications: { ...prev.notifications, [key]: value },
        }
        // Fire-and-forget persist.
        updatePrefsMutation.mutate({ notifications: { [key]: value } })
        return next
      })
      // Instant haptic feedback on toggle.
      try {
        if (typeof value === 'boolean') {
          Haptics.impactAsync(
            value ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
          )
        }
      } catch {}
      // Announce the new state.
      const label = t(`rider.prefs.${notifKeyToI18n(key)}`)
      announce(`${label}: ${value ? t('rider.prefs.toggleOn') : t('rider.prefs.toggleOff')}`)
    },
    [t, announce],
  )

  const updateApp = useCallback(
    <K extends keyof RiderPreferences['app']>(
      key: K,
      value: RiderPreferences['app'][K],
    ) => {
      setPrefs(prev => {
        if (!prev) return prev
        const next = {
          ...prev,
          app: { ...prev.app, [key]: value },
        }
        updatePrefsMutation.mutate({ app: { [key]: value } })
        return next
      })
      // Persist locally so settings take effect app-wide immediately.
      switch (key) {
        case 'navApp': localPrefs.setNavApp(value as RiderNavApp); break
        case 'distanceUnit': localPrefs.setDistanceUnit(value as RiderDistanceUnit); break
        case 'soundLevel': localPrefs.setSoundLevel(value as RiderSoundLevel); break
        case 'hapticsLevel': localPrefs.setHapticsLevel(value as RiderHapticsLevel); break
        case 'batterySaver': localPrefs.setBatterySaver(value as boolean); break
        case 'dataSaver': localPrefs.setDataSaver(value as boolean); break
        case 'mapStyle': localPrefs.setMapStyle(value as RiderMapStyle); break
      }
      try {
        if (typeof value === 'boolean') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      } catch {}
    },
    [localPrefs],
  )

  const updateJob = useCallback(
    <K extends keyof RiderPreferences['job']>(
      key: K,
      value: RiderPreferences['job'][K],
    ) => {
      setPrefs(prev => {
        if (!prev) return prev
        const next = {
          ...prev,
          job: { ...prev.job, [key]: value },
        }
        updatePrefsMutation.mutate({ job: { [key]: value } })
        return next
      })
      // Persist locally so job prefs take effect app-wide immediately.
      switch (key) {
        case 'maxDistanceKm': localPrefs.setMaxDistanceKm(value as number); break
        case 'codPreference': localPrefs.setCodPreference(value as RiderCodPreference); break
      }
      setSavedMsg(true)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      announce(t('rider.prefs.savedAria'))
      setTimeout(() => setSavedMsg(false), 2500)
    },
    [announce, t, localPrefs],
  )

  const toggleZone = useCallback(
    (zoneId: string) => {
      setPrefs(prev => {
        if (!prev) return prev
        const has = prev.job.preferredZones.includes(zoneId)
        const preferredZones = has
          ? prev.job.preferredZones.filter(z => z !== zoneId)
          : [...prev.job.preferredZones, zoneId]
        const next = {
          ...prev,
          job: { ...prev.job, preferredZones },
        }
        updatePrefsMutation.mutate({ job: { preferredZones } })
        // Persist locally.
        localPrefs.setPreferredZones(preferredZones)
        return next
      })
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
    },
    [localPrefs],
  )

  // ----- Loading ---------------------------------------------------------
  if (loading || !prefs) {
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
            {t('rider.prefs.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <View
          style={styles.loadingWrap}
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.loadingText}>{t('rider.prefs.skeletonAria')}</Text>
        </View>
      </View>
    )
  }

  const codAtLimit = !canAcceptCod

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
          {t('rider.prefs.title')}
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
        <Text style={styles.subtitle}>{t('rider.prefs.subtitle')}</Text>

        {/* ---------- Notifications ---------- */}
        <SectionLabel text={t('rider.prefs.sectionNotifications')} />

        <ToggleRow
          icon={<Bell size={18} color={colors.primary} />}
          label={t('rider.prefs.notifJobOffers')}
          desc={t('rider.prefs.notifJobOffersDesc')}
          value={prefs.notifications.jobOffers}
          onValueChange={v => updateNotif('jobOffers', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifJobOffers') })}
          reducedMotion={reducedMotion}
        />

        {/* Nested sound/vibration (only relevant when job offers on) */}
        {prefs.notifications.jobOffers && (
          <View style={styles.nestedRow}>
            <ToggleRow
              icon={<Volume2 size={16} color={colors.textMuted} />}
              label={t('rider.prefs.notifJobOffersSound')}
              value={prefs.notifications.jobOffersSound}
              onValueChange={v => updateNotif('jobOffersSound', v)}
              ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifJobOffersSound') })}
              reducedMotion={reducedMotion}
              compact
            />
            <ToggleRow
              icon={<Vibrate size={16} color={colors.textMuted} />}
              label={t('rider.prefs.notifJobOffersVibration')}
              value={prefs.notifications.jobOffersVibration}
              onValueChange={v => updateNotif('jobOffersVibration', v)}
              ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifJobOffersVibration') })}
              reducedMotion={reducedMotion}
              compact
            />
          </View>
        )}

        <ToggleRow
          icon={<Banknote size={18} color={colors.success} />}
          label={t('rider.prefs.notifEarnings')}
          desc={t('rider.prefs.notifEarningsDesc')}
          value={prefs.notifications.earnings}
          onValueChange={v => updateNotif('earnings', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifEarnings') })}
          reducedMotion={reducedMotion}
        />

        <ToggleRow
          icon={<Target size={18} color={colors.primary} />}
          label={t('rider.prefs.notifIncentives')}
          desc={t('rider.prefs.notifIncentivesDesc')}
          value={prefs.notifications.incentives}
          onValueChange={v => updateNotif('incentives', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifIncentives') })}
          reducedMotion={reducedMotion}
        />

        <ToggleRow
          icon={<Star size={18} color={colors.gold} />}
          label={t('rider.prefs.notifRatings')}
          desc={t('rider.prefs.notifRatingsDesc')}
          value={prefs.notifications.ratings}
          onValueChange={v => updateNotif('ratings', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifRatings') })}
          reducedMotion={reducedMotion}
        />

        <ToggleRow
          icon={<Megaphone size={18} color={colors.info} />}
          label={t('rider.prefs.notifAnnouncements')}
          desc={t('rider.prefs.notifAnnouncementsDesc')}
          value={prefs.notifications.announcements}
          onValueChange={v => updateNotif('announcements', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.notifAnnouncements') })}
          reducedMotion={reducedMotion}
        />

        {/* ---------- Quiet hours ---------- */}
        <SectionLabel text={t('rider.prefs.sectionQuietHours')} />

        <ToggleRow
          icon={<Moon size={18} color={colors.info} />}
          label={t('rider.prefs.quietHoursEnabled')}
          desc={t('rider.prefs.quietHoursDesc')}
          value={prefs.notifications.quietHoursEnabled}
          onValueChange={v => updateNotif('quietHoursEnabled', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.quietHoursEnabled') })}
          reducedMotion={reducedMotion}
        />

        {prefs.notifications.quietHoursEnabled && (
          <View style={styles.timePickerRow}>
            <TimePicker
              label={t('rider.prefs.quietHoursStart')}
              ariaLabel={t('rider.prefs.quietHoursStartAria')}
              value={prefs.notifications.quietHoursStart}
              onValueChange={v => updateNotif('quietHoursStart', v)}
            />
            <View style={styles.timeDash} />
            <TimePicker
              label={t('rider.prefs.quietHoursEnd')}
              ariaLabel={t('rider.prefs.quietHoursEndAria')}
              value={prefs.notifications.quietHoursEnd}
              onValueChange={v => updateNotif('quietHoursEnd', v)}
            />
          </View>
        )}

        {/* ---------- App preferences ---------- */}
        <SectionLabel text={t('rider.prefs.sectionAppPrefs')} />

        <ChoiceRow
          icon={<Navigation size={18} color={colors.textSecondary} />}
          label={t('rider.prefs.navApp')}
          desc={t('rider.prefs.navAppDesc')}
        >
          <Segmented<RiderNavApp>
            options={[
              { value: 'google', label: t('rider.prefs.navAppGoogle') },
              { value: 'apple', label: t('rider.prefs.navAppApple') },
              { value: 'osm', label: t('rider.prefs.navAppOsm') },
              { value: 'none', label: t('rider.prefs.navAppNone') },
            ]}
            value={prefs.app.navApp}
            onValueChange={v => updateApp('navApp', v)}
            ariaLabel={t('rider.prefs.navApp')}
          />
        </ChoiceRow>

        <ChoiceRow
          icon={<Ruler size={18} color={colors.textSecondary} />}
          label={t('rider.prefs.distanceUnit')}
        >
          <Segmented<RiderDistanceUnit>
            options={[
              { value: 'km', label: t('rider.prefs.distanceUnitKm') },
              { value: 'mile', label: t('rider.prefs.distanceUnitMile') },
            ]}
            value={prefs.app.distanceUnit}
            onValueChange={v => updateApp('distanceUnit', v)}
            ariaLabel={t('rider.prefs.distanceUnit')}
          />
        </ChoiceRow>

        <ChoiceRow
          icon={<Volume2 size={18} color={colors.textSecondary} />}
          label={t('rider.prefs.soundLevel')}
        >
          <Segmented<RiderSoundLevel>
            options={[
              { value: 'off', label: t('rider.prefs.soundLevelOff') },
              { value: 'low', label: t('rider.prefs.soundLevelLow') },
              { value: 'medium', label: t('rider.prefs.soundLevelMedium') },
              { value: 'high', label: t('rider.prefs.soundLevelHigh') },
            ]}
            value={prefs.app.soundLevel}
            onValueChange={v => updateApp('soundLevel', v)}
            ariaLabel={t('rider.prefs.soundLevel')}
          />
        </ChoiceRow>

        <ChoiceRow
          icon={<Vibrate size={18} color={colors.textSecondary} />}
          label={t('rider.prefs.hapticsLevel')}
        >
          <Segmented<RiderHapticsLevel>
            options={[
              { value: 'off', label: t('rider.prefs.hapticsLevelOff') },
              { value: 'low', label: t('rider.prefs.hapticsLevelLow') },
              { value: 'medium', label: t('rider.prefs.hapticsLevelMedium') },
              { value: 'high', label: t('rider.prefs.hapticsLevelHigh') },
            ]}
            value={prefs.app.hapticsLevel}
            onValueChange={v => updateApp('hapticsLevel', v)}
            ariaLabel={t('rider.prefs.hapticsLevel')}
          />
        </ChoiceRow>

        <ToggleRow
          icon={<Battery size={18} color={colors.success} />}
          label={t('rider.prefs.batterySaver')}
          desc={t('rider.prefs.batterySaverDesc')}
          value={prefs.app.batterySaver}
          onValueChange={v => updateApp('batterySaver', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.batterySaver') })}
          reducedMotion={reducedMotion}
        />

        <ToggleRow
          icon={<Wifi size={18} color={colors.info} />}
          label={t('rider.prefs.dataSaver')}
          desc={t('rider.prefs.dataSaverDesc')}
          value={prefs.app.dataSaver}
          onValueChange={v => updateApp('dataSaver', v)}
          ariaLabel={t('rider.prefs.toggleAria', { label: t('rider.prefs.dataSaver') })}
          reducedMotion={reducedMotion}
        />

        <ChoiceRow
          icon={<MapIcon size={18} color={colors.textSecondary} />}
          label={t('rider.prefs.mapStyle')}
        >
          <Segmented<RiderMapStyle>
            options={[
              { value: 'standard', label: t('rider.prefs.mapStyleStandard') },
              { value: 'satellite', label: t('rider.prefs.mapStyleSatellite') },
              { value: 'dark', label: t('rider.prefs.mapStyleDark') },
            ]}
            value={prefs.app.mapStyle}
            onValueChange={v => updateApp('mapStyle', v)}
            ariaLabel={t('rider.prefs.mapStyle')}
          />
        </ChoiceRow>

        {/* ---------- Job preferences ---------- */}
        <SectionLabel text={t('rider.prefs.sectionJobPrefs')} />

        {/* Preferred zones */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={styles.fieldLabel}>
              {t('rider.prefs.preferredZones')}
            </Text>
          </View>
          <Text style={styles.fieldDesc}>{t('rider.prefs.preferredZonesDesc')}</Text>
          <View style={styles.zoneWrap}>
            {RIDER_PREFERENCE_ZONES.map(zone => {
              const active = prefs.job.preferredZones.includes(zone.id)
              const label = t(zone.labelKey)
              return (
                <Pressable
                  key={zone.id}
                  onPress={() => toggleZone(zone.id)}
                  style={({ pressed }) => [
                    styles.zoneChip,
                    active && styles.zoneChipActive,
                    pressed && styles.zoneChipPressed,
                  ]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={t('rider.prefs.toggleAria', { label })}
                >
                  {active && <Check size={12} color={colors.white} strokeWidth={3} />}
                  <Text
                    style={[styles.zoneChipText, active && styles.zoneChipTextActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Max distance */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Ruler size={16} color={colors.textSecondary} />
            <Text style={styles.fieldLabel}>{t('rider.prefs.maxDistance')}</Text>
          </View>
          <Text style={styles.fieldDesc}>{t('rider.prefs.maxDistanceDesc')}</Text>
          <Segmented<number>
            options={RIDER_MAX_DISTANCE_OPTIONS.map(km => ({
              value: km,
              label: t('rider.prefs.maxDistanceValue', { km }),
            }))}
            value={prefs.job.maxDistanceKm}
            onValueChange={v => updateJob('maxDistanceKm', v)}
            ariaLabel={t('rider.prefs.maxDistance')}
          />
        </View>

        {/* COD vs prepaid */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Banknote size={16} color={colors.textSecondary} />
            <Text style={styles.fieldLabel}>{t('rider.prefs.codPreference')}</Text>
          </View>
          <Text style={styles.fieldDesc}>{t('rider.prefs.codPreferenceDesc')}</Text>
          <Segmented<RiderCodPreference>
            options={[
              { value: 'any', label: t('rider.prefs.codPreferenceAny') },
              { value: 'cod', label: t('rider.prefs.codPreferenceCod') },
              { value: 'prepaid', label: t('rider.prefs.codPreferencePrepaid') },
            ]}
            value={prefs.job.codPreference}
            onValueChange={v => updateJob('codPreference', v)}
            ariaLabel={t('rider.prefs.codPreference')}
          />
          {/* COD limit note */}
          <View
            style={[
              styles.codNote,
              codAtLimit && prefs.job.codPreference === 'cod' && styles.codNoteWarn,
            ]}
            accessibilityRole="summary"
            accessibilityLabel={t('rider.prefs.codLimitNoteAria')}
          >
            <Banknote size={13} color={codAtLimit ? colors.warning : colors.textMuted} />
            <Text
              style={[
                styles.codNoteText,
                codAtLimit && prefs.job.codPreference === 'cod' && styles.codNoteTextWarn,
              ]}
            >
              {t('rider.prefs.codLimitNote')}
            </Text>
          </View>
        </View>

        {/* Saved status */}
        {savedMsg && (
          <View
            style={styles.savedRow}
            accessibilityRole="summary"
            accessibilityLiveRegion="polite"
          >
            <Check size={15} color={colors.success} />
            <Text style={styles.savedText}>{t('rider.prefs.saved')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ----- Helpers ------------------------------------------------------------

function notifKeyToI18n(key: string): string {
  const map: Record<string, string> = {
    jobOffers: 'notifJobOffers',
    jobOffersSound: 'notifJobOffersSound',
    jobOffersVibration: 'notifJobOffersVibration',
    earnings: 'notifEarnings',
    incentives: 'notifIncentives',
    ratings: 'notifRatings',
    announcements: 'notifAnnouncements',
    quietHoursEnabled: 'quietHoursEnabled',
    quietHoursStart: 'quietHoursStart',
    quietHoursEnd: 'quietHoursEnd',
  }
  return map[key] ?? key
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

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  desc?: string
  value: boolean
  onValueChange: (v: boolean) => void
  ariaLabel: string
  disabled?: boolean
  reducedMotion: boolean
  compact?: boolean
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onValueChange,
  ariaLabel,
  disabled,
  reducedMotion,
  compact,
}: ToggleRowProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {desc && (
          <Text style={styles.rowDesc} numberOfLines={2}>
            {desc}
          </Text>
        )}
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        ariaLabel={ariaLabel}
        disabled={disabled}
        reducedMotion={reducedMotion}
      />
    </View>
  )
}

interface ChoiceRowProps {
  icon: React.ReactNode
  label: string
  desc?: string
  children: React.ReactNode
}

function ChoiceRow({ icon, label, desc, children }: ChoiceRowProps) {
  return (
    <View style={styles.choiceRow}>
      <View style={styles.choiceHeader}>
        <View style={styles.rowIcon}>{icon}</View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
          {desc && <Text style={styles.rowDesc} numberOfLines={2}>{desc}</Text>}
        </View>
      </View>
      <View style={styles.choiceBody}>{children}</View>
    </View>
  )
}

interface TimePickerProps {
  label: string
  ariaLabel: string
  value: string
  onValueChange: (v: string) => void
}

function TimePicker({ label, ariaLabel, value, onValueChange }: TimePickerProps) {
  // Simple +/- hour/minute stepper. Mock; no native time picker dependency.
  const [h, m] = value.split(':').map(Number)
  const fmt = (hh: number, mm: number) =>
    `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

  const stepHour = (dir: number) => {
    const nh = (h + dir + 24) % 24
    onValueChange(fmt(nh, m))
  }
  const stepMin = (dir: number) => {
    const nm = (m + dir + 60) % 60
    onValueChange(fmt(h, nm))
  }

  return (
    <View style={styles.timePicker} accessibilityLabel={ariaLabel}>
      <Text style={styles.timePickerLabel}>{label}</Text>
      <View style={styles.timeStepperRow}>
        <StepperButton label="−" onPress={() => stepHour(-1)} ariaLabel={`${label} hour down`} />
        <Text style={styles.timeValue}>{String(h).padStart(2, '0')}</Text>
        <StepperButton label="+" onPress={() => stepHour(1)} ariaLabel={`${label} hour up`} />
        <Text style={styles.timeColon}>:</Text>
        <StepperButton label="−" onPress={() => stepMin(-1)} ariaLabel={`${label} minute down`} />
        <Text style={styles.timeValue}>{String(m).padStart(2, '0')}</Text>
        <StepperButton label="+" onPress={() => stepMin(1)} ariaLabel={`${label} minute up`} />
      </View>
    </View>
  )
}

function StepperButton({
  label,
  onPress,
  ariaLabel,
}: {
  label: string
  onPress: () => void
  ariaLabel: string
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
    >
      <Text style={styles.stepperBtnText}>{label}</Text>
    </Pressable>
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
  // Toggle rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    minHeight: 56,
  },
  rowCompact: {
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    minHeight: 44,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
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
  rowDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Nested sub-toggles
  nestedRow: {
    marginLeft: spacing[5],
    gap: 0,
  },
  // Toggle switch
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
  // Quiet hours time picker
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  timePicker: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  timeStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    minWidth: 26,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
  timeDash: {
    width: 16,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  // Choice rows (segmented)
  choiceRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  choiceBody: {
    // segmented control renders here
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  segmentBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  segmentBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  segmentBtnTextActive: {
    color: colors.primary,
  },
  // Job prefs fields
  field: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  fieldLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  fieldDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Zone chips
  zoneWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 36,
  },
  zoneChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  zoneChipPressed: {
    backgroundColor: colors.borderLight,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  zoneChipTextActive: {
    color: colors.white,
  },
  // COD limit note
  codNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  codNoteWarn: {
    backgroundColor: colors.warningLight,
  },
  codNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  codNoteTextWarn: {
    color: '#92400E',
    fontWeight: '600',
  },
  // Saved status
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  savedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
