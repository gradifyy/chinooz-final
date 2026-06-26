'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from './hooks/useReducedMotion'

interface AddedToCartProps {
  visible: boolean
  onDone?: () => void
}

export default function AddedToCart({ visible, onDone }: AddedToCartProps) {
  const reduced = useReducedMotion()
  const [show, setShow] = useState(visible)

  useEffect(() => {
    if (visible) {
      setShow(true)
      if (onDone) {
        const timeout = setTimeout(onDone, reduced ? 100 : 1600)
        return () => clearTimeout(timeout)
      }
    } else {
      setShow(false)
    }
  }, [visible])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: 'spring', damping: 15, stiffness: 400, mass: 0.6 }
          }
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', damping: 12, stiffness: 500, delay: 0.15 }
            }
            className="bg-success rounded-full w-20 h-20 flex items-center justify-center shadow-xl"
          >
            <span className="text-white text-4xl">✓</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
