import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useCartStore, useCheckoutStore, useUIStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import type { CheckoutStep } from '@chinooz/state'

const STEPS: CheckoutStep[] = ['address', 'delivery', 'payment', 'review']
const STEP_KEYS: Record<CheckoutStep, string> = {
  address: 'checkout.address',
  delivery: 'checkout.deliveryMethod',
  payment: 'checkout.payment',
  review: 'checkout.reviewOrder',
}

export default function CheckoutScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const {
    currentStep,
    address,
    deliveryMethod,
    paymentMethod,
    completedSteps,
    setStep,
    setAddress,
    setDeliveryMethod,
    setPaymentMethod,
    completeStep,
    goToStep,
    reset,
  } = useCheckoutStore()

  const [showExitDialog, setShowExitDialog] = useState(false)

  const currentIndex = STEPS.indexOf(currentStep)
  const isLast = currentIndex === STEPS.length - 1
  const isFirst = currentIndex === 0

  // Exit guard
  useEffect(() => {
    const handler = () => {
      setShowExitDialog(true)
      return true
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', handler)
    return () => sub.remove()
  }, [])

  const handleNext = useCallback(() => {
    completeStep(currentStep)
    if (isLast) {
      // Place order
      reset()
      router.replace('/(tabs)')
    } else {
      setStep(STEPS[currentIndex + 1])
    }
  }, [currentStep, currentIndex, isLast, completeStep, setStep, reset, router])

  const handleBack = useCallback(() => {
    if (isFirst) {
      setShowExitDialog(true)
    } else {
      setStep(STEPS[currentIndex - 1])
    }
  }, [isFirst, currentIndex, setStep])

  const handleExit = useCallback(() => {
    setShowExitDialog(false)
    router.back()
  }, [router])

  const handleStepTap = useCallback((step: CheckoutStep) => {
    const stepIndex = STEPS.indexOf(step)
    if (stepIndex < currentIndex || completedSteps.includes(step)) {
      goToStep(step)
    }
  }, [currentIndex, completedSteps, goToStep])

  const stepBarWidth = useSharedValue(0)
  useEffect(() => {
    stepBarWidth.value = withTiming(((currentIndex + 1) / STEPS.length) * 100, {
      duration: reduced ? 0 : 250,
      easing: Easing.out(Easing.cubic),
    })
  }, [currentIndex, reduced])

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${stepBarWidth.value}%`,
  }))

  const getPrimaryLabel = () => {
    if (isLast) return t('checkout.placeOrder')
    return t('checkout.continue')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600' }}>← {t('checkout.back')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('checkout.checkout')}</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: colors.border }}>
          <Animated.View style={[{ height: '100%', backgroundColor: colors.primary }, progressBarStyle]} />
        </View>

        {/* Stepper */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
          {STEPS.map((step, i) => {
            const isActive = i === currentIndex
            const isCompleted = completedSteps.includes(step)
            const isAccessible = i <= currentIndex || isCompleted
            return (
              <TouchableOpacity
                key={step}
                onPress={() => handleStepTap(step)}
                disabled={!isAccessible}
                style={{ alignItems: 'center', gap: 4, opacity: isAccessible ? 1 : 0.4 }}
                accessibilityLabel={t(STEP_KEYS[step])}
                accessibilityState={{ current: isActive }}
              >
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isActive ? colors.primary : isCompleted ? colors.success : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isActive || isCompleted ? colors.white : colors.textMuted }}>
                    {isCompleted ? '✓' : i + 1}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: isActive ? '600' : '400', color: isActive ? colors.primary : colors.textMuted }}>
                  {t(STEP_KEYS[step])}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Step content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={currentStep}
          entering={reduced ? FadeIn.duration(0) : SlideInRight.duration(250).springify().damping(20)}
          exiting={reduced ? FadeOut.duration(0) : SlideOutLeft.duration(200)}
        >
          <StepContent step={currentStep} />
        </Animated.View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing[4],
        paddingTop: spacing[3],
        paddingBottom: insets.bottom + spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('checkout.stepOf', { current: currentIndex + 1, total: STEPS.length })}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {formatNPR(subtotal)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: isLast ? colors.gold : colors.primary,
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[3],
            borderRadius: radii.lg,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{getPrimaryLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Exit dialog */}
      {showExitDialog && (
        <View style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing[5],
            width: '100%',
            maxWidth: 320,
            gap: spacing[3],
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.leaveCheckout')}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>{t('checkout.leaveCheckoutMsg')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
              <TouchableOpacity
                onPress={() => setShowExitDialog(false)}
                style={{ flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('checkout.stay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExit}
                style={{ flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>{t('checkout.leave')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

function StepContent({ step }: { step: CheckoutStep }) {
  const { t } = useTranslation()

  const content: Record<CheckoutStep, React.ReactNode> = {
    address: (
      <View style={{ gap: spacing[3] }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.address')}</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], gap: spacing[2] }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Select or add a delivery address</Text>
          <View style={{ height: 48, backgroundColor: colors.background, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', paddingHorizontal: spacing[3] }}>
            <Text style={{ fontSize: 14, color: colors.textTertiary }}>Home — Baneshwor-10, Kathmandu</Text>
          </View>
        </View>
      </View>
    ),
    delivery: (
      <View style={{ gap: spacing[3] }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.deliveryMethod')}</Text>
        {(['standard', 'express'] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1.5,
              borderColor: method === 'standard' ? colors.primary : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {t(`checkout.${method}Delivery`)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {method === 'standard' ? '2-4 business days' : 'Same day in Valley'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {method === 'standard' ? 'NPR 150' : 'NPR 300'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    payment: (
      <View style={{ gap: spacing[3] }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.payment')}</Text>
        {(['cod', 'esewa', 'khalti'] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1.5,
              borderColor: method === 'cod' ? colors.primary : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
            }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary50,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 18 }}>{method === 'cod' ? '💵' : method === 'esewa' ? '💚' : '💜'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {t(`checkout.${method}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    review: (
      <View style={{ gap: spacing[3] }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.reviewOrder')}</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], gap: spacing[2] }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Review your order details before placing.</Text>
        </View>
      </View>
    ),
  }

  return <>{content[step]}</>
}
