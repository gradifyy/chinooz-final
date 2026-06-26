'use client'

import { useCartStore } from '@chinooz/state'

export function CartBadge() {
  const count = useCartStore(s => s.count)
  if (count === 0) return null
  return (
    <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count}
    </span>
  )
}
