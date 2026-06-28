'use client'

import { useInView } from 'framer-motion'
import { useRef } from 'react'

export function useScrollReveal(options?: { once?: boolean; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: (options?.margin ?? '-80px') as `${number}px`,
  })

  return { ref, isInView }
}
