import React, { useEffect } from 'react'
import {
  Modal,
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
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { colors, radii, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { BottomSheetProps } from '@chinooz/types/components'

export default function AnimatedBottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const reduced = useReducedMotion()
  const backdropOpacity = useSharedValue(0)
  const sheetTranslateY = useSharedValue(Dimensions.get('window').height)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: reduced ? 0 : 200 })
      sheetTranslateY.value = reduced
        ? withTiming(0, { duration: 0 })
        : withSpring(0, { damping: 28, stiffness: 300, mass: 0.9 })
    } else {
      backdropOpacity.value = withTiming(0, { duration: reduced ? 0 : 150 })
      sheetTranslateY.value = withTiming(Dimensions.get('window').height, { duration: reduced ? 0 : 150 })
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }))

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[backdropStyle, { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }]}
        >
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end', flex: 1 }}
            >
              <Animated.View
                testID={testID}
                style={[
                  sheetStyle,
                  {
                    backgroundColor: colors.background,
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
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginBottom: spacing[3],
                  }}
                />
                {title && (
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '600',
                      color: colors.text,
                      paddingHorizontal: spacing[4],
                      marginBottom: spacing[3],
                    }}
                  >
                    {title}
                  </Text>
                )}
                {children}
              </Animated.View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
