/**
 * RS1 — Rider support tickets mock data + mock API.
 *
 * Surfaces:
 * - RiderTicketCategory:  category enum + metadata (i18n label keys, icons).
 * - RiderTicketStatus:  open | in_progress | resolved.
 * - RiderTicket:  full ticket with thread messages + context pre-fill.
 * - submitTicket():  mock submit with latency + auto-generated ticket id.
 * - getTickets():  list all tickets for the rider.
 * - getTicketById():  single ticket with thread.
 * - reopenTicket() / closeTicket():  status transitions.
 *
 * Thread copy is static (not i18n) because it represents agent replies that
 * would come from a real backend. Category + status labels are i18n-driven.
 */

export type RiderTicketStatus = 'open' | 'in_progress' | 'resolved'

export type RiderTicketCategory =
  | 'general'
  | 'payout'
  | 'deliveryIssue'
  | 'appBug'
  | 'safety'
  | 'account'
  | 'cod'

export interface RiderTicketCategoryMeta {
  key: RiderTicketCategory
  /** i18n key for the category label. */
  labelKey: string
  /** i18n key for the category description. */
  descKey: string
  /** lucide icon name resolved in the component. */
  icon: string
}

export interface RiderTicketAttachment {
  id: string
  /** Mock: a label like "Screenshot" or "Photo" — no real URI in mock mode. */
  name: string
  /** Mock: file type hint. */
  kind: 'screenshot' | 'photo'
}

export interface RiderTicketMessage {
  id: string
  /** "rider" or "agent" — who sent the message. */
  sender: 'rider' | 'agent'
  /** Agent display name when sender === "agent". */
  agentName?: string
  body: string
  createdAt: number // epoch ms
}

export interface RiderTicketContext {
  /** Order reference pre-filled from the active/recent delivery. */
  orderRef?: string
  /** Delivery status at the time of submission. */
  deliveryStatus?: string
  /** Pickup label. */
  pickup?: string
  /** Dropoff label. */
  dropoff?: string
  /** Trip payout in NPR (for earnings-related issues). */
  payout?: number
  /** Whether the trip was COD. */
  isCod?: boolean
}

export interface RiderTicket {
  id: string
  category: RiderTicketCategory
  status: RiderTicketStatus
  /** Short subject line (rider-entered or derived from category). */
  subject: string
  /** Full description from the rider. */
  description: string
  /** Attachments (mock — screenshots/photos). */
  attachments: RiderTicketAttachment[]
  /** Pre-filled context from the active/recent trip. */
  context: RiderTicketContext
  /** Thread of messages between rider and support agent. */
  messages: RiderTicketMessage[]
  createdAt: number
  updatedAt: number
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

export const RIDER_TICKET_CATEGORIES: RiderTicketCategoryMeta[] = [
  { key: 'general', labelKey: 'rider.support.ticketForm.catGeneral', descKey: 'rider.support.ticketForm.catGeneralDesc', icon: 'life-buoy' },
  { key: 'payout', labelKey: 'rider.support.ticketForm.catPayout', descKey: 'rider.support.ticketForm.catPayoutDesc', icon: 'wallet' },
  { key: 'deliveryIssue', labelKey: 'rider.support.ticketForm.catDeliveryIssue', descKey: 'rider.support.ticketForm.catDeliveryIssueDesc', icon: 'package' },
  { key: 'appBug', labelKey: 'rider.support.ticketForm.catAppBug', descKey: 'rider.support.ticketForm.catAppBugDesc', icon: 'bug' },
  { key: 'safety', labelKey: 'rider.support.ticketForm.catSafety', descKey: 'rider.support.ticketForm.catSafetyDesc', icon: 'shield' },
  { key: 'account', labelKey: 'rider.support.ticketForm.catAccount', descKey: 'rider.support.ticketForm.catAccountDesc', icon: 'user-cog' },
  { key: 'cod', labelKey: 'rider.support.ticketForm.catCod', descKey: 'rider.support.ticketForm.catCodDesc', icon: 'banknote' },
]

export function getRiderTicketCategoryMeta(
  key: RiderTicketCategory,
): RiderTicketCategoryMeta | undefined {
  return RIDER_TICKET_CATEGORIES.find(c => c.key === key)
}

// ---------------------------------------------------------------------------
// In-memory ticket store (mock)
// ---------------------------------------------------------------------------

const now = Date.now()
const hour = 3600_000
const day = 24 * hour

const SEED_TICKETS: RiderTicket[] = [
  {
    id: 'CHZ-9001',
    category: 'payout',
    status: 'open',
    subject: 'Payout did not arrive',
    description: 'My weekly payout has not reached my eSewa account. It was supposed to arrive on Friday.',
    attachments: [{ id: 'att-1', name: 'Screenshot of eSewa balance', kind: 'screenshot' }],
    context: { orderRef: 'ORD-4821', payout: 1850 },
    messages: [
      { id: 'm1', sender: 'rider', body: 'My weekly payout has not reached my eSewa account. It was supposed to arrive on Friday.', createdAt: now - 3 * hour },
      { id: 'm2', sender: 'agent', agentName: 'Priya (Support)', body: 'Hi, I can see your payout of NPR 1,850 is queued and should land in your eSewa within 2 hours. Sorry for the delay — there was a batch issue on our end.', createdAt: now - 2 * hour },
    ],
    createdAt: now - 3 * hour,
    updatedAt: now - 2 * hour,
  },
  {
    id: 'CHZ-9002',
    category: 'deliveryIssue',
    status: 'in_progress',
    subject: 'Buyer refused to accept order',
    description: 'The buyer would not take the delivery at drop-off. I waited 10 minutes and tried calling.',
    attachments: [],
    context: { orderRef: 'ORD-4798', deliveryStatus: 'delivered', pickup: 'Bhatbhateni Balaju', dropoff: 'Maharajgunj' },
    messages: [
      { id: 'm1', sender: 'rider', body: 'The buyer would not take the delivery at drop-off. I waited 10 minutes and tried calling.', createdAt: now - 26 * hour },
      { id: 'm2', sender: 'agent', agentName: 'Rohan (Support)', body: 'Thanks for reporting. I am contacting the buyer now to understand what happened. In the meantime, please keep the items safe. I will update you within 30 minutes.', createdAt: now - 25 * hour },
      { id: 'm3', sender: 'rider', body: 'Okay, I have the items with me at home.', createdAt: now - 24 * hour },
    ],
    createdAt: now - 26 * hour,
    updatedAt: now - 24 * hour,
  },
  {
    id: 'CHZ-9003',
    category: 'appBug',
    status: 'resolved',
    subject: 'App crashed during pickup',
    description: 'The app closed while I was confirming the pickup. I had to reopen and the order was still there.',
    attachments: [{ id: 'att-2', name: 'Photo of error screen', kind: 'photo' }],
    context: { orderRef: 'ORD-4755', deliveryStatus: 'delivered' },
    messages: [
      { id: 'm1', sender: 'rider', body: 'The app closed while I was confirming the pickup. I had to reopen and the order was still there.', createdAt: now - 3 * day },
      { id: 'm2', sender: 'agent', agentName: 'Priya (Support)', body: 'Thank you for the report. We have identified a crash bug in the pickup confirmation flow and deployed a fix in version 2.4.1. Please update your app. Sorry for the trouble!', createdAt: now - 2 * day },
      { id: 'm3', sender: 'rider', body: 'Updated and it works fine now. Thank you.', createdAt: now - 2 * day + 2 * hour },
    ],
    createdAt: now - 3 * day,
    updatedAt: now - 2 * day + 2 * hour,
  },
  {
    id: 'CHZ-9004',
    category: 'cod',
    status: 'resolved',
    subject: 'COD amount mismatch',
    description: 'The order said NPR 2,400 COD but the buyer paid NPR 2,000. I accepted the lower amount.',
    attachments: [],
    context: { orderRef: 'ORD-4720', deliveryStatus: 'delivered', isCod: true, payout: 2400 },
    messages: [
      { id: 'm1', sender: 'rider', body: 'The order said NPR 2,400 COD but the buyer paid NPR 2,000. I accepted the lower amount.', createdAt: now - 5 * day },
      { id: 'm2', sender: 'agent', agentName: 'Rohan (Support)', body: 'I have reviewed the order. The buyer was charged NPR 2,400 on their end. The NPR 400 difference will be deducted from your cash-in-hand balance, not your earnings. You do not need to take any action.', createdAt: now - 5 * day + 4 * hour },
      { id: 'm3', sender: 'rider', body: 'Understood, thank you for clarifying.', createdAt: now - 5 * day + 6 * hour },
    ],
    createdAt: now - 5 * day,
    updatedAt: now - 5 * day + 6 * hour,
  },
]

let ticketStore: RiderTicket[] = [...SEED_TICKETS]

// ---------------------------------------------------------------------------
// Mock API
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let ticketCounter = 9005

export interface SubmitTicketInput {
  category: RiderTicketCategory
  subject: string
  description: string
  attachments: RiderTicketAttachment[]
  context: RiderTicketContext
}

export interface SubmitTicketResult {
  success: boolean
  ticket: RiderTicket
  error?: string
}

/** Submit a new support ticket. Returns the created ticket with an auto-reply. */
export async function submitTicket(input: SubmitTicketInput): Promise<SubmitTicketResult> {
  await delay(600 + Math.random() * 600)
  const id = `CHZ-${ticketCounter++}`
  const ts = Date.now()
  const ticket: RiderTicket = {
    id,
    category: input.category,
    status: 'open',
    subject: input.subject,
    description: input.description,
    attachments: input.attachments,
    context: input.context,
    messages: [
      { id: `m-${ts}`, sender: 'rider', body: input.description, createdAt: ts },
    ],
    createdAt: ts,
    updatedAt: ts,
  }
  ticketStore = [ticket, ...ticketStore]
  // Simulate an auto-reply from support after a short delay.
  setTimeout(() => {
    const replyTs = Date.now()
    ticket.messages.push({
      id: `m-auto-${replyTs}`,
      sender: 'agent',
      agentName: 'Chinooz Support',
      body: 'Thank you for reaching out. We have received your report and will get back to you within 30 minutes. If this is urgent, please call our 24/7 hotline.',
      createdAt: replyTs,
    })
    ticket.updatedAt = replyTs
  }, 2000)
  return { success: true, ticket }
}

/** Get all tickets for the rider, sorted by most recent first. */
export async function getTickets(): Promise<RiderTicket[]> {
  await delay(300 + Math.random() * 300)
  return [...ticketStore].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Get a single ticket by id, including the full thread. */
export async function getTicketById(id: string): Promise<RiderTicket | null> {
  await delay(200 + Math.random() * 200)
  return ticketStore.find(t => t.id === id) ?? null
}

/** Reopen a resolved ticket. Returns the updated ticket. */
export async function reopenTicket(
  id: string,
  reason: string,
): Promise<{ success: boolean; ticket: RiderTicket | null; error?: string }> {
  await delay(400 + Math.random() * 400)
  const ticket = ticketStore.find(t => t.id === id)
  if (!ticket) return { success: false, ticket: null, error: 'Ticket not found' }
  if (ticket.status !== 'resolved') {
    return { success: false, ticket, error: 'Only resolved tickets can be reopened' }
  }
  const ts = Date.now()
  ticket.status = 'open'
  ticket.messages.push({
    id: `m-reopen-${ts}`,
    sender: 'rider',
    body: reason,
    createdAt: ts,
  })
  ticket.updatedAt = ts
  return { success: true, ticket }
}

/** Close a ticket (rider-initiated). Returns the updated ticket. */
export async function closeTicket(
  id: string,
): Promise<{ success: boolean; ticket: RiderTicket | null; error?: string }> {
  await delay(300 + Math.random() * 300)
  const ticket = ticketStore.find(t => t.id === id)
  if (!ticket) return { success: false, ticket: null, error: 'Ticket not found' }
  if (ticket.status === 'resolved') {
    return { success: true, ticket }
  }
  const ts = Date.now()
  ticket.status = 'resolved'
  ticket.messages.push({
    id: `m-close-${ts}`,
    sender: 'rider',
    body: 'I am closing this ticket.',
    createdAt: ts,
  })
  ticket.updatedAt = ts
  return { success: true, ticket }
}

/** Add a message to an existing ticket thread. */
export async function addTicketMessage(
  id: string,
  body: string,
): Promise<{ success: boolean; ticket: RiderTicket | null; error?: string }> {
  await delay(400 + Math.random() * 400)
  const ticket = ticketStore.find(t => t.id === id)
  if (!ticket) return { success: false, ticket: null, error: 'Ticket not found' }
  const ts = Date.now()
  ticket.messages.push({ id: `m-${ts}`, sender: 'rider', body, createdAt: ts })
  ticket.updatedAt = ts
  // Simulate agent reply for non-resolved tickets.
  if (ticket.status !== 'resolved') {
    setTimeout(() => {
      const replyTs = Date.now()
      ticket.messages.push({
        id: `m-reply-${replyTs}`,
        sender: 'agent',
        agentName: 'Chinooz Support',
        body: 'Thanks for the update. We are looking into this and will get back to you shortly.',
        createdAt: replyTs,
      })
      ticket.updatedAt = replyTs
    }, 2500)
  }
  return { success: true, ticket }
}

/** Reset the ticket store to seed data (test/dev only). */
export function __resetTicketStore(): void {
  ticketStore = [...SEED_TICKETS]
  ticketCounter = 9005
}
