'use client'

import React, { useEffect } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from '@chinooz/ui-web'

export function LenisScroll() {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Skip Lenis if user prefers reduced motion
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    } as any)

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [prefersReducedMotion])

  return null
}
