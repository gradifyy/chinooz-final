'use client'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@chinooz/ui-web'

interface UseCountUpOptions {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}

export function useCountUp({ end, duration = 2000, suffix = '', prefix = '' }: UseCountUpOptions) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      setCount(end)
      setHasAnimated(true)
      return
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animateCount()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration, reduced, hasAnimated])

  function animateCount() {
    const startTime = performance.now()

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))

      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }

    requestAnimationFrame(update)
  }

  const display = `${prefix}${count.toLocaleString()}${suffix}`

  return { ref, display, count }
}
