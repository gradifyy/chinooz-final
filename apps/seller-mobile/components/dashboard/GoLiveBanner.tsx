import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import { styles } from './styles'

/**
 * Store-setup progress card. A clear title, a "x of y completed" line, a thin
 * premium progress bar, and a quiet meta line with steps remaining + an
 * estimated time to finish. Tapping continues setup (full checklist lives in
 * account-setup). Replaces the old slim go-live banner.
 */
export function GoLiveBanner({
  done,
  total,
  onContinue,
}: {
  done: number
  total: number
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const pct = total > 0 ? (done / total) * 100 : 0
  const remaining = Math.max(0, total - done)
  // ~40s of perceived effort per remaining step → a friendly, rounded estimate.
  const estMin = Math.max(1, Math.round(remaining * 0.7))

  return (
    <TouchableOpacity
      style={styles.setupCard}
      onPress={onContinue}
      accessibilityRole="button"
      accessibilityLabel={`${t('seller.dashboard.setupTitle')}. ${t('seller.dashboard.setupCompleted', {
        done,
        total,
      })}. ${t('seller.dashboard.setupRemaining', { count: remaining })}`}
      activeOpacity={0.85}
    >
      <View style={styles.setupBody}>
        <Text style={styles.setupTitle}>{t('seller.dashboard.setupTitle')}</Text>
        <Text style={styles.setupCompleted}>
          {t('seller.dashboard.setupCompleted', { done, total })}
        </Text>
        <View style={styles.setupTrack}>
          <View style={[styles.setupFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.setupMeta}>
          {t('seller.dashboard.setupRemaining', { count: remaining })}
          {'   ·   '}
          {t('seller.dashboard.setupTimeLeft', { min: estMin })}
        </Text>
      </View>
      <ChevronRight size={22} color={colors.textTertiary} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}
