'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { scrollProgressVariants, MOTION_TOKENS } from '@/lib/motion'
import { useReducedMotion } from '@chinooz/ui-web'

export function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = docHeight > 0 ? scrollTop / docHeight : 0
      setScrollProgress(scrolled)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-magenta-500 to-pink-500 z-50"
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: scrollProgress }}
      transition={{
        duration: 0.1,
        ease: 'easeOut',
      }}
    />
  )
}
