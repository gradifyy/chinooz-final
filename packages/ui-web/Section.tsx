import React from 'react'
import Row from './Row'

interface SectionProps {
  children: React.ReactNode
  title?: string
  action?: { label: string; href?: string; onClick?: () => void }
  gap?: number
  className?: string
}

export default function Section({
  children,
  title,
  action,
  gap = 12,
  className = '',
}: SectionProps) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      {title && (
        <Row justify="between" align="center">
          <h2 className="text-xl font-bold text-text">{title}</h2>
          {action && (
            <a
              href={action.href ?? '#'}
              onClick={action.onClick}
              className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              {action.label}
            </a>
          )}
        </Row>
      )}
      <div style={{ gap }} className="flex flex-col">
        {children}
      </div>
    </section>
  )
}
