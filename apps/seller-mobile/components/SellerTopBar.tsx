import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Bell, Search } from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, shadows } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { useA11y } from './A11yProvider'

export function SellerTopBar({ showSearch = true }: { showSearch?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget } = useA11y()
  const store = useSellerSessionStore(s => s.store)
  const seller = useSellerSessionStore(s => s.seller)
  const notifCount = 3

  const storeName = store?.name ?? seller.name ?? t('seller.nav.storeName')
  const initial = storeName.charAt(0).toUpperCase()

  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.left}>
        <View style={styles.avatar} accessibilityLabel={storeName}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
      </View>
      <View style={styles.right}>
        {showSearch && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.nav.searchAria')}
            onPress={() => router.push('/products' as any)}
            style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.nav.notificationsAria', { count: notifCount })}
          onPress={() => {}}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={22} color={colors.text} strokeWidth={2} />
          {notifCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {notifCount > 9 ? '9+' : notifCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    ...shadows.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  storeName: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
