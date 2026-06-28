'use client'

import React from 'react'
import { Store } from 'lucide-react'

interface Props {
  alt?: string
}

export default function SellerIllustration({ alt }: Props) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="w-[300px] h-[300px] max-w-[82vw] max-h-[82vw] rounded-3xl bg-primary-50 flex flex-col items-center justify-center gap-5"
    >
      <div className="w-[60px] h-[60px] rounded-full bg-surface flex items-center justify-center shadow-md shadow-primary/10">
        <Store size={36} color="#8A1B57" strokeWidth={2} />
      </div>
      <svg width="234" height="117" viewBox="0 0 120 60" aria-hidden="true">
        <line x1="8" y1="52" x2="112" y2="52" stroke="#E5E5E5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="8" x2="8" y2="52" stroke="#E5E5E5" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M12 46 L34 38 L56 30 L78 20 L104 10"
          fill="none"
          stroke="#8A1B57"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="104" cy="10" r="3.5" fill="#8A1B57" />
        <rect x="22" y="44" width="6" height="8" rx="2" fill="#F8EAF1" />
        <rect x="44" y="36" width="6" height="16" rx="2" fill="#F8EAF1" />
        <rect x="66" y="26" width="6" height="26" rx="2" fill="#B23C7E" />
        <rect x="88" y="16" width="6" height="36" rx="2" fill="#8A1B57" />
      </svg>
    </div>
  )
}
