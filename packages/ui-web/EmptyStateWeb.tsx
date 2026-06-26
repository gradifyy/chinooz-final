import React from 'react'

interface EmptyStateWebProps {
  icon: string
  title: string
  subtitle?: string
}

export default function EmptyStateWeb({ icon, title, subtitle }: EmptyStateWebProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
      {subtitle && (
        <p className="text-sm text-gray-500 text-center mt-2">{subtitle}</p>
      )}
    </div>
  )
}
