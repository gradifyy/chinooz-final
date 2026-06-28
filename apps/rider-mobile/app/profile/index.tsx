import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontFamily, fontSize, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import {
  getRiderQuickLinks,
  getRiderSettingsSections,
  RIDER_TIER_LABEL_KEY,
  RIDER_VERIFICATION_LABEL_KEY,
  RIDER_APP_VERSION,
} from '@chinooz/mock-data'
import { useRiderSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { useRiderProfile } from '@chinooz/hooks'
import { ProfileHubSkeleton, LoadErrorState } from '../../components/ProfileStates'
import ProfileHeader from '../../components/ProfileHeader'
import QuickLinks from '../../components/QuickLinks'
import SettingsList from '../../components/SettingsList'
import SignOutFooter from '../../components/SignOutFooter'

export default function RiderProfileScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const reduced = useReducedMotion()

  const logout = useRiderSessionStore(s => s.logout)

  // Profile via TanStack Query (120s staleTime, shared cache).
  const { data: profile, isLoading, isError, refetch } = useRiderProfile()

  // Quick links + settings sections are static config (no API call).
  const quickLinks = useMemo(() => getRiderQuickLinks(), [])
  const sections = useMemo(() => getRiderSettingsSections(), [])

  // Staggered entrance: each section fades + slides in with a delay.
  const enterOpacity = useSharedValue(reduced ? 1 : 0)
  const enterTranslate = useSharedValue(reduced ? 0 : 12)

  useEffect(() => {
    analytics.screen({ name: 'rider-profile' })
  }, [])

  // Trigger entrance animation after data settles.
  useEffect(() => {
    if (isLoading || !profile) return
    if (!reduced) {
      enterOpacity.value = 0
      enterTranslate.value = 12
      enterOpacity.value = withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut), reduceMotion: ReduceMotion.System })
      enterTranslate.value = withTiming(0, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut), reduceMotion: ReduceMotion.System })
    }
  }, [isLoading, profile, reduced])

  // Resolve all i18n labels once into a flat map keyed by their i18n key.
  const labels = useMemo(() => {
    const keys = new Set<string>()
    keys.add(RIDER_TIER_LABEL_KEY.gold)
    keys.add(RIDER_VERIFICATION_LABEL_KEY.verified)
    quickLinks.forEach(g => {
      keys.add(g.titleKey)
      g.links.forEach(l => {
        keys.add(l.labelKey)
        keys.add(l.descKey)
      })
    })
    sections.forEach(s => {
      keys.add(s.titleKey)
      s.rows.forEach(r => {
        keys.add(r.labelKey)
        keys.add(r.descKey)
        keys.add(r.status.labelKey)
      })
    })
    const map: Record<string, string> = {}
    keys.forEach(k => {
      map[k] = t(k)
    })
    return map
  }, [quickLinks, sections, t])

  const handleNavigate = (route: string, label: string) => {
    analytics.track({ name: 'rider_profile_nav', props: { route, label } })
    router.push(route as any)
  }

  const handleSignOut = () => {
    logout()
    router.replace('/home')
  }

  // Staggered entrance styles per section (hooks must be before early returns).
  const headerStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterTranslate.value }],
  }))
  const linksStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterTranslate.value }],
  }))
  const settingsStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterTranslate.value }],
  }))
  const footerStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterTranslate.value }],
  }))

  if (isLoading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[5],
          paddingBottom: insets.bottom + spacing[10],
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle} accessibilityRole="header">
          {t('rider.profile.title')}
        </Text>
        <ProfileHubSkeleton ariaLabel={t('rider.profile.skeletonHubAria')} />
      </ScrollView>
    )
  }

  if (isError || !profile) {
    return (
      <View style={[styles.container, styles.errorWrap]}>
        <LoadErrorState
          title={t('rider.profile.errorLoadTitle')}
          subtitle={t('rider.profile.errorLoadBody')}
          retry={t('rider.profile.errorLoadRetry')}
          retryAria={t('rider.profile.errorLoadRetryAria')}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  const tierLabel = t(RIDER_TIER_LABEL_KEY[profile.tier])
  const verificationLabel = t(RIDER_VERIFICATION_LABEL_KEY[profile.verification])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing[3], paddingBottom: insets.bottom + spacing[10] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle} accessibilityRole="header">
        {t('rider.profile.title')}
      </Text>

      <Animated.View style={headerStyle}>
        <ProfileHeader
          profile={profile}
          tierLabel={tierLabel}
          verificationLabel={verificationLabel}
          memberSinceLabel={t('rider.profile.memberSince')}
          zoneLabel={t('rider.profile.zoneLabel')}
          headerAria={t('rider.profile.headerAria', {
            name: profile.name,
            rating: profile.rating,
            count: profile.ratingCount,
            tier: tierLabel,
            verification: verificationLabel,
          })}
          ratingAria={t('rider.profile.ratingAria', {
            rating: profile.rating,
            count: profile.ratingCount,
          })}
          tierAria={t('rider.profile.tierAria', { tier: tierLabel })}
          verificationAria={t('rider.profile.verificationAria', {
            status: verificationLabel,
          })}
        />
      </Animated.View>

      <Animated.View style={linksStyle}>
        <QuickLinks
          groups={quickLinks}
          labels={labels}
          groupAria={t('rider.profile.quickLinksAria')}
          onPress={handleNavigate}
        />
      </Animated.View>

      <Animated.View style={settingsStyle}>
        <SettingsList
          sections={sections}
          labels={labels}
          groupAria={t('rider.profile.settingsAria')}
          onPress={handleNavigate}
        />
      </Animated.View>

      <Animated.View style={footerStyle}>
        <SignOutFooter
          versionLabel={t('rider.profile.appVersion', { version: RIDER_APP_VERSION })}
          signOutLabel={t('rider.profile.signOut')}
          signOutAria={t('rider.profile.signOutAria')}
          confirmTitle={t('rider.profile.signOutTitle')}
          confirmMsg={t('rider.profile.signOutMsg')}
          cancelLabel={t('rider.profile.signOutCancel')}
          confirmLabel={t('rider.profile.signOutConfirm')}
          onSignOut={handleSignOut}
        />
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing[5],
    gap: spacing[5],
  },
  screenTitle: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
})
