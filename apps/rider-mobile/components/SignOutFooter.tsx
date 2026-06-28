import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Modal, AccessibilityInfo } from 'react-native'
import { LogOut } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'

interface SignOutFooterProps {
  versionLabel: string
  signOutLabel: string
  signOutAria: string
  confirmTitle: string
  confirmMsg: string
  cancelLabel: string
  confirmLabel: string
  onSignOut: () => void
}

export default function SignOutFooter({
  versionLabel,
  signOutLabel,
  signOutAria,
  confirmTitle,
  confirmMsg,
  cancelLabel,
  confirmLabel,
  onSignOut,
}: SignOutFooterProps) {
  const [confirming, setConfirming] = useState(false)

  const handleSignOut = () => {
    setConfirming(false)
    try {
      // announceForScreenReader is missing from the bundled RN type defs;
      // cast to any to stay type-safe without adding a new public API.
      ;(AccessibilityInfo as any).announceForScreenReader?.('Signed out')
    } catch {}
    onSignOut()
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.version} accessibilityRole="text">
        {versionLabel}
      </Text>

      <Pressable
        onPress={() => setConfirming(true)}
        style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}
        accessibilityRole="button"
        accessibilityLabel={signOutAria}
      >
        <LogOut size={18} color={colors.error} />
        <Text style={styles.signOutText}>{signOutLabel}</Text>
      </Pressable>

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Text style={styles.modalTitle}>{confirmTitle}</Text>
            <Text style={styles.modalMsg}>{confirmMsg}</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmPressed]}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[2],
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.errorLight,
    minHeight: 48,
  },
  signOutPressed: {
    backgroundColor: colors.errorLight,
  },
  signOutText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    width: '100%',
    maxWidth: 340,
    gap: spacing[3],
  },
  modalTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  modalMsg: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: colors.borderLight,
  },
  cancelText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmPressed: {
    backgroundColor: '#B91C1C',
  },
  confirmText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
