import React from 'react'
import { formatNPR } from '@chinooz/utils'

interface PriceTagWebProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function PriceTagWeb({ price, compareAtPrice, size = 'md' }: PriceTagWebProps) {
  const cls = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm'
  const oldCls = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className="flex items-baseline gap-2">
      <span className={`${cls} font-bold text-[#8A1B57]`}>{formatNPR(price)}</span>
      {compareAtPrice && compareAtPrice > price && (
        <span className={`${oldCls} text-gray-400 line-through`}>{formatNPR(compareAtPrice)}</span>
      )}
    </div>
  )
}
