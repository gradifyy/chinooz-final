import React from 'react'
import Link from 'next/link'

interface SectionHeaderWebProps {
  title: string
  href?: string
  actionLabel?: string
}

export default function SectionHeaderWeb({ title, href, actionLabel }: SectionHeaderWebProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-[#8A1B57] font-semibold hover:underline">
          {actionLabel ?? 'View All'}
        </Link>
      )}
    </div>
  )
}
