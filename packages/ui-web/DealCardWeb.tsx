import React from 'react'
import Link from 'next/link'
import type { Deal } from '@chinooz/types'
import { formatTimeRemaining } from '@chinooz/utils'

interface DealCardWebProps {
  deal: Deal
}

export default function DealCardWeb({ deal }: DealCardWebProps) {
  const timeLeft = formatTimeRemaining(deal.endsAt)

  return (
    <Link
      href={`/deals`}
      className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200 min-w-[280px]"
    >
      <div className="relative h-36 bg-gray-50">
        <img
          src={deal.image}
          alt={deal.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-[#E0A93B] text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {deal.type.toUpperCase()}
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900">{deal.title}</h3>
        <p className="text-xs text-gray-500 mt-1">{deal.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="bg-[#F8EAF1] text-[#8A1B57] text-xs font-bold px-2 py-1 rounded-full">
            Up to {deal.percentOff}% OFF
          </span>
          <span className="text-xs text-gray-400">{timeLeft}</span>
        </div>
      </div>
    </Link>
  )
}
