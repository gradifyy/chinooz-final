import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { useA11y } from '../components/A11yProvider'
import { useSellerSessionStore, useSellerMessagesStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'

export default function SellerHomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const seller = useSellerSessionStore(s => s.seller)
  const store = useSellerSessionStore(s => s.store)
  const kycStatus = useSellerSessionStore(s => s.kycStatus)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)
  const devMock = useSellerSessionStore(s => s.devMock)
  const toggleDevMock = useSellerSessionStore(s => s.toggleDevMock)
  const logout = useSellerSessionStore(s => s.logout)
  const unread = useSellerMessagesStore(s => s.unreadCount)

  useEffect(() => {
    analytics.screen({ name: 'seller-home' })
  }, [])

  if (!isLoggedIn) {
    return <Redirect href="/onboarding" />
  }

  const handleLogout = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    logout()
    router.replace('/onboarding')
  }

  const handleMessages = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push('/messages')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <View style={styles.logoDot} />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('seller.home')}
          </Text>
          <Text style={styles.subtitle}>{seller.name || t('seller.title')}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('seller.kycPending').split(' ')[0]}</Text>
          <Text style={styles.statusValue}>{kycStatus}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('seller.goLive')}</Text>
          <Text style={styles.statusValue}>{goLiveStatus}</Text>
        </View>
        {store && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Store</Text>
            <Text style={styles.statusValue}>{store.name}</Text>
          </View>
        )}

        <Text style={styles.placeholder}>{t('seller.placeholder')}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `${t('seller.messages.tab')} · ${unread} ${t('seller.messages.unreadAria', { count: unread })}` : t('seller.messages.tab')}
          onPress={handleMessages}
          style={[styles.devToggle, { minHeight: minTouchTarget }]}
        >
          <Text style={styles.devToggleText}>{t('seller.messages.tab')}</Text>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.devToggle')}
          onPress={toggleDevMock}
          style={[styles.devToggle, { minHeight: minTouchTarget }]}
        >
          <Text style={styles.devToggleText}>
            {t('seller.devToggle')}: {devMock ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.logout')}
          onPress={handleLogout}
          style={[styles.logout, { minHeight: minTouchTarget }]}
        >
          <Text style={styles.logoutText}>{t('seller.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 13, color: colors.primary50, marginTop: 2 },
  body: { padding: spacing[5], gap: spacing[3] },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  statusValue: { fontSize: 14, color: colors.text, fontWeight: '600', textTransform: 'capitalize' },
  placeholder: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginVertical: spacing[4],
  },
  devToggle: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  devToggleText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  unreadBadge: {
    position: 'absolute',
    right: spacing[4],
    backgroundColor: '#DC2626',
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
  },
  unreadBadgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  logout: {
    backgroundColor: colors.error,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  logoutText: { fontSize: 14, color: colors.white, fontWeight: '700' },
})
