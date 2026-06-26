'use client'

import React from 'react'
import type { TabsProps } from '@chinooz/types/components'

export default function Tabs({
  tabs,
  activeKey,
  onChange,
  className = '',
  testID,
}: TabsProps) {
  return (
    <div data-testid={testID} className={`flex gap-1 overflow-x-auto ${className}`} role="tablist">
      {tabs.map(tab => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            role="tab"
            aria-selected={isActive}
            className={`
              px-4 py-2 rounded-full text-[13px] font-semibold border min-h-[40px]
              whitespace-nowrap transition-colors duration-150
              ${isActive ? 'bg-primary text-white border-primary' : 'bg-background text-text border-border'}
            `}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
