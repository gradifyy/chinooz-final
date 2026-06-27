'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { ModalProps } from '@chinooz/types/components'

export default function Modal({
  visible,
  onClose,
  title,
  children,
  className = '',
  testID,
}: ModalProps) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [visible])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (visible) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <div
          data-testid={testID}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className={`relative bg-background rounded-2xl p-5 w-full max-w-[400px] max-h-[80%] overflow-auto shadow-xl ${className}`}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-text">{title}</h2>
                <button onClick={onClose} className="text-text-muted text-[18px] p-1" aria-label="Close">
                  ✕
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
