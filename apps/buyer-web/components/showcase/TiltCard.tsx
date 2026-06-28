'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
}

export function TiltCard({ children, className = '' }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const prefersReducedMotion = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const x = e.clientX - centerX
    const y = e.clientY - centerY

    const rotateX = (y / (rect.height / 2)) * 5
    const rotateY = (x / (rect.width / 2)) * 5

    setRotation({ x: -rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={rotation}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
