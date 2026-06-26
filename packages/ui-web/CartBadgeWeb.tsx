'use client'

import React from 'react'
import Link from 'next/link'
import { cartStore } from '@chinooz/state'

export default function CartBadgeWeb() {
  const count = cartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <Link href="/cart" className="relative p-2 hover:opacity-80 transition-opacity">
      <span className="text-xl">🛒</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#8A1B57] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
