import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOrders, useUserProfile } from '@chinooz/hooks'
import { useSessionStore } from '@chinooz/state'
import { colors, radii, spacing, duration } from '@chinooz/theme'
import { Avatar } from '@chinooz/ui'
import type { OrderStatus } from '@chinooz/types'

interface MenuItem {
  key: string
  labelKey: string
  icon: string
  onPress: () => void
  destructive?: boolean
}

interface MenuSection {
  headerKey: string
  items: MenuItem[]
}

export default function ProfileScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const logout = useSessionStore(s => s.logout)

  const { data: profile } = useUserProfile()
  const { data: allOrders } = useOrders()

  const [showSignOut, setShowSignOut] = useState(false)

  const orderCounts = useMemo(() => {
    const orders = allOrders ?? []
    return {
      toPay: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    }
  }, [allOrders])

  const requireAuth = useCallback((onAuthed: () => void) => {
    if (isLoggedIn) {
      onAuthed()
    } else {
      router.push('/phone-entry')
    }
  }, [isLoggedIn, router])

  const statusChips = [
    { key: 'to_pay', label: t('orders.tabToPay'), count: orderCounts.toPay, icon: '💳', color: '#F59E0B' },
    { key: 'processing', label: t('orders.tabProcessing'), count: orderCounts.processing, icon: '⚙️', color: '#2563EB' },
    { key: 'shipped', label: t('orders.tabShipped'), count: orderCounts.shipped, icon: '🚚', color: '#2563EB' },
    { key: 'delivered', label: t('orders.tabDelivered'), count: orderCounts.delivered, icon: '✅', color: '#16A34A' },
  ]

  const authedSections: MenuSection[] = [
    {
      headerKey: 'profile.shoppingSection',
      items: [
        { key: 'orders', labelKey: 'profile.myOrders', icon: '📦', onPress: () => requireAuth(() => router.push('/orders')) },
        { key: 'wishlist', labelKey: 'profile.wishlist', icon: '❤️', onPress: () => requireAuth(() => router.push('/wishlist')) },
        { key: 'reviews', labelKey: 'profile.reviews', icon: '⭐', onPress: () => requireAuth(() => {}) },
      ],
    },
    {
      headerKey: 'profile.accountSection',
      items: [
        { key: 'addresses', labelKey: 'profile.addresses', icon: '📍', onPress: () => requireAuth(() => router.push('/addresses')) },
        { key: 'payment', labelKey: 'profile.paymentMethods', icon: '💳', onPress: () => requireAuth(() => router.push('/payments')) },
      ],
    },
    {
      headerKey: 'profile.preferencesSection',
      items: [
        { key: 'language', labelKey: 'profile.language', icon: '🌐', onPress: () => {} },
        { key: 'notifications', labelKey: 'profile.notifications', icon: '🔔', onPress: () => requireAuth(() => {}) },
        { key: 'appearance', labelKey: 'profile.appearance', icon: '🌙', onPress: () => {} },
      ],
    },
    {
      headerKey: 'profile.supportSection',
      items: [
        { key: 'help', labelKey: 'profile.helpCenter', icon: '❓', onPress: () => {} },
        { key: 'contact', labelKey: 'profile.contactUs', icon: '✉️', onPress: () => {} },
        { key: 'about', labelKey: 'profile.about', icon: 'ℹ️', onPress: () => {} },
        { key: 'terms', labelKey: 'profile.termsPrivacy', icon: '📄', onPress: () => {} },
      ],
    },
  ]

  const safeItems: MenuItem[] = [
    { key: 'language', labelKey: 'profile.language', icon: '🌐', onPress: () => {} },
    { key: 'help', labelKey: 'profile.helpCenter', icon: '❓', onPress: () => {} },
    { key: 'about', labelKey: 'profile.about', icon: 'ℹ️', onPress: () => {} },
    { key: 'terms', labelKey: 'profile.termsPrivacy', icon: '📄', onPress: () => {} },
  ]

  const handleSignOut = () => {
    setShowSignOut(false)
    logout()
  }

  const renderMenuRow = (item: MenuItem, showDivider: boolean) => (
    <React.Fragment key={item.key}>
      <TouchableOpacity
        onPress={item.onPress}
        activeOpacity={0.7}
        style={styles.menuRow}
        accessibilityRole="button"
        accessibilityLabel={t(item.labelKey)}
      >
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text style={[styles.menuLabel, item.destructive && { color: '#DC2626' }]}>
          {t(item.labelKey)}
        </Text>
        <Text style={styles.menuChevron}>›</Text>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </React.Fragment>
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!isLoggedIn ? (
          <Animated.View entering={FadeIn.duration(duration.normal)} exiting={FadeOut.duration(duration.normal)}>
            <View style={styles.signInCard}>
              <View style={styles.illustration}>
                <Text style={styles.illustrationIcon}>👤</Text>
              </View>
              <Text style={styles.welcomeTitle}>{t('profile.welcomeTitle')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('profile.welcomeSubtitle')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/phone-entry')}
                activeOpacity={0.85}
                style={styles.signInCta}
                accessibilityRole="button"
                accessibilityLabel={t('profile.signIn')}
              >
                <Text style={styles.signInCtaText}>{t('profile.signIn')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionCard}>
                {safeItems.map((item, ii) => renderMenuRow(item, ii < safeItems.length - 1))}
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(duration.normal)} exiting={FadeOut.duration(duration.normal)}>
            <View style={styles.headerCard}>
              <Avatar source={profile?.avatar} name={profile?.name} size="xl" />
              <Text style={styles.name}>{profile?.name ?? '—'}</Text>
              <Text style={styles.contact}>
                {profile?.phone ?? profile?.email ?? ''}
              </Text>
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.7}
                style={styles.editLink}
                accessibilityRole="button"
                accessibilityLabel={t('profile.editProfile')}
              >
                <Text style={styles.editText}>{t('profile.editProfile')}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {statusChips.map(chip => (
                <TouchableOpacity
                  key={chip.key}
                  onPress={() => router.push({ pathname: '/orders', params: { status: chip.key } })}
                  activeOpacity={0.8}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={`${chip.label}: ${chip.count} orders`}
                >
                  <Text style={[styles.chipIcon, { color: chip.color }]}>{chip.icon}</Text>
                  <Text style={styles.chipCount}>{chip.count}</Text>
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {authedSections.map(section => (
              <View key={section.headerKey} style={styles.section}>
                <Text style={styles.sectionHeader}>{t(section.headerKey).toUpperCase()}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((item, ii) => renderMenuRow(item, ii < section.items.length - 1))}
                </View>
              </View>
            ))}

            <View style={styles.section}>
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  onPress={() => setShowSignOut(true)}
                  activeOpacity={0.7}
                  style={styles.menuRow}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.signOut')}
                >
                  <Text style={styles.menuIcon}>🚪</Text>
                  <Text style={[styles.menuLabel, { color: '#DC2626' }]}>{t('profile.signOut')}</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      <Modal
        visible={showSignOut}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOut(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowSignOut(false)}>
          <Pressable style={styles.dialog} onPress={e => e.stopPropagation()}>
            <Text style={styles.dialogTitle}>{t('profile.confirmSignOutTitle')}</Text>
            <Text style={styles.dialogMsg}>{t('profile.confirmSignOutMsg')}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => setShowSignOut(false)}
                activeOpacity={0.7}
                style={styles.dialogStay}
                accessibilityRole="button"
                accessibilityLabel={t('profile.stay')}
              >
                <Text style={styles.dialogStayText}>{t('profile.stay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                activeOpacity={0.7}
                style={styles.dialogLeave}
                accessibilityRole="button"
                accessibilityLabel={t('profile.signOutAction')}
              >
                <Text style={styles.dialogLeaveText}>{t('profile.signOutAction')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing[8],
  },
  topBar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  // --- Sign-in prompt ---
  signInCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  illustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  illustrationIcon: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[5],
  },
  signInCta: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    height: 48,
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  signInCtaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Logged-in header ---
  headerCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing[3],
  },
  contact: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: spacing[1],
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  chevron: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },

  // --- Status chips ---
  chipsRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  chip: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: spacing[1],
  },
  chipIcon: { fontSize: 24 },
  chipCount: { fontSize: 16, fontWeight: '600', color: colors.text },
  chipLabel: { fontSize: 12, fontWeight: '400', color: colors.textMuted },

  // --- Sections ---
  section: {
    marginTop: spacing[4],
    marginHorizontal: spacing[4],
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    paddingLeft: spacing[4],
    marginBottom: spacing[2],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  menuIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  menuChevron: { fontSize: 20, color: colors.textTertiary, fontWeight: '300' },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: spacing[4] + 32 + spacing[3],
  },

  // --- Confirm dialog ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    width: '100%',
    maxWidth: 360,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  dialogMsg: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing[5],
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dialogStay: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogStayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dialogLeave: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogLeaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
})
