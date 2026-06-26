import React from 'react'

interface GridProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  className?: string
}

export default function Grid({
  children,
  columns = 2,
  gap = 12,
  className = '',
}: GridProps) {
  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  )
}
