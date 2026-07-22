'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { AccordionProps } from '@chinooz/types/components'

export default function Accordion({ title, defaultOpen = false, children, className = '', testID }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reduced = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight : 0)
    }
  }, [open])

  const toggle = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  return (
    <div data-testid={testID} className={`border-t border-border-light ${className}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-background/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-text">{title}</span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          className="text-text-muted"
        >
          ›
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
        }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.25, ease: [0.2, 0, 0, 1] }
        }
        className="overflow-hidden"
      >
        <div ref={contentRef} className="px-4 pb-4">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
