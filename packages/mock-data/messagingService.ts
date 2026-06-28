import type { Message, Conversation } from '@chinooz/types'
import * as api from './api'

export const messagingService = {
  // --- Buyer inbox ---
  async getConversations(): Promise<Conversation[]> {
    return api.getConversations()
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    return api.getMessages(conversationId)
  },

  async sendMessage(conversationId: string, body: string): Promise<Message> {
    return api.sendMessage(conversationId, body)
  },

  async markConversationRead(conversationId: string): Promise<void> {
    return api.markConversationRead(conversationId)
  },

  async getUnreadCount(): Promise<number> {
    return api.getUnreadMessageCount()
  },

  // --- Seller messages (shared boundary — same interface, different backend) ---
  async getSellerConversations(sellerId?: string): Promise<Conversation[]> {
    return api.getSellerConversations(sellerId)
  },

  async getSellerMessages(conversationId: string): Promise<Message[]> {
    return api.getSellerMessages(conversationId)
  },

  async sendSellerMessage(conversationId: string, body: string): Promise<Message> {
    return api.sendSellerMessage(conversationId, body)
  },

  async markSellerConversationRead(conversationId: string): Promise<void> {
    return api.markSellerConversationRead(conversationId)
  },

  async getSellerUnreadCount(sellerId?: string): Promise<number> {
    const convos = await api.getSellerConversations(sellerId)
    return convos.reduce((sum, c) => sum + c.unreadCount, 0)
  },
}
