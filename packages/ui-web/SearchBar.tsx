'use client'

import React from 'react'
import type { SearchBarProps } from '@chinooz/types/components'

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search...',
  onClear,
  className = '',
  testID,
}: SearchBarProps) {
  return (
    <div
      data-testid={testID}
      className={`flex items-center bg-background rounded-xl px-3 h-11 border border-border ${className}`}
    >
      <span className="text-text-muted mr-2 text-[16px]">⌕</span>
      <input
        type="search"
        value={value}
        onChange={e => onChangeText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit?.() }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text-tertiary h-full"
      />
      {value.length > 0 && (
        <button type="button" onClick={onClear} className="text-text-muted text-[14px] p-1">
          ✕
        </button>
      )}
    </div>
  )
}
