'use client'

import { type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
  onClick?: () => void
  href?: string
  ariaLabel?: string
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  onClick,
  href,
  ariaLabel,
}: MagneticButtonProps) {
  const reduce = useReducedMotion()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { damping: 15, stiffness: 200, mass: 0.5 })
  const y = useSpring(rawY, { damping: 15, stiffness: 200, mass: 0.5 })

  const handleMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rawX.set((e.clientX - cx) * strength)
    rawY.set((e.clientY - cy) * strength)
  }

  const handleLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  const style = { x: reduce ? 0 : x, y: reduce ? 0 : y }

  if (href) {
    return (
      <motion.a
        href={href}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        aria-label={ariaLabel}
        style={style}
        className={cn(className)}
      >
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      aria-label={ariaLabel}
      style={style}
      className={cn(className)}
    >
      {children}
    </motion.button>
  )
}
