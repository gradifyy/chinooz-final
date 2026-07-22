'use client'

import { IconButton } from '@chinooz/ui-web'
import { Search, X, Plus, Heart } from 'lucide-react'

export default function IconButtonStories() {
  return (
    <div className="p-8 flex gap-4">
      <IconButton onPress={() => {}} aria-label="Search"><Search size={18} /></IconButton>
      <IconButton variant="outline" onPress={() => {}} aria-label="Close"><X size={18} /></IconButton>
      <IconButton variant="ghost" onPress={() => {}} aria-label="Add"><Plus size={18} /></IconButton>
      <IconButton variant="destructive" onPress={() => {}} aria-label="Remove favorite"><Heart size={18} /></IconButton>
    </div>
  )
}
