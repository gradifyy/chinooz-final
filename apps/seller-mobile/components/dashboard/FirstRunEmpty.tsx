import React, { useEffect, useRef } from 'react'
import { Animated, Text, TouchableOpacity, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import { styles } from './styles'

export function FirstRunEmpty({
  onAddProduct,
  t,
  reducedMotion,
}: {
  onAddProduct: () => void
  t: (k: string) => string
  reducedMotion: boolean
}) {
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.8)).current
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current
  useEffect(() => {
    if (reducedMotion) return
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 200, mass: 0.8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [reducedMotion, scale, opacity])
  return (
    <Animated.View style={[styles.firstRunCard, { opacity, transform: [{ scale }] }]} accessibilityRole="summary" accessibilityLabel={t('seller.dashboard.firstRunTitle')}>
      <View style={styles.firstRunIllustration}>
        <View style={styles.firstRunCircle}>
          <Plus size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.firstRunTitle}>{t('seller.dashboard.firstRunTitle')}</Text>
      <Text style={styles.firstRunSubtitle}>{t('seller.dashboard.firstRunSubtitle')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('seller.dashboard.firstRunCtaAria')}
        onPress={onAddProduct}
        style={styles.firstRunCta}
        activeOpacity={0.9}
      >
        <Text style={styles.firstRunCtaText}>{t('seller.dashboard.firstRunCta')}</Text>
      </TouchableOpacity>

      <View style={styles.firstRunZeroKpis}>
        {['NPR 0', '0', '0', 'NPR 0', '0%', 'NPR 0'].map((v, i) => (
          <View key={i} style={styles.firstRunZeroKpi}>
            <Text style={styles.firstRunZeroValue}>{v}</Text>
            <Text style={styles.firstRunZeroDelta}>—</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  )
}
