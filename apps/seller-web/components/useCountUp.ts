'use client'

import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '@chinooz/ui-web'

export function useCountUp(target: number, durationMs = 300): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduced || target === 0) {
      setValue(target)
      return
    }
    const start = performance.now()
    const startValue = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(startValue + (target - startValue) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs, reduced])

  return value
}
