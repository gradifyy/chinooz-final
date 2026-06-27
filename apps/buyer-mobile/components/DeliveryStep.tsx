import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useCheckoutStore } from '@chinooz/state'
import type { DeliveryMethod } from '@chinooz/state'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const TIME_SLOTS = [
  { key: '9-11', label: '9–11 AM' },
  { key: '11-13', label: '11 AM–1 PM' },
  { key: '13-15', label: '1–3 PM' },
  { key: '15-17', label: '3–5 PM' },
  { key: '17-19', label: '5–7 PM' },
]

function getNext7Days() {
  const days: { date: Date; label: string; dayNum: string; weekday: string }[] = []
  const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      date: d,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayShort[d.getDay()],
      dayNum: d.getDate().toString(),
      weekday: weekdayShort[d.getDay()],
    })
  }
  return days
}

interface DeliveryStepProps {
  onValidChange?: (valid: boolean) => void
}

export default function DeliveryStep({ onValidChange }: DeliveryStepProps) {
  const { t } = useTranslation()
  const deliveryMethod = useCheckoutStore(s => s.deliveryMethod)
  const setDeliveryMethod = useCheckoutStore(s => s.setDeliveryMethod)

  const [selectedDate, setSelectedDate] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showSlots, setShowSlots] = useState(false)

  const days = useMemo(() => getNext7Days(), [])
  const cardScale = useSharedValue(1)
  const slotScale = useSharedValue(1)

  const options = useMemo(() => [
    {
      key: 'sameDay' as const,
      title: t('checkout.sameDayDelivery'),
      fee: 250,
      eta: t('checkout.today') + ', 5–7 PM',
      available: true,
    },
    {
      key: 'express' as const,
      title: t('checkout.expressDelivery'),
      fee: 150,
      eta: t('checkout.tomorrow'),
      available: true,
    },
    {
      key: 'scheduled' as const,
      title: t('checkout.scheduledDelivery'),
      fee: 100,
      eta: days[selectedDate]?.label || '',
      available: true,
    },
  ], [t, days, selectedDate])

  const handleSelect = useCallback((key: string) => {
    setDeliveryMethod(key as DeliveryMethod)
    if (key === 'scheduled') setShowSlots(true)
    else setShowSlots(false)
    onValidChange?.(true)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [setDeliveryMethod, onValidChange])

  const handleDateSelect = useCallback((idx: number) => {
    setSelectedDate(idx)
    setSelectedSlot(null)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [])

  const handleSlotSelect = useCallback((key: string) => {
    setSelectedSlot(key)
    onValidChange?.(true)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [onValidChange])

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
        {t('checkout.deliveryMethod')}
      </Text>

      {/* Options */}
      {options.map((opt, i) => {
        const isActive = deliveryMethod === opt.key
        return (
          <Animated.View key={opt.key} entering={FadeInDown.delay(i * 50).duration(250)}>
            <TouchableOpacity
              onPress={() => handleSelect(opt.key)}
              disabled={!opt.available}
              style={{
                padding: spacing[4],
                borderRadius: radii.lg,
                borderWidth: 2,
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                opacity: opt.available ? 1 : 0.5,
                gap: spacing[1.5],
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled: !opt.available }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{opt.title}</Text>
                {isActive && (
                  <Animated.Text style={{ fontSize: 18, color: colors.primary, fontWeight: '700' }}>✓</Animated.Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('checkout.eta')}: {opt.eta}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
                  {formatNPR(opt.fee)}
                </Text>
              </View>
              {!opt.available && (
                <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>
                  {t('checkout.unavailable')}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )
      })}

      {/* Scheduled slot picker */}
      {showSlots && deliveryMethod === 'scheduled' && (
        <Animated.View entering={FadeIn.duration(300)} style={{ gap: spacing[3] }}>
          {/* Date strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {days.map((day, i) => {
              const isActive = selectedDate === i
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleDateSelect(i)}
                  style={{
                    width: 56,
                    paddingVertical: spacing[2],
                    borderRadius: radii.full,
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.primary : colors.border,
                    alignItems: 'center',
                    gap: 2,
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`${day.label} ${day.dayNum}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={{ fontSize: 11, color: isActive ? colors.white : colors.textMuted, fontWeight: '600' }}>
                    {day.weekday}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isActive ? colors.white : colors.text }}>
                    {day.dayNum}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Time chips */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
            {t('checkout.selectSlot')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {TIME_SLOTS.map(slot => {
              const isActive = selectedSlot === slot.key
              return (
                <TouchableOpacity
                  key={slot.key}
                  onPress={() => handleSlotSelect(slot.key)}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: radii.md,
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.primary : colors.border,
                    minHeight: 40,
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={slot.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? colors.white : colors.text,
                  }}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>
      )}
    </View>
  )
}
