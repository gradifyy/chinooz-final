import React, { useEffect, useRef } from 'react'
import { Animated, Text, TouchableOpacity, View } from 'react-native'
import { colors, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { ToastProps } from '@chinooz/types/components'

const variantBg: Record<string, string> = {
  success: colors.success,
  error: colors.error,
  warning: '#F59E0B',
  info: colors.info,
}

export default function Toast({
  message,
  variant = 'info',
  visible,
  action,
  testID,
}: ToastProps) {
  const reduced = useReducedMotion()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    const dur = reduced ? 0 : 250
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: dur, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: visible ? 0 : -20, duration: dur, useNativeDriver: true }),
    ]).start()
  }, [visible, reduced])

  if (!visible) return null

  return (
    <Animated.View
      testID={testID}
      style={{
        position: 'absolute',
        top: 60,
        left: spacing[4],
        right: spacing[4],
        backgroundColor: variantBg[variant],
        borderRadius: 12,
        padding: spacing[3.5],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <Text style={{ color: colors.white, fontSize: 14, flex: 1 }}>{message}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={{ marginLeft: spacing[3] }}>
          <Text style={{ color: colors.white, fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}
