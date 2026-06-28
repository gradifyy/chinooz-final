'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from './useScrollReveal'
import { cn } from '@/lib/utils'

interface FadeUpProps {
  children: React.ReactNode
  delay?: number
  className?: string
  once?: boolean
}

export function FadeUp({ children, delay = 0, className, once = true }: FadeUpProps) {
  const { ref, isInView } = useScrollReveal({ once })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.2, 0, 0, 1],
      }}
      className={cn(className)}
      style={{
        // Respect reduced motion via CSS
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerChildrenProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.1,
}: StaggerChildrenProps) {
  const { ref, isInView } = useScrollReveal()

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.2, 0, 0, 1] },
  },
}
