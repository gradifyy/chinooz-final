'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import { useCheckoutStore } from '@chinooz/state'
import type { DeliveryMethod } from '@chinooz/state'

const TIME_SLOTS = [
  { key: '9-11', label: '9–11 AM' },
  { key: '11-13', label: '11 AM–1 PM' },
  { key: '13-15', label: '1–3 PM' },
  { key: '15-17', label: '3–5 PM' },
  { key: '17-19', label: '5–7 PM' },
]

function getNext7Days() {
  const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days: { label: string; dayNum: string; weekday: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
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
  const reduced = useReducedMotion()
  const deliveryMethod = useCheckoutStore(s => s.deliveryMethod)
  const setDeliveryMethod = useCheckoutStore(s => s.setDeliveryMethod)

  const [selectedDate, setSelectedDate] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showSlots, setShowSlots] = useState(false)

  const days = useMemo(() => getNext7Days(), [])

  const options = useMemo(() => [
    { key: 'sameDay', title: t('checkout.sameDayDelivery'), fee: 250, eta: `${t('checkout.today')}, 5–7 PM`, available: true },
    { key: 'express', title: t('checkout.expressDelivery'), fee: 150, eta: t('checkout.tomorrow'), available: true },
    { key: 'scheduled', title: t('checkout.scheduledDelivery'), fee: 100, eta: days[selectedDate]?.label || '', available: true },
  ], [t, days, selectedDate])

  const handleSelect = useCallback((key: string) => {
    setDeliveryMethod(key as DeliveryMethod)
    setShowSlots(key === 'scheduled')
    onValidChange?.(true)
  }, [setDeliveryMethod, onValidChange])

  const handleDateSelect = useCallback((idx: number) => {
    setSelectedDate(idx)
    setSelectedSlot(null)
  }, [])

  const handleSlotSelect = useCallback((key: string) => {
    setSelectedSlot(key)
    onValidChange?.(true)
  }, [onValidChange])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">{t('checkout.deliveryMethod')}</h2>

      {/* Options */}
      {options.map((opt, i) => {
        const isActive = deliveryMethod === opt.key
        return (
          <motion.div
            key={opt.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.05 }}
          >
            <button
              onClick={() => handleSelect(opt.key)}
              disabled={!opt.available}
              className={`w-full p-4 rounded-xl border-2 text-left space-y-1.5 transition-colors ${
                isActive ? 'border-primary bg-surface' : 'border-border bg-surface hover:border-primary/30'
              } ${!opt.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text">{opt.title}</span>
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                    className="text-lg text-primary font-bold"
                  >
                    ✓
                  </motion.span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{t('checkout.eta')}: {opt.eta}</span>
                <span className="text-sm font-semibold text-text tabular-nums">{formatNPR(opt.fee)}</span>
              </div>
              {!opt.available && (
                <p className="text-xs text-error font-medium">{t('checkout.unavailable')}</p>
              )}
            </button>
          </motion.div>
        )
      })}

      {/* Scheduled slot picker */}
      <AnimatePresence>
        {showSlots && deliveryMethod === 'scheduled' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="overflow-hidden space-y-3"
          >
            {/* Date strip */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {days.map((day, i) => {
                const isActive = selectedDate === i
                return (
                  <button
                    key={i}
                    onClick={() => handleDateSelect(i)}
                    className={`shrink-0 w-14 py-2 rounded-full flex flex-col items-center gap-0.5 transition-colors ${
                      isActive ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text'
                    } border-[1.5px]`}
                    aria-label={`${day.label} ${day.dayNum}`}
                    aria-selected={isActive}
                  >
                    <span className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-text-muted'}`}>
                      {day.weekday}
                    </span>
                    <span className={`text-base font-bold ${isActive ? 'text-white' : 'text-text'}`}>
                      {day.dayNum}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Time chips */}
            <p className="text-sm font-semibold text-text-secondary">{t('checkout.selectSlot')}</p>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map(slot => {
                const isActive = selectedSlot === slot.key
                return (
                  <motion.button
                    key={slot.key}
                    onClick={() => handleSlotSelect(slot.key)}
                    whileHover={reduced ? {} : { scale: 1.03 }}
                    whileTap={reduced ? {} : { scale: 1.05 }}
                    className={`px-3 py-2 rounded-md border-[1.5px] text-sm min-h-[40px] transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-white font-semibold'
                        : 'border-border bg-surface text-text'
                    }`}
                    aria-label={slot.label}
                    aria-selected={isActive}
                  >
                    {slot.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
