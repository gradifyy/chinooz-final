import React, { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing } from '@chinooz/theme'

const CATEGORIES = ['categoryBug', 'categoryFeature', 'categoryOrder', 'categoryOther']

export default function FeedbackScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('categoryBug')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const checkScale = useSharedValue(0)

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }))

  const handleSubmit = useCallback(() => {
    const e: Record<string, string> = {}
    if (!subject.trim()) e.subject = t('feedback.subjectRequired')
    if (message.trim().length < 10) e.message = t('feedback.messageRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSuccess(true)
      checkScale.value = withSpring(1, { damping: 12, stiffness: 300 })
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    }, 1000)
  }, [subject, message, t])

  if (success) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.topBarTitle}>{t('feedback.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.successWrap}>
          <Animated.View style={[s.successCheck, checkStyle]}>
            <Text style={s.successCheckText}>✓</Text>
          </Animated.View>
          <Text style={s.successTitle}>{t('feedback.successTitle')}</Text>
          <Text style={s.successSub}>{t('feedback.successSubtitle')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('feedback.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.field}>
          <Text style={s.label}>{t('feedback.subject')} *</Text>
          <TextInput style={[s.input, errors.subject && s.inputError]} value={subject} onChangeText={setSubject} placeholder={t('feedback.subjectPlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('feedback.subject')} />
          {errors.subject && <Text style={s.error}>{errors.subject}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('feedback.category')}</Text>
          <View style={s.catRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[s.catChip, category === cat && s.catChipActive]} activeOpacity={0.7}>
                <Text style={[s.catChipText, category === cat && s.catChipTextActive]}>{t(`feedback.${cat}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('feedback.message')} *</Text>
          <TextInput style={[s.textarea, errors.message && s.inputError]} value={message} onChangeText={setMessage} placeholder={t('feedback.messagePlaceholder')} placeholderTextColor={colors.textTertiary} multiline numberOfLines={5} textAlignVertical="top" accessibilityLabel={t('feedback.message')} />
          {errors.message && <Text style={s.error}>{errors.message}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('feedback.screenshot')}</Text>
          <TouchableOpacity style={s.screenshotBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('feedback.addScreenshot')}>
            <Text style={s.screenshotIcon}>📷</Text>
            <Text style={s.screenshotText}>{t('feedback.addScreenshot')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[s.submitBtn, submitting && s.submitBtnLoading]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={submitting ? t('feedback.submitting') : t('feedback.submit')}>
          <Text style={s.submitText}>{submitting ? t('feedback.submitting') : t('feedback.submit')}</Text>
        </TouchableOpacity>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: spacing[4], gap: spacing[4] },
  field: { gap: spacing[1] },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  input: { height: 48, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing[3], fontSize: 16, color: colors.text },
  textarea: { minHeight: 120, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing[3], paddingTop: spacing[3], fontSize: 16, color: colors.text },
  inputError: { borderColor: colors.error },
  error: { fontSize: 12, color: colors.error },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  catChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  catChipText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  catChipTextActive: { color: colors.primary, fontWeight: '600' },
  screenshotBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], height: 48, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', paddingHorizontal: spacing[3] },
  screenshotIcon: { fontSize: 20 },
  screenshotText: { fontSize: 14, color: colors.textMuted },
  submitBtn: { marginTop: spacing[2], height: 48, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitBtnLoading: { opacity: 0.7 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.white },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  successCheck: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  successCheckText: { fontSize: 28, color: colors.white, fontWeight: '700' },
  successTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  successSub: { fontSize: 14, color: colors.textMuted },
})
