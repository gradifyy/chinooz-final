'use client'

import React from 'react'
import Image from 'next/image'

interface PhoneFrameProps {
  src: string
  alt: string
  priority?: boolean
  className?: string
}

export function PhoneFrame({ src, alt, priority = false, className = '' }: PhoneFrameProps) {
  return (
    <div
      className={`relative w-[280px] h-[580px] md:w-[300px] md:h-[620px] shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Phone bezel */}
      <div className="absolute inset-0 rounded-[44px] bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-xl p-[10px]">
        {/* Inner screen area */}
        <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-white">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#0d0d0d] rounded-b-2xl z-10" />
          {/* Screen content */}
          <Image
            src={src}
            alt={alt}
            fill
            sizes="300px"
            className="object-cover object-top"
            priority={priority}
          />
        </div>
      </div>
      {/* Side button accents */}
      <div className="absolute top-[100px] -right-[2px] w-[3px] h-[40px] bg-[#2a2a2a] rounded-r-sm" />
      <div className="absolute top-[160px] -right-[2px] w-[3px] h-[40px] bg-[#2a2a2a] rounded-r-sm" />
      <div className="absolute top-[120px] -left-[2px] w-[3px] h-[60px] bg-[#2a2a2a] rounded-l-sm" />
    </div>
  )
}
