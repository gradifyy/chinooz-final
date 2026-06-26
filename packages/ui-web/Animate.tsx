'use client'

import React from 'react'
import { motion, type Transition } from 'framer-motion'
import { duration, easing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : duration.normal / 1000, delay: reduced ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface SlideUpProps {
  children: React.ReactNode
  delay?: number
  distance?: number
  className?: string
}

export function SlideUp({ children, delay = 0, distance = 20, className }: SlideUpProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : duration.slow / 1000,
        ease: easing.easeOut as any,
        delay: reduced ? 0 : delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface ScaleInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function ScaleIn({ children, delay = 0, className }: ScaleInProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : duration.normal / 1000, delay: reduced ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface SpringUpProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function SpringUp({ children, delay = 0, className }: SpringUpProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              type: 'spring',
              damping: 20,
              stiffness: 300,
              mass: 0.8,
              delay,
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerChildrenProps {
  children: React.ReactNode
  stagger?: number
  className?: string
}

export function StaggerChildren({ children, stagger = 0.06, className }: StaggerChildrenProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 16 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: reduced ? 0 : duration.slow / 1000, ease: easing.easeOut as any }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface PressableProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Pressable({ children, className, onClick }: PressableProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      whileHover={reduced ? {} : { scale: 1.02 }}
      whileTap={reduced ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
