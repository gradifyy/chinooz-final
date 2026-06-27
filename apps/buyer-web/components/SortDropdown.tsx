'use client'

import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

export interface SortOption {
  key: string
  labelKey: string
}

interface SortDropdownProps {
  visible: boolean
  onClose: () => void
  options: SortOption[]
  activeKey: string
  onSelect: (key: string) => void
}

export default function SortDropdown({
  visible,
  onClose,
  options,
  activeKey,
  onSelect,
}: SortDropdownProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          initial={reduced ? false : { opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.95 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-md overflow-hidden z-20 min-w-[200px]"
          role="listbox"
          aria-label={t('categories.sortBy')}
        >
          {options.map(opt => {
            const isActive = opt.key === activeKey
            return (
              <button
                key={opt.key}
                onClick={() => { onSelect(opt.key); onClose() }}
                className={`w-full h-10 px-4 flex items-center gap-2 text-base transition-colors ${
                  isActive
                    ? 'text-primary font-semibold bg-primary-50'
                    : 'text-text hover:bg-background'
                }`}
                role="option"
                aria-selected={isActive}
              >
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                    className="text-primary"
                  >
                    ✓
                  </motion.span>
                )}
                <span>{t(opt.labelKey)}</span>
              </button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
