import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import NetInfo from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { colors, spacing, radii } from '@chinooz/theme'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isOffline, setIsOffline] = useState(false)
  const translateY = useSharedValue(-60)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isOffline) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 })
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
    } else {
      translateY.value = withTiming(-60, { duration: 200, easing: Easing.in(Easing.cubic) })
      opacity.value = withTiming(0, { duration: 200 })
    }
  }, [isOffline])

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const handleRetry = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] })
    await queryClient.invalidateQueries({ queryKey: ['deals'] })
  }, [queryClient])

  if (!isOffline) return null

  return (
    <Animated.View style={[styles.banner, bannerStyle]}>
      <TouchableOpacity onPress={handleRetry} style={styles.touchable} activeOpacity={0.7}>
        <View style={styles.dot} />
        <Text style={styles.text}>{t('home.connectionLost')}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
})
