import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCheckoutStore } from '@chinooz/state'
import type { DeliveryMethod } from '@chinooz/state'
import { getDeliveryFee } from '@chinooz/utils'

export const TIME_SLOTS = [
  { key: '9-11', label: '9–11 AM' },
  { key: '11-13', label: '11 AM–1 PM' },
  { key: '13-15', label: '1–3 PM' },
  { key: '15-17', label: '3–5 PM' },
  { key: '17-19', label: '5–7 PM' },
]

function getNext7Days() {
  const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days: { date: Date; label: string; dayNum: string; weekday: string }[] = []
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

interface UseDeliverySelectionOptions {
  onValidChange?: (valid: boolean) => void
  onSelect?: () => void
  onDateSelect?: () => void
  onSlotSelect?: () => void
}

export function useDeliverySelection({ onValidChange, onSelect, onDateSelect, onSlotSelect }: UseDeliverySelectionOptions = {}) {
  const { t } = useTranslation()
  const deliveryMethod = useCheckoutStore(s => s.deliveryMethod)
  const setDeliveryMethod = useCheckoutStore(s => s.setDeliveryMethod)

  const [selectedDate, setSelectedDate] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showSlots, setShowSlots] = useState(false)

  const days = useMemo(() => getNext7Days(), [])

  const options = useMemo(() => [
    { key: 'sameDay' as const, title: t('checkout.sameDayDelivery'), fee: getDeliveryFee('sameDay'), eta: `${t('checkout.today')}, 5–7 PM`, available: true },
    { key: 'express' as const, title: t('checkout.expressDelivery'), fee: getDeliveryFee('express'), eta: t('checkout.tomorrow'), available: true },
    { key: 'scheduled' as const, title: t('checkout.scheduledDelivery'), fee: getDeliveryFee('scheduled'), eta: days[selectedDate]?.label || '', available: true },
  ], [t, days, selectedDate])

  const handleSelect = useCallback((key: DeliveryMethod) => {
    setDeliveryMethod(key)
    setShowSlots(key === 'scheduled')
    onValidChange?.(true)
    onSelect?.()
  }, [setDeliveryMethod, onValidChange, onSelect])

  const handleDateSelect = useCallback((idx: number) => {
    setSelectedDate(idx)
    setSelectedSlot(null)
    onDateSelect?.()
  }, [onDateSelect])

  const handleSlotSelect = useCallback((key: string) => {
    setSelectedSlot(key)
    onValidChange?.(true)
    onSlotSelect?.()
  }, [onValidChange, onSlotSelect])

  return {
    deliveryMethod,
    options,
    days,
    selectedDate,
    selectedSlot,
    showSlots,
    handleSelect,
    handleDateSelect,
    handleSlotSelect,
  }
}
