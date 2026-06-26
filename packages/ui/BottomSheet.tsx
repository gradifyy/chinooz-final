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
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { colors, radii, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { BottomSheetProps } from '@chinooz/types/components'

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const reduced = useReducedMotion()
  const translateY = useSharedValue(Dimensions.get('window').height)
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: reduced ? 100 : 25,
        stiffness: reduced ? 1000 : 300,
        mass: 0.8,
      })
      overlayOpacity.value = withTiming(1, { duration: reduced ? 0 : 200 })
    } else {
      translateY.value = withTiming(Dimensions.get('window').height, {
        duration: reduced ? 0 : 250,
      })
      overlayOpacity.value = withTiming(0, { duration: reduced ? 0 : 200 })
    }
  }, [visible])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }, overlayStyle]}>
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
