import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { WifiOff, ChevronRight } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'

interface OfflinePromptProps {
  onGoOnline: () => void
}

/**
 * Gentle offline prompt shown above the Available list when the rider is
 * offline. Exposed with role="status" + accessibilityLiveRegion="polite" so
 * screen readers announce the "you're offline" message when it appears.
 * Tap target is a full 56pt row.
 */
export default function OfflinePrompt({ onGoOnline }: OfflinePromptProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()

  const handlePress = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onGoOnline()
  }

  return (
    <View
      role="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('rider.jobs.offlinePromptAria')}
      testID="jobs-offline-prompt"
    >
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('rider.jobs.offlineAria')}
        activeOpacity={0.7}
        style={styles.row}
      >
        <View style={styles.iconWrap}>
          <WifiOff size={20} color={colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t('rider.jobs.offlineTitle')}</Text>
          <Text style={styles.subtitle}>{t('rider.jobs.offlineSubtitle')}</Text>
        </View>
        <View style={styles.ctaWrap}>
          <Text style={styles.cta}>{t('rider.jobs.offlineAction')}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.primary50,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textSecondary },
  ctaWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  cta: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
})
