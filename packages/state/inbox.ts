import { create } from 'zustand'
import type { InboxTab } from '@chinooz/types'

interface InboxState {
  activeTab: InboxTab
  setActiveTab: (tab: InboxTab) => void
}

export const useInboxStore = create<InboxState>()(set => ({
  activeTab: 'notifications',
  setActiveTab: tab => set({ activeTab: tab }),
}))
