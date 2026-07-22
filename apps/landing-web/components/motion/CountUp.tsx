'use client'

import { useRef, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface CountUpProps {
  value: string
  className?: string
}

function parseValue(value: string): { num: number; prefix: string; suffix: string } {
  const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/)
  if (!match) return { num: 0, prefix: '', suffix: value }
  return {
    prefix: match[1],
    num: parseFloat(match[2].replace(/,/g, '')),
    suffix: match[3],
  }
}

function formatNumber(num: number, original: string): string {
  if (original.includes(',')) {
    return Math.round(num).toLocaleString('en-US')
  }
  return String(Math.round(num))
}

export function CountUp({ value, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }

    const el = ref.current
    if (!el) return

    const { num, prefix, suffix } = parseValue(value)
    if (num === 0) {
      setDisplay(value)
      return
    }

    let raf: number
    let started = false

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true
          const duration = 1600
          const start = performance.now()

          const tick = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = num * eased
            setDisplay(`${prefix}${formatNumber(current, value)}${suffix}`)
            if (progress < 1) {
              raf = requestAnimationFrame(tick)
            } else {
              setDisplay(value)
            }
          }
          raf = requestAnimationFrame(tick)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)

    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, reduce])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
