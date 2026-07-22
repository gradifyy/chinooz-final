'use client'

import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'

interface MagneticButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  strength?: number
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function MagneticButton({
  children,
  onClick,
  className = '',
  strength = 0.25,
  type = 'button',
  disabled = false,
}: MagneticButtonProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springConfig = { stiffness: 200, damping: 15, mass: 0.5 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced || disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * strength)
    y.set((e.clientY - centerY) * strength)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={reduced || disabled ? undefined : { scale: 0.96 }}
      className={className}
    >
      {children}
    </motion.button>
  )
}
