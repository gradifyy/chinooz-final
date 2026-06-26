import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useSubmitReview } from '@chinooz/hooks'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

interface WriteReviewSheetProps {
  visible: boolean
  productId: string
  onClose: () => void
  onSuccess: () => void
}

export default function WriteReviewSheet({
  visible,
  productId,
  onClose,
  onSuccess,
}: WriteReviewSheetProps) {
  const { t } = useTranslation()
  const submitReview = useSubmitReview()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const checkScales = Array.from({ length: 5 }, () => useSharedValue(1))
  const successScale = useSharedValue(0)

  const handleStarTap = useCallback((star: number) => {
    setRating(star)
    checkScales[star - 1].value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 500 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [])

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || body.trim().length < 10) return
    setSubmitting(true)
    try {
      await submitReview.mutateAsync({
        productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      })
      setSubmitted(true)
      successScale.value = withSpring(1, { damping: 12, stiffness: 400 })
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      setTimeout(() => {
        setSubmitted(false)
        setRating(0)
        setTitle('')
        setBody('')
        onSuccess()
        onClose()
      }, 1200)
    } catch {} finally {
      setSubmitting(false)
    }
  }, [rating, title, body, productId, submitReview, onSuccess, onClose])

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }))

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
        <View style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: radii['2xl'],
          borderTopRightRadius: radii['2xl'],
          paddingTop: spacing[2],
          paddingBottom: spacing[6],
          paddingHorizontal: spacing[4],
          maxHeight: '80%',
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing[3] }} />

          {submitted ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing[10], gap: spacing[3] }}>
              <Animated.View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, successStyle]}>
                <Text style={{ fontSize: 28, color: colors.white }}>✓</Text>
              </Animated.View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('product.reviewSubmitted')}</Text>
            </View>
          ) : (
            <View style={{ gap: spacing[4] }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('product.writeReview')}</Text>

              {/* Star rating input */}
              <View style={{ alignItems: 'center', gap: spacing[2] }}>
                <View style={{ flexDirection: 'row', gap: spacing[1] }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const animStyle = useAnimatedStyle(() => ({
                      transform: [{ scale: checkScales[star - 1].value }],
                    }))
                    return (
                      <AnimatedTouchable
                        key={star}
                        onPress={() => handleStarTap(star)}
                        style={[{ padding: spacing[1] }, animStyle]}
                        accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Text style={{ fontSize: 32, color: star <= rating ? colors.gold : colors.border }}>★</Text>
                      </AnimatedTouchable>
                    )
                  })}
                </View>
              </View>

              {/* Title */}
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('product.writeReview') + ' (optional)'}
                placeholderTextColor={colors.textTertiary}
                style={{
                  height: 48,
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  paddingHorizontal: spacing[4],
                  fontSize: 15,
                  color: colors.text,
                }}
              />

              {/* Body */}
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={t('product.writeReview')}
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={2000}
                style={{
                  minHeight: 100,
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  fontSize: 15,
                  color: colors.text,
                  textAlignVertical: 'top',
                }}
              />

              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'right' }}>
                {body.length}/2000
              </Text>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={rating === 0 || body.trim().length < 10 || submitting}
                style={{
                  backgroundColor: rating === 0 || body.trim().length < 10 ? colors.border : colors.primary,
                  height: 48,
                  borderRadius: radii.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: submitting ? 0.7 : 1,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: rating === 0 || body.trim().length < 10 ? colors.textMuted : colors.white }}>
                  {submitting ? '...' : t('product.submitReview')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
