'use client'

import React from 'react'

export function AuroraBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute -top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/30 blur-[120px] animate-aurora motion-reduce:animate-none" />
      <div
        className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-primary-light/20 blur-[100px] animate-aurora motion-reduce:animate-none"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gold/10 blur-[80px] animate-aurora motion-reduce:animate-none"
        style={{ animationDelay: '4s' }}
      />
      <div className="absolute inset-0 grain" />
    </div>
  )
}
