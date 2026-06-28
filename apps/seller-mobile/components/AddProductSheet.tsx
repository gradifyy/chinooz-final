import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { BottomSheet } from '@chinooz/ui'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { useA11y } from './A11yProvider'

export function AddProductSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')

  const handleSubmit = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    setName('')
    setPrice('')
    setCategory('')
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('seller.nav.addProductTitle')}>
      <View style={styles.body}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('seller.nav.addProductName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('seller.nav.addProductNamePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.nav.addProductName')}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('seller.nav.addProductPrice')}</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.nav.addProductPrice')}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('seller.nav.addProductCategory')}</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder={t('seller.nav.addProductCategory')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.nav.addProductCategory')}
          />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.nav.addProductCancel')}
          >
            <Text style={styles.cancelText}>{t('seller.nav.addProductCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, !name.trim() && styles.submitBtnDisabled]}
            disabled={!name.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('seller.nav.addProductSubmit')}
          >
            <Text style={styles.submitText}>{t('seller.nav.addProductSubmit')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: spacing[4], paddingHorizontal: spacing[4] },
  field: { gap: spacing[1.5] },
  label: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.md[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  submitBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
