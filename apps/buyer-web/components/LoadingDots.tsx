'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'

interface LoadingDotsProps {
  className?: string
  dotClassName?: string
}

export default function LoadingDots({ className = '', dotClassName = '' }: LoadingDotsProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <span className="text-sm">...</span>
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay }}
          className={`w-2 h-2 rounded-full bg-current/60 ${dotClassName}`}
        />
      ))}
    </div>
  )
}