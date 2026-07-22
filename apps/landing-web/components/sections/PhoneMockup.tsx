'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const screens = [
  '/onboarding-shop.png',
  '/onboarding-payment.png',
  '/onboarding-delivery.png',
]

export function PhoneMockup() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screens.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-64 h-[500px] rounded-[40px] bg-text border-4 border-text/80 shadow-2xl overflow-hidden animate-float motion-reduce:animate-none">
      {/* Screen */}
      <div className="absolute inset-1 rounded-[36px] bg-background overflow-hidden">
        {/* Status bar */}
        <div className="h-8 bg-primary flex items-center justify-between px-4 relative z-10">
          <span className="text-white text-[10px]">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm bg-white/60" />
            <div className="w-1 h-1.5 rounded-sm bg-white/60" />
          </div>
        </div>
        {/* App content — real onboarding screenshots */}
        <div className="relative flex-1 h-[calc(100%-2rem)]">
          {screens.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              sizes="256px"
              className={`object-cover transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
              priority={i === 0}
            />
          ))}
        </div>
        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Screen ${i + 1}`}
            />
          ))}
        </div>
      </div>
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-text rounded-full" aria-hidden="true" />
    </div>
  )
}
