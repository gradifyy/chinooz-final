import React from 'react'
import {
  ScrollView,
  KeyboardAvoidingView,
  View,
  Platform,
  type ScrollViewProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@chinooz/theme'

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode
  noScroll?: boolean
  keyboardAvoid?: boolean
  padded?: boolean
  safeArea?: boolean
}

export default function Screen({
  children,
  noScroll = false,
  keyboardAvoid = true,
  padded = true,
  safeArea = true,
  style,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets()

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: safeArea ? insets.top : 0,
    paddingBottom: safeArea ? insets.bottom : 0,
    paddingLeft: safeArea ? insets.left : 0,
    paddingRight: safeArea ? insets.right : 0,
  }

  if (noScroll) {
    const content = (
      <View style={[containerStyle, padded && { paddingHorizontal: 16 }, style]}>
        {children}
      </View>
    )
    return keyboardAvoid ? (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {content}
      </KeyboardAvoidingView>
    ) : (
      content
    )
  }

  const scrollContent = (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      contentContainerStyle={[
        {
          paddingTop: safeArea ? insets.top : 0,
          paddingBottom: safeArea ? insets.bottom + 16 : 16,
          paddingLeft: safeArea ? insets.left : 0,
          paddingRight: safeArea ? insets.right : 0,
        },
        padded && { paddingHorizontal: 16 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  )

  if (keyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {scrollContent}
      </KeyboardAvoidingView>
    )
  }

  return scrollContent
}
