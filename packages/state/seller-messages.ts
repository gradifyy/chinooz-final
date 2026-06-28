import { create } from 'zustand'

interface SellerMessagesState {
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export const useSellerMessagesStore = create<SellerMessagesState>()(set => ({
  unreadCount: 0,
  setUnreadCount: count => set({ unreadCount: count }),
}))
