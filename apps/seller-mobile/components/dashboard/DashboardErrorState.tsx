import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { XCircle } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import { styles } from './styles'

export function DashboardErrorState({
  onRetry,
  t,
  reducedMotion: _reducedMotion,
}: {
  onRetry: () => void
  t: (k: string) => string
  reducedMotion: boolean
}) {
  return (
    <View style={styles.errorCard} accessibilityRole="alert" accessibilityLabel={t('seller.dashboard.errorTitle')}>
      <View style={styles.errorIcon}>
        <XCircle size={40} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>{t('seller.dashboard.errorTitle')}</Text>
      <Text style={styles.errorSubtitle}>{t('seller.dashboard.errorSubtitle')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('seller.dashboard.errorRetryAria')}
        onPress={onRetry}
        style={styles.errorRetryBtn}
        activeOpacity={0.9}
      >
        <Text style={styles.errorRetryText}>{t('seller.dashboard.errorRetry')}</Text>
      </TouchableOpacity>
    </View>
  )
}
