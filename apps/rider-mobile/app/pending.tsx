import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Clock, LifeBuoy } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useRiderSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import { analytics } from '@chinooz/analytics'
import LanguageToggle from '../components/LanguageToggle'

/**
 * RO6 — rider approval / pending state.
 * Shown when an existing rider's account is still under review. Lets the
 * rider sign out (back to welcome) or reach support. No way to go online.
 */
export default function PendingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const logout = useRiderSessionStore(s => s.logout)

  useEffect(() => {
    analytics.screen({ name: 'rider-pending' })
  }, [])

  const handleLogout = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_logout' })
    logout()
    router.replace('/welcome')
  }

  const handleSupport = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_support' })
    router.push('/support')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.content}>
        <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 20}>
          <View style={styles.iconWrap} accessibilityRole="image">
            <Clock size={40} color={colors.primary} strokeWidth={2} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {t('rider.pending.title')}
          </Text>
          <Text style={styles.subtitle}>{t('rider.pending.subtitle')}</Text>
          <Text style={styles.hint}>{t('rider.pending.hint')}</Text>
        </SlideUp>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
          <TouchableOpacity
            onPress={handleSupport}
            style={styles.supportButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('rider.pending.contactSupport')}
          >
            <LifeBuoy size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.supportText}>{t('rider.pending.contactSupport')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.pending.logoutAria')}
          >
            <Text style={styles.logoutText}>{t('rider.pending.logout')}</Text>
          </TouchableOpacity>
        </SlideUp>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[1],
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  supportText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
  },
  logoutText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
