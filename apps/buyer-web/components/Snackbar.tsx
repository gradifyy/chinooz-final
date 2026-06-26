'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'

interface SnackbarProps {
  visible: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  autoHideMs?: number
}

export default function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  autoHideMs = 3000,
}: SnackbarProps) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (visible && autoHideMs > 0) {
      const timer = setTimeout(() => {
        onDismiss?.()
      }, autoHideMs)
      return () => clearTimeout(timer)
    }
  }, [visible, autoHideMs, onDismiss])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: 20, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-text text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-[9998]"
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          <span className="text-sm flex-1">{message}</span>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="ml-3 text-sm font-bold text-gold hover:underline"
            >
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
