import React, { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAddressStore } from '@chinooz/state'
import { useAppTheme } from './ThemeProvider'
import { spacing, radii, fontSz } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import Icon from './Icon'

function LocationPromptInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { colors } = useAppTheme()
  const reduced = useReducedMotion()
  const addresses = useAddressStore(s => s.addresses)
  const locationCoords = useAddressStore(s => s.locationCoords)

  const hasLocation = addresses.length > 0 || locationCoords !== null
  const pulse = useSharedValue(1)

  React.useEffect(() => {
    if (reduced || hasLocation) return
    pulse.value = withSpring(1.02, { damping: 15, stiffness: 200 })
  }, [reduced, hasLocation, pulse])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }))

  const handlePress = useCallback(() => {
    router.push('/location')
  }, [router])

  if (hasLocation) return null

  return (
    <Animated.View style={pulseStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('home.setLocationForNearby')}
      >
        <View style={[styles.container, { backgroundColor: colors.primary50, borderColor: colors.primary + '20' }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Icon name="location" size={22} color={colors.white} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('home.setLocationForNearby')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
              {t('home.setLocationSubtitle')}
            </Text>
          </View>
          <View style={[styles.arrow, { backgroundColor: colors.primary }]}>
            <Icon name="arrow-forward" size={14} color={colors.white} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSz('base')[0],
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSz('xs')[0],
    fontWeight: '400',
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export const LocationPrompt = memo(LocationPromptInner)
export default LocationPrompt
