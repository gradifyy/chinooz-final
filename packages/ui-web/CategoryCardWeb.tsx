import React from 'react'
import Link from 'next/link'
import type { Category } from '@chinooz/types'

interface CategoryCardWebProps {
  category: Category
}

export default function CategoryCardWeb({ category }: CategoryCardWebProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="flex flex-col items-center group"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#8A1B57] transition-colors">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xs text-gray-700 mt-2 text-center group-hover:text-[#8A1B57] transition-colors">
        {category.name}
      </span>
    </Link>
  )
}
