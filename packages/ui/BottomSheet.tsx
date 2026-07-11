import React, { useEffect } from 'react'
import {
  Modal as RNModal,
  View,
  Text,
  TouchableWithoutFeedback,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { radii, spacing, fontSz, springs, duration } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useUIColors } from './UITheme'
import type { BottomSheetProps } from '@chinooz/types/components'

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const colors = useUIColors()
  const reduced = useReducedMotion()
  const translateY = useSharedValue(Dimensions.get('window').height)
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, reduced ? { damping: 100, stiffness: 1000 } : springs.sheet)
      overlayOpacity.value = withTiming(1, { duration: reduced ? 0 : duration.fast })
    } else {
      translateY.value = withTiming(Dimensions.get('window').height, {
        duration: reduced ? 0 : duration.normal,
      })
      overlayOpacity.value = withTiming(0, { duration: reduced ? 0 : duration.fast })
    }
  }, [visible, reduced, translateY, overlayOpacity])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  return (
    <RNModal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Animated.View style={[{ flex: 1, backgroundColor: colors.overlay }, overlayStyle]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end', flex: 1 }}
            >
              <Animated.View
                testID={testID}
                accessibilityViewIsModal
                style={[
                  sheetStyle,
                  {
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: radii['2xl'],
                    borderTopRightRadius: radii['2xl'],
                    paddingTop: spacing[2],
                    paddingBottom: spacing[6],
                    maxHeight: Dimensions.get('window').height * 0.8,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: colors.border,
                    borderRadius: radii.sm,
                    alignSelf: 'center',
                    marginBottom: spacing[3],
                  }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                {title ? (
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontSize: fontSz('md')[0],
                      fontWeight: '600',
                      color: colors.text,
                      paddingHorizontal: spacing[4],
                      marginBottom: spacing[3],
                    }}
                  >
                    {title}
                  </Text>
                ) : null}
                {children}
              </Animated.View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </RNModal>
  )
}
