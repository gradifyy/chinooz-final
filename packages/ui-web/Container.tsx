import React from 'react'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export default function Container({
  children,
  className = '',
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={`w-full max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  )
}
