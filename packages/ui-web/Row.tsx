import React from 'react'

interface RowProps {
  children: React.ReactNode
  gap?: number
  align?: 'stretch' | 'center' | 'start' | 'end' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  className?: string
}

const alignMap: Record<string, string> = {
  stretch: 'items-stretch',
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
  baseline: 'items-baseline',
}

const justifyMap: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

export default function Row({
  children,
  gap = 0,
  align = 'center',
  justify = 'start',
  wrap = false,
  className = '',
}: RowProps) {
  return (
    <div
      className={`flex flex-row ${alignMap[align]} ${justifyMap[justify]} ${wrap ? 'flex-wrap' : ''} ${className}`}
      style={{ gap }}
    >
      {children}
    </div>
  )
}
