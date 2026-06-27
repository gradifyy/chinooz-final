import { create } from 'zustand'
import type { InboxTab } from '@chinooz/types'

interface InboxState {
  activeTab: InboxTab
  setActiveTab: (tab: InboxTab) => void
  notifUnread: number
  msgUnread: number
  setNotifUnread: (count: number) => void
  setMsgUnread: (count: number) => void
}

export const useInboxStore = create<InboxState>()(set => ({
  activeTab: 'notifications',
  setActiveTab: tab => set({ activeTab: tab }),
  notifUnread: 0,
  msgUnread: 0,
  setNotifUnread: count => set({ notifUnread: count }),
  setMsgUnread: count => set({ msgUnread: count }),
}))
