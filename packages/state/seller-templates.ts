import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SellerMessageTemplate, SellerAwayMessage } from '@chinooz/types'

const BUILT_IN_TEMPLATES: SellerMessageTemplate[] = [
  {
    id: 't1',
    label: 'Order confirmed',
    body: 'Thanks for your order {order_id}! It has been confirmed and will ship within 24 hours.',
    hasPlaceholders: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't2',
    label: 'Shipping update',
    body: 'Your order {order_id} has been dispatched. Tracking: {tracking}. It should arrive in 1–2 days.',
    hasPlaceholders: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't3',
    label: 'Out of stock',
    body: 'Sorry, this item is currently out of stock. It will be back in 3–5 days.',
    hasPlaceholders: false,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't4',
    label: 'Return approved',
    body: 'Your return request for {order_id} has been approved. The refund will be processed in 1–2 business days.',
    hasPlaceholders: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't5',
    label: 'Thanks for review',
    body: 'Thank you so much for the kind review, {buyer_name}! We really appreciate your support.',
    hasPlaceholders: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't6',
    label: 'Bulk discount',
    body: 'Yes! We offer a 10% discount on orders of 20 or more units. Let me know the quantity you need.',
    hasPlaceholders: false,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

interface TemplateState {
  templates: SellerMessageTemplate[]
  awayMessage: SellerAwayMessage
  addTemplate: (label: string, body: string) => void
  updateTemplate: (id: string, label: string, body: string) => void
  deleteTemplate: (id: string) => void
  setAwayEnabled: (enabled: boolean) => void
  setAwayBody: (body: string) => void
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return createJSONStorage(() => localStorage)
  }
  return createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))
}

export const useSellerTemplatesStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: BUILT_IN_TEMPLATES,
      awayMessage: {
        enabled: false,
        body: 'Thanks for reaching out! Our store is currently away. We will get back to you within 24 hours.',
      },

      addTemplate: (label, body) =>
        set((state) => ({
          templates: [
            ...state.templates,
            {
              id: `tpl-${Date.now()}`,
              label,
              body,
              hasPlaceholders: /\{order_id\}|\{tracking\}|\{buyer_name\}/.test(body),
              isBuiltIn: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateTemplate: (id, label, body) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, label, body, hasPlaceholders: /\{order_id\}|\{tracking\}|\{buyer_name\}/.test(body), updatedAt: new Date().toISOString() }
              : t,
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id || t.isBuiltIn),
        })),

      setAwayEnabled: (enabled) =>
        set((state) => ({ awayMessage: { ...state.awayMessage, enabled } })),

      setAwayBody: (body) =>
        set((state) => ({ awayMessage: { ...state.awayMessage, body } })),
    }),
    {
      name: 'chinooz-seller-templates',
      storage: getStorage(),
      partialize: (state) => ({
        templates: state.templates.filter((t) => !t.isBuiltIn),
        awayMessage: state.awayMessage,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<TemplateState>
        const userTemplates = p.templates ?? []
        const builtIns = BUILT_IN_TEMPLATES
        return {
          ...current,
          templates: [...builtIns, ...userTemplates],
          awayMessage: p.awayMessage ?? current.awayMessage,
        }
      },
    },
  ),
)
