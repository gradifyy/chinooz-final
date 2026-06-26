import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { BottomSheetProps } from '@chinooz/types/components'

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [visible, slideAnim])

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get('window').height, 0],
  })

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end', flex: 1 }}
            >
              <Animated.View
                testID={testID}
                style={{
                  backgroundColor: colors.background,
                  borderTopLeftRadius: radii['2xl'],
                  borderTopRightRadius: radii['2xl'],
                  paddingTop: spacing[2],
                  paddingBottom: spacing[6],
                  transform: [{ translateY }],
                  maxHeight: Dimensions.get('window').height * 0.8,
                }}
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
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
