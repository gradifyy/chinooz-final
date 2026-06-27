import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@chinooz/state'
import { colors, radii, spacing } from '@chinooz/theme'

export default function TopBar() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} activeOpacity={0.7}>
          <Text style={styles.brand}>{t('common.appName')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={styles.searchBar}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.search')}
        >
          <Text style={styles.searchIcon}>{'\u2315'}</Text>
          <Text style={styles.searchPlaceholder}>{t('search.inputPlaceholder')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.cartButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('nav.cart')}
        >
          <Text style={styles.cartIcon}>{'\u{1F6D2}'}</Text>
          {count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  searchBar: {
    flex: 1,
    marginHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  searchIcon: {
    fontSize: 20,
    color: colors.textMuted,
    marginRight: spacing[2],
  },
  searchPlaceholder: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textMuted,
  },
  cartButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
})
