'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { BottomSheetProps } from '@chinooz/types/components'

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
  className = '',
}: BottomSheetProps & { className?: string }) {
  const reduced = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    const prevFocus = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      const focusable = sheetRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      focusable?.focus()
    })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prevFocus?.focus()
    }
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-modal flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-overlay"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={sheetRef}
            data-testid={testID}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
            className={`relative w-full max-h-[80vh] bg-background rounded-t-2xl pt-2 pb-6 overflow-y-auto shadow-xl ${className}`}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" aria-hidden />
            {title && (
              <h2 className="text-base font-semibold text-text px-4 mb-3" id="bottomsheet-title">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
