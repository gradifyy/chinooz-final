'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motionDuration, motionEasing } from '@/lib/motion'

const revealDuration = motionDuration.slow / 1000
const revealEase = `cubic-bezier(${motionEasing.signature.join(',')})`

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}

export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '-80px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity ${revealDuration}s ${revealEase} ${delay}s, transform ${revealDuration}s ${revealEase} ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
