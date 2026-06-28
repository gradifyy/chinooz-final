import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import {
  getRiderProfile,
  getRiderQuickLinks,
  getRiderSettingsSections,
  RIDER_TIER_LABEL_KEY,
  RIDER_VERIFICATION_LABEL_KEY,
  RIDER_APP_VERSION,
  type RiderProfileHub,
  type RiderQuickLinkGroup,
  type RiderSettingsSection,
} from '@chinooz/mock-data'
import { useRiderSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import ProfileHeader from '../../components/ProfileHeader'
import QuickLinks from '../../components/QuickLinks'
import SettingsList from '../../components/SettingsList'
import SignOutFooter from '../../components/SignOutFooter'

export default function RiderProfileScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const logout = useRiderSessionStore(s => s.logout)

  const [profile, setProfile] = useState<RiderProfileHub | null>(null)
  const [quickLinks, setQuickLinks] = useState<RiderQuickLinkGroup[]>([])
  const [sections, setSections] = useState<RiderSettingsSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analytics.screen({ name: 'rider-profile' })
    let active = true
    ;(async () => {
      const [p, ql, ss] = await Promise.all([
        getRiderProfile(),
        Promise.resolve(getRiderQuickLinks()),
        Promise.resolve(getRiderSettingsSections()),
      ])
      if (!active) return
      setProfile(p)
      setQuickLinks(ql)
      setSections(ss)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

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

  if (loading || !profile) {
    return (
      <View style={[styles.container, styles.loadingWrap]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('rider.profile.skeletonAria')}</Text>
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

      <QuickLinks
        groups={quickLinks}
        labels={labels}
        groupAria={t('rider.profile.quickLinksAria')}
        onPress={handleNavigate}
      />

      <SettingsList
        sections={sections}
        labels={labels}
        groupAria={t('rider.profile.settingsAria')}
        onPress={handleNavigate}
      />

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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
})
