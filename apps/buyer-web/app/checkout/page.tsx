'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import { useCartStore, useCheckoutStore, useUIStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import AddressStep from '@/components/AddressStep'
import DeliveryStep from '@/components/DeliveryStep'
import ReviewStep from '@/components/ReviewStep'
import type { CheckoutStep } from '@chinooz/state'

const STEPS: CheckoutStep[] = ['address', 'delivery', 'payment', 'review']
const STEP_KEYS: Record<CheckoutStep, string> = {
  address: 'checkout.address',
  delivery: 'checkout.deliveryMethod',
  payment: 'checkout.payment',
  review: 'checkout.reviewOrder',
}

export default function CheckoutPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const {
    currentStep,
    completedSteps,
    setStep,
    completeStep,
    goToStep,
    reset,
  } = useCheckoutStore()

  const [showExitDialog, setShowExitDialog] = useState(false)
  const currentIndex = STEPS.indexOf(currentStep)
  const isLast = currentIndex === STEPS.length - 1

  // Exit guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleNext = useCallback(() => {
    completeStep(currentStep)
    if (isLast) {
      reset()
      router.push('/')
    } else {
      setStep(STEPS[currentIndex + 1])
    }
  }, [currentStep, currentIndex, isLast, completeStep, setStep, reset, router])

  const handleBack = useCallback(() => {
    if (currentIndex === 0) {
      setShowExitDialog(true)
    } else {
      setStep(STEPS[currentIndex - 1])
    }
  }, [currentIndex, setStep])

  const handleStepTap = useCallback((step: CheckoutStep) => {
    const stepIndex = STEPS.indexOf(step)
    if (stepIndex < currentIndex || completedSteps.includes(step)) {
      goToStep(step)
    }
  }, [currentIndex, completedSteps, goToStep])

  const getPrimaryLabel = () => {
    if (isLast) return t('checkout.placeOrder')
    return t('checkout.continue')
  }

  return (
    <Screen>
      <Container className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left column: stepper + content */}
          <div className="md:col-span-3 space-y-6">
            {/* Stepper */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, i) => {
                const isActive = i === currentIndex
                const isCompleted = completedSteps.includes(step)
                const isAccessible = i <= currentIndex || isCompleted
                return (
                  <button
                    key={step}
                    onClick={() => handleStepTap(step)}
                    disabled={!isAccessible}
                    className={`flex flex-col items-center gap-1.5 ${!isAccessible ? 'opacity-40' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: isActive ? '#8A1B57' : isCompleted ? '#16A34A' : '#E5E5E5',
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300 }}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      <span className={`text-xs font-bold ${isActive || isCompleted ? 'text-white' : 'text-text-muted'}`}>
                        {isCompleted ? '✓' : i + 1}
                      </span>
                    </motion.div>
                    <span className={`text-[11px] font-medium ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                      {t(STEP_KEYS[step])}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-border rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={reduced ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -20 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300 }}
              >
                <StepContent step={currentStep} onValidChange={() => {}} />
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                className="text-sm font-semibold text-text-muted hover:text-text transition-colors"
              >
                ← {t('checkout.back')}
              </button>
              <motion.button
                onClick={handleNext}
                whileHover={reduced ? {} : { scale: 1.02 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                className={`px-6 py-3 rounded-xl font-bold text-sm text-white transition-colors ${
                  isLast ? 'bg-gold hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {getPrimaryLabel()}
              </motion.button>
            </div>

            <p className="text-xs text-text-tertiary text-center">
              {t('checkout.stepOf', { current: currentIndex + 1, total: STEPS.length })}
            </p>
          </div>

          {/* Right column: order summary (sticky on md+) */}
          <div className="md:col-span-2">
            <div className="md:sticky md:top-24 space-y-4 p-4 border border-border rounded-xl bg-surface">
              <h3 className="text-base font-semibold text-text">{t('checkout.orderSummary')}</h3>
              <div className="space-y-2">
                {items.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-border overflow-hidden shrink-0 flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text truncate">{item.name}</p>
                      <p className="text-xs text-text-muted">x{item.quantity}</p>
                    </div>
                    <span className="text-xs font-semibold text-text tabular-nums">{formatNPR(item.price * item.quantity)}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-text-muted">+{items.length - 3} more items</p>
                )}
              </div>
              <hr className="border-border" />
              <div className="flex justify-between">
                <span className="text-sm font-bold text-text">{t('cart.total')}</span>
                <span className="text-lg font-bold text-text tabular-nums">{formatNPR(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exit dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowExitDialog(false)} />
            <div className="relative bg-surface rounded-xl p-5 w-full max-w-sm space-y-3">
              <h3 className="text-lg font-semibold text-text">{t('checkout.leaveCheckout')}</h3>
              <p className="text-sm text-text-muted">{t('checkout.leaveCheckoutMsg')}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1 h-11 rounded-xl border-[1.5px] border-border font-semibold text-sm text-text hover:bg-background transition-colors"
                >
                  {t('checkout.stay')}
                </button>
                <button
                  onClick={() => { setShowExitDialog(false); router.back() }}
                  className="flex-1 h-11 rounded-xl bg-error text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  {t('checkout.leave')}
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </Screen>
  )
}

function StepContent({ step, onValidChange }: { step: CheckoutStep; onValidChange?: (v: boolean) => void }) {
  const { t } = useTranslation()

  const content: Record<CheckoutStep, React.ReactNode> = {
    address: <AddressStep onValidChange={onValidChange} />,
    delivery: <DeliveryStep onValidChange={onValidChange} />,
    payment: (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-text">{t('checkout.payment')}</h2>
        {(['cod', 'esewa', 'khalti'] as const).map(method => (
          <button
            key={method}
            className={`w-full bg-surface rounded-xl p-4 border-[1.5px] flex items-center gap-3 transition-colors ${
              method === 'cod' ? 'border-primary' : 'border-border hover:border-primary/30'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
              <span className="text-lg">{method === 'cod' ? '💵' : method === 'esewa' ? '💚' : '💜'}</span>
            </div>
            <span className="text-sm font-semibold text-text">{t(`checkout.${method}`)}</span>
          </button>
        ))}
      </div>
    ),
    review: <ReviewStep onStepChange={(step) => goToStep(step)} />,
  }

  return <>{content[step]}</>
}
