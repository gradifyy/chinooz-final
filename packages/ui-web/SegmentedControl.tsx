'use client'

import React, { useRef, useEffect, useState } from 'react'
import type { SegmentedControlProps } from '@chinooz/types/components'

export default function SegmentedControl({
  segments,
  activeKey,
  onChange,
  className = '',
  testID,
}: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const activeIndex = segments.findIndex(s => s.key === activeKey)

  useEffect(() => {
    if (!containerRef.current) return
    const buttons = containerRef.current.querySelectorAll('[role="tab"]')
    const btn = buttons[activeIndex] as HTMLElement | undefined
    if (btn) {
      setIndicatorStyle({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
      })
    }
  }, [activeIndex])

  return (
    <div
      ref={containerRef}
      data-testid={testID}
      className={`segmented-control relative inline-flex bg-surface rounded-full h-10 p-1 max-w-full ${className}`}
      role="tablist"
    >
      <div
        className="segmented-indicator absolute top-1 h-8 bg-primary rounded-full"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          transition: 'left 250ms cubic-bezier(0.34,1.56,0.64,1), width 250ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />
      {segments.map(seg => {
        const isActive = seg.key === activeKey
        return (
          <button
            key={seg.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(seg.key)}
            className={`
              relative z-10 flex items-center justify-center gap-1.5 h-8 px-4 rounded-full
              text-sm font-semibold whitespace-nowrap transition-colors duration-200
              ${isActive ? 'text-white' : 'text-text-muted hover:text-text'}
            `}
          >
            {seg.label}
            {seg.badge != null && seg.badge > 0 && (
              <span
                className="segmented-badge inline-flex items-center justify-center bg-primary text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] animate-[badge-pop_300ms_ease]"
                key={seg.badge}
              >
                {seg.badge > 99 ? '99+' : seg.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
