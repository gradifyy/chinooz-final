import React from 'react'
import { Modal as RNModal, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { ModalProps } from '@chinooz/types/components'

export default function Modal({
  visible,
  onClose,
  title,
  children,
  testID,
}: ModalProps) {
  return (
    <RNModal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: spacing[4],
        }}
      >
        <View
          testID={testID}
          style={{
            backgroundColor: colors.background,
            borderRadius: radii['2xl'],
            padding: spacing[5],
            width: '100%',
            maxWidth: 400,
            maxHeight: '80%',
          }}
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
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  )
}
