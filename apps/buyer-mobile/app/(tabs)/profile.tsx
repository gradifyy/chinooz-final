import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOrders, useUserProfile } from '@chinooz/hooks'
import { colors, radii, spacing } from '@chinooz/theme'
import { Avatar } from '@chinooz/ui'
import type { OrderStatus } from '@chinooz/types'

interface MenuItem {
  key: string
  labelKey: string
  icon: string
  onPress: () => void
  rightElement?: React.ReactNode
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

  const { data: profile } = useUserProfile()
  const { data: allOrders } = useOrders()

  const orderCounts = useMemo(() => {
    const orders = allOrders ?? []
    return {
      toPay: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    }
  }, [allOrders])

  const statusChips = [
    {
      key: 'to_pay',
      label: t('orders.tabToPay'),
      count: orderCounts.toPay,
      icon: '💳',
      color: '#F59E0B',
    },
    {
      key: 'processing',
      label: t('orders.tabProcessing'),
      count: orderCounts.processing,
      icon: '⚙️',
      color: '#2563EB',
    },
    {
      key: 'shipped',
      label: t('orders.tabShipped'),
      count: orderCounts.shipped,
      icon: '🚚',
      color: '#2563EB',
    },
    {
      key: 'delivered',
      label: t('orders.tabDelivered'),
      count: orderCounts.delivered,
      icon: '✅',
      color: '#16A34A',
    },
  ]

  const sections: MenuSection[] = [
    {
      headerKey: 'profile.shoppingSection',
      items: [
        { key: 'orders', labelKey: 'profile.myOrders', icon: '📦', onPress: () => router.push('/orders') },
        { key: 'wishlist', labelKey: 'profile.wishlist', icon: '❤️', onPress: () => {} },
        { key: 'reviews', labelKey: 'profile.reviews', icon: '⭐', onPress: () => {} },
      ],
    },
    {
      headerKey: 'profile.accountSection',
      items: [
        { key: 'addresses', labelKey: 'profile.addresses', icon: '📍', onPress: () => {} },
        { key: 'payment', labelKey: 'profile.paymentMethods', icon: '💳', onPress: () => {} },
      ],
    },
    {
      headerKey: 'profile.preferencesSection',
      items: [
        { key: 'language', labelKey: 'profile.language', icon: '🌐', onPress: () => {} },
        { key: 'notifications', labelKey: 'profile.notifications', icon: '🔔', onPress: () => {} },
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

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <View style={styles.headerCard}>
        <Avatar
          source={profile?.avatar}
          name={profile?.name}
          size="xl"
        />
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

      {sections.map((section, si) => (
        <View key={section.headerKey} style={styles.section}>
          <Text style={styles.sectionHeader}>{t(section.headerKey).toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, ii) => (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={styles.menuRow}
                  accessibilityRole="button"
                  accessibilityLabel={t(item.labelKey)}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
                {ii < section.items.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            onPress={() => {}}
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

      <View style={{ height: spacing[8] }} />
    </ScrollView>
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
  chipIcon: {
    fontSize: 24,
  },
  chipCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
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
  menuIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: spacing[4] + 32 + spacing[3],
  },
})
