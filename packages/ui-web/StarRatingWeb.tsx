import React from 'react'

interface StarRatingWebProps {
  rating: number
}

export default function StarRatingWeb({ rating }: StarRatingWebProps) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <span className="text-sm" style={{ color: '#E0A93B' }}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
    </span>
  )
}
