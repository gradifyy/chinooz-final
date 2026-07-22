'use client'

import { useState } from 'react'
import { SegmentedControl } from '@chinooz/ui-web'

const segments = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month', badge: 3 },
]

export default function SegmentedControlStories() {
  const [value, setValue] = useState('today')
  return (
    <div className="p-8">
      <SegmentedControl segments={segments} value={value} onChange={setValue} />
      <p className="mt-4 text-sm text-text-muted">Selected: {value}</p>
    </div>
  )
}
