import { products } from './fixtures'

export interface AssistantMessage {
  id: string
  from: 'user' | 'assistant'
  text: string
  products?: { id: string; name: string; image: string; price: number; slug: string }[]
  actions?: { label: string; type: 'view_product' | 'add_to_cart' | 'open_deals' | 'open_orders' | 'open_categories'; productId?: string }[]
  quickLinks?: { label: string; route: string }[]
  createdAt: string
}

const GIFT_PRODUCTS = [
  { id: 'prod-2', name: 'Handmade Dhaka Topi', image: 'https://picsum.photos/seed/topi/400/400', price: 850, slug: 'dhaka-topi' },
  { id: 'prod-4', name: 'Pashmina Shawl — Grade A', image: 'https://picsum.photos/seed/pashmina/400/400', price: 3500, slug: 'pashmina-shawl-grade-a' },
  { id: 'prod-6', name: 'Masala Tea — Organic Himalayan', image: 'https://picsum.photos/seed/masala/400/400', price: 450, slug: 'masala-tea-organic' },
]

const PHONE_PRODUCTS = [
  { id: 'prod-1', name: 'Samsung Galaxy A55 5G', image: 'https://picsum.photos/seed/a55/400/400', price: 45999, slug: 'samsung-galaxy-a55-5g' },
  { id: 'prod-8', name: 'Xiaomi Redmi Note 13 Pro', image: 'https://picsum.photos/seed/redmi/400/400', price: 32999, slug: 'redmi-note-13-pro' },
]

const DEAL_PRODUCTS = [
  { id: 'prod-1', name: 'Samsung Galaxy A55 5G', image: 'https://picsum.photos/seed/a55/400/400', price: 45999, slug: 'samsung-galaxy-a55-5g' },
  { id: 'prod-4', name: 'Pashmina Shawl — Grade A', image: 'https://picsum.photos/seed/pashmina/400/400', price: 3500, slug: 'pashmina-shawl-grade-a' },
  { id: 'prod-9', name: 'Singing Bowl — Hand Hammered', image: 'https://picsum.photos/seed/bowl/400/400', price: 2800, slug: 'singing-bowl-hand-hammered' },
]

function matchIntent(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('gift') || lower.includes('present')) return 'gifts'
  if (lower.includes('track') || lower.includes('order') || lower.includes('where')) return 'orders'
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('laptop')) return 'phones'
  if (lower.includes('deal') || lower.includes('sale') || lower.includes('discount') || lower.includes('offer')) return 'deals'
  if (lower.includes('categor') || lower.includes('browse')) return 'categories'
  if (lower.includes('help') || lower.includes('support')) return 'help'
  if (lower.includes('return') || lower.includes('refund')) return 'returns'
  if (lower.includes('deliver') || lower.includes('shipping')) return 'shipping'
  return 'general'
}

function buildResponse(input: string): Omit<AssistantMessage, 'id' | 'createdAt'> {
  const intent = matchIntent(input)

  switch (intent) {
    case 'gifts':
      return {
        from: 'assistant',
        text: 'Here are some great gift ideas under NPR 2,000! These are popular choices from local artisans:',
        products: GIFT_PRODUCTS.filter(p => p.price <= 2000),
        actions: [
          { label: 'View product', type: 'view_product', productId: 'prod-2' },
          { label: 'Browse deals', type: 'open_deals' },
        ],
      }
    case 'orders':
      return {
        from: 'assistant',
        text: 'I can help you track your orders! You have 2 active orders right now. Your Samsung Galaxy A55 was shipped via Pathao and is on its way.',
        actions: [
          { label: 'View orders', type: 'open_orders' },
        ],
        quickLinks: [
          { label: 'My Orders', route: '/orders' },
          { label: 'Track Package', route: '/orders' },
        ],
      }
    case 'phones':
      return {
        from: 'assistant',
        text: 'Great choice! Here are the top-selling phones right now. Both come with 6 months warranty:',
        products: PHONE_PRODUCTS,
        actions: [
          { label: 'View product', type: 'view_product', productId: 'prod-1' },
          { label: 'Add to cart', type: 'add_to_cart', productId: 'prod-8' },
        ],
      }
    case 'deals':
      return {
        from: 'assistant',
        text: 'The Dashain Sale is live! Here are the hottest deals right now — up to 50% off:',
        products: DEAL_PRODUCTS,
        quickLinks: [
          { label: 'All Deals', route: '/deals' },
          { label: 'Electronics', route: '/categories' },
        ],
      }
    case 'categories':
      return {
        from: 'assistant',
        text: 'Sure! Here are the main categories you can browse:',
        quickLinks: [
          { label: 'Electronics', route: '/categories' },
          { label: 'Fashion', route: '/categories' },
          { label: 'Home & Kitchen', route: '/categories' },
          { label: 'Beauty & Health', route: '/categories' },
          { label: 'Grocery', route: '/categories' },
        ],
      }
    case 'help':
      return {
        from: 'assistant',
        text: 'I\'m here to help! You can ask me about:\n• Tracking orders\n• Finding products or deals\n• Return & refund policies\n• Delivery information\n• Product recommendations',
      }
    case 'returns':
      return {
        from: 'assistant',
        text: 'We offer a 7-day easy return policy. Items can be returned within 7 days of delivery for a full refund. To initiate a return, go to My Orders and select the item you want to return.',
        actions: [
          { label: 'View orders', type: 'open_orders' },
        ],
      }
    case 'shipping':
      return {
        from: 'assistant',
        text: 'We offer three delivery options:\n• Same-day delivery (Kathmandu Valley)\n• Express delivery (1-2 days)\n• Standard delivery (3-5 days)\n\nFree delivery on orders above NPR 2,000!',
      }
    default:
      return {
        from: 'assistant',
        text: 'Thanks for your message! I can help you find products, track orders, discover deals, and more. Try asking me something specific, or use one of the suggestions below.',
        quickLinks: [
          { label: 'Best Deals', route: '/deals' },
          { label: 'My Orders', route: '/orders' },
          { label: 'Browse Categories', route: '/categories' },
        ],
      }
  }
}

export const assistantService = {
  async sendMessage(input: string): Promise<AssistantMessage> {
    const delay = 1000 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))
    const response = buildResponse(input)
    return {
      ...response,
      id: `assistant-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
  },
}

export const SUGGESTED_PROMPTS = [
  { key: 'gifts', label: 'Find gifts under NPR 2,000' },
  { key: 'track', label: 'Track my order' },
  { key: 'phones', label: 'Best phone deals' },
  { key: 'deals', label: 'Today\'s top deals' },
  { key: 'returns', label: 'Return policy' },
  { key: 'shipping', label: 'Delivery options' },
]
