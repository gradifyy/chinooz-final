import type { Message, Conversation } from '@chinooz/types'
import * as api from './api'

export const messagingService = {
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
}
