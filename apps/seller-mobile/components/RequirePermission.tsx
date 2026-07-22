import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react-native'
import { useSellerPermission, type SellerPermissionKey } from '@chinooz/hooks'
import { colors, spacing, radii, fontFamily } from '../lib/theme'

/**
 * RBAC guard for seller-mobile. Wrap any screen that requires a permission.
 * If the current seller's role lacks the permission, a "no access" state
 * renders instead of the children. Mirrors the web `RequirePermission`.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: SellerPermissionKey
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { can } = useSellerPermission(permission)

  if (can) return <>{children}</>

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <ShieldAlert size={28} color={colors.error} />
        </View>
        <Text style={styles.title}>{t('seller.rbac.noAccessTitle')}</Text>
        <Text style={styles.body2}>{t('seller.rbac.noAccessBody')}</Text>
      </View>
    </SafeAreaView>
  )
}

export default RequirePermission

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[2] },
  iconWrap: { width: 56, height: 56, borderRadius: radii.full, backgroundColor: colors.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], textAlign: 'center' },
  body2: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
})
