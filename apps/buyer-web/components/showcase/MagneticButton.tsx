'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { magneticVariants, MOTION_TOKENS } from '@/lib/motion'

interface MagneticButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function MagneticButton({ children, onClick, disabled = false, className = '' }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distance = 50 // Magnetic pull radius
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const distance_to_cursor = Math.sqrt(dx * dx + dy * dy)

    if (distance_to_cursor < distance) {
      const pull_x = (dx / distance) * (distance - distance_to_cursor) * 0.3
      const pull_y = (dy / distance) * (distance - distance_to_cursor) * 0.3

      setPosition({ x: pull_x, y: pull_y })
    }
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={position}
      transition={{
        duration: MOTION_TOKENS.fast,
        ease: MOTION_TOKENS.easeOut,
      }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  )
}
