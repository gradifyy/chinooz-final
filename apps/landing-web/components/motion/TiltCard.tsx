'use client'

import { useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees. */
  maxTilt?: number
  /** Scale on hover. */
  hoverScale?: number
  /** Glare effect intensity 0-1. */
  glare?: number
}

export function TiltCard({
  children,
  className,
  maxTilt = 10,
  hoverScale = 1.02,
  glare = 0,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({
      ry: (px - 0.5) * maxTilt * 2,
      rx: -(py - 0.5) * maxTilt * 2,
      gx: px * 100,
      gy: py * 100,
    })
  }

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      whileHover={reduce ? undefined : { scale: hoverScale }}
      transition={{ type: 'spring', damping: 18, stiffness: 300 }}
      className={cn('relative [transform-style:preserve-3d]', className)}
      style={{
        transform: reduce ? undefined : `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        willChange: 'transform',
      }}
    >
      {children}
      {glare > 0 && !reduce && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${glare}) 0%, transparent 50%)`,
              opacity: tilt.rx === 0 && tilt.ry === 0 ? 0 : 1,
            }}
          />
        </div>
      )}
    </motion.div>
  )
}
