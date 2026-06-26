import React, { useEffect } from 'react'
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { colors, radii, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { ModalProps } from '@chinooz/types/components'

export default function Modal({
  visible,
  onClose,
  title,
  children,
  testID,
}: ModalProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(0)
  const scale = useSharedValue(reduced ? 1 : 0.95)

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: reduced ? 0 : 200 })
      scale.value = withSpring(1, { damping: 20, stiffness: 300 })
    } else {
      opacity.value = withTiming(0, { duration: reduced ? 0 : 150 })
      scale.value = withTiming(reduced ? 1 : 0.95, { duration: reduced ? 0 : 150 })
    }
  }, [visible])

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <RNModal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
        }}
      >
        <Animated.View
          style={[overlayStyle, { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }]}
        />
        <Animated.View
          testID={testID}
          style={[
            contentStyle,
            {
              backgroundColor: colors.background,
              borderRadius: radii['2xl'],
              padding: spacing[5],
              width: '100%',
              maxWidth: 400,
              maxHeight: '80%',
            },
          ]}
        >
          {title && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  )
}
