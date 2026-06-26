import React from 'react'

interface StackProps {
  children: React.ReactNode
  gap?: number
  align?: 'stretch' | 'center' | 'start' | 'end'
  className?: string
}

const alignMap: Record<string, string> = {
  stretch: 'items-stretch',
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
}

export default function Stack({
  children,
  gap = 0,
  align,
  className = '',
}: StackProps) {
  return (
    <div
      className={`flex flex-col ${align ? alignMap[align] : ''} ${className}`}
      style={{ gap }}
    >
      {children}
    </div>
  )
}
