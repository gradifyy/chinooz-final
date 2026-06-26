'use client'

import React from 'react'

interface SearchBarWebProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
}

export default function SearchBarWeb({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search products, brands & more...',
}: SearchBarWebProps) {
  return (
    <div className="relative w-full max-w-xl">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">⌕</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A1B57]/20"
      />
    </div>
  )
}
