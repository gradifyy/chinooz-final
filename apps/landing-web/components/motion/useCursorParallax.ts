'use client'

import { useEffect } from 'react'
import { useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

/**
 * Tracks pointer position relative to the viewport center and returns
 * spring-smoothed x/y motion values in the range [-0.5, 0.5].
 *
 * Use the returned values with `useTransform` to drive parallax depth:
 *
 *   const { px, py } = useCursorParallax()
 *   const x = useTransform(px, [-0.5, 0.5], [-30, 30])
 */
export function useCursorParallax(stiffness = 50, damping = 20) {
  const reduce = useReducedMotion()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const px = useSpring(rawX, { stiffness, damping })
  const py = useSpring(rawY, { stiffness, damping })

  useEffect(() => {
    if (reduce) return
    const handle = (e: PointerEvent) => {
      rawX.set(e.clientX / window.innerWidth - 0.5)
      rawY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', handle, { passive: true })
    return () => window.removeEventListener('pointermove', handle)
  }, [rawX, rawY, reduce])

  return { px, py }
}
