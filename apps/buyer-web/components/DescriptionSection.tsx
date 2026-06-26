'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

interface DescriptionSectionProps {
  description: string
  maxLines?: number
}

export default function DescriptionSection({ description, maxLines = 3 }: DescriptionSectionProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [isLong, setIsLong] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight)
      const height = textRef.current.scrollHeight
      setIsLong(height > lineHeight * maxLines + 2)
    }
  }, [description, maxLines])

  return (
    <div className="space-y-2">
      <div className="relative">
        <p
          ref={textRef}
          className={`text-sm text-text-secondary leading-relaxed ${
            !expanded ? 'line-clamp-3' : ''
          }`}
          style={!expanded ? { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
        >
          {description}
        </p>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      {isLong && (
        <motion.button
          onClick={() => setExpanded(prev => !prev)}
          whileHover={reduced ? {} : { scale: 1.03 }}
          whileTap={reduced ? {} : { scale: 0.97 }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? t('product.readLess') : t('product.readMore')}
        </motion.button>
      )}
    </div>
  )
}
