'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ParallaxLayerProps {
  children: ReactNode
  className?: string
  /** Parallax speed — positive moves down slower, negative moves up. 0 = none. */
  speed?: number
  /** Optional rotation in degrees applied across scroll. */
  rotate?: number
  /** Scale range across the scroll. */
  scale?: [number, number]
  /** Opacity range across the scroll. */
  opacity?: [number, number]
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.3,
  rotate = 0,
  scale,
  opacity,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120])
  const r = useTransform(scrollYProgress, [0, 1], [0, rotate])
  const s = useTransform(scrollYProgress, [0, 1], scale ?? [1, 1])
  const o = useTransform(scrollYProgress, [0, 0.5, 1], opacity ?? [1, 1, 1])

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      style={{
        y: reduce ? 0 : y,
        rotate: reduce ? 0 : r,
        scale: reduce ? 1 : s,
        opacity: reduce ? 1 : o,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}
