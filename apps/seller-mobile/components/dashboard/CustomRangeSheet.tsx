import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import { styles } from './styles'

function DateInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <View style={styles.dateInput}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textTertiary}
        maxLength={10}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={label}
        style={styles.dateInputText}
      />
    </View>
  )
}

export function CustomRangeSheet({
  onClose,
  onApply,
  start,
  end,
  onChange,
}: {
  onClose: () => void
  onApply: () => void
  start?: string
  end?: string
  onChange: (r: { start: string; end: string }) => void
}) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const s = start ?? today
  const e = end ?? today
  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t('seller.dashboard.rangeCustomTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.sheetFields}>
          <View style={styles.sheetField}>
            <Text style={styles.sheetFieldLabel}>{t('seller.dashboard.rangeStart')}</Text>
            <DateInput value={s} onChange={v => onChange({ start: v, end: e })} label={t('seller.dashboard.rangeStart')} />
          </View>
          <View style={styles.sheetField}>
            <Text style={styles.sheetFieldLabel}>{t('seller.dashboard.rangeEnd')}</Text>
            <DateInput value={e} onChange={v => onChange({ start: s, end: v })} label={t('seller.dashboard.rangeEnd')} />
          </View>
        </View>
        <TouchableOpacity style={styles.sheetApplyBtn} onPress={onApply} accessibilityRole="button">
          <Text style={styles.sheetApplyText}>{t('seller.dashboard.rangeApply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
