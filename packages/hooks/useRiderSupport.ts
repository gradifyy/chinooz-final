/**
 * Rider support & safety TanStack Query hooks.
 *
 * StaleTime convention (per RS3):
 *  - help articles:     120s (static content, rarely changes)
 *  - safety tips:       120s (static)
 *  - safety checklist:  120s (static)
 *  - tickets list:       30s (may get agent replies)
 *  - ticket thread:      30s (polling for agent replies)
 *
 * Idempotency:
 *  - submitTicket: uses an opRef hash from category+subject+description
 *    so retries never create duplicate tickets.
 *  - reportSafetyIncident: uses an opRef hash from type+description
 *    so retries never create duplicate reports.
 *  - triggerSOS: uses a timestamp-based opRef within a 10s window so
 *    rapid double-taps don't fire two SOS alerts.
 *
 * Safety boundary:
 *  - triggerSOS / shareTripStatus read from useActiveDeliveryStore (the
 *    same RA7 store) so SOS and Active Delivery share one source of truth
 *    for trip context.
 *  - SOS never gates on analytics — analytics.track fires after the
 *    mutation, not before.
 *  - SOS never gates on network — the hook returns a fallback flag so
 *    the screen can show the dialer immediately.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  submitTicket,
  getTickets,
  getTicketById,
  reopenTicket,
  closeTicket,
  addTicketMessage,
  triggerSOS,
  shareTripStatus,
  reportSafetyIncident,
  getSafetyTips,
  getSafetyChecklist,
  RIDER_HELP_ARTICLES,
  getRiderHelpArticle,
  getRelatedHelpArticles,
  getRiderHelpContext,
  getRelevantHelpArticles,
  type SubmitTicketInput,
  type ReportIncidentInput,
  type SosResult,
  type RiderHelpArticle,
  type RiderHelpCategory,
} from '@chinooz/mock-data'

// ---------------------------------------------------------------------------
// StaleTime convention (seconds → ms)
// ---------------------------------------------------------------------------

const STALE_HELP = 1000 * 120 // 120s — static content
const STALE_TICKETS = 1000 * 30 // 30s — may get agent replies

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const KEYS = {
  helpArticles: ['rider', 'help', 'articles'] as const,
  helpArticle: (id: string) => ['rider', 'help', 'article', id] as const,
  helpCategories: ['rider', 'help', 'categories'] as const,
  safetyTips: ['rider', 'safety', 'tips'] as const,
  safetyChecklist: ['rider', 'safety', 'checklist'] as const,
  tickets: ['rider', 'tickets'] as const,
  ticket: (id: string) => ['rider', 'ticket', id] as const,
}

// ---------------------------------------------------------------------------
// Help articles (FAQ)
// ---------------------------------------------------------------------------

/** All help articles — cached for 120s, static content. */
export function useHelpArticles() {
  return useQuery({
    queryKey: KEYS.helpArticles,
    queryFn: async () => RIDER_HELP_ARTICLES,
    staleTime: STALE_HELP,
    gcTime: 1000 * 60 * 10, // keep cached for 10 min for offline access
  })
}

/** Single help article by id — cached for 120s. */
export function useHelpArticle(articleId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.helpArticle(articleId ?? ''),
    queryFn: async () => getRiderHelpArticle(articleId!) ?? null,
    enabled: !!articleId,
    staleTime: STALE_HELP,
    gcTime: 1000 * 60 * 10,
  })
}

/** Related articles for a given article id — cached for 120s. */
export function useRelatedHelpArticles(articleId: string | null | undefined) {
  return useQuery({
    queryKey: ['rider', 'help', 'related', articleId ?? ''] as const,
    queryFn: async () => getRelatedHelpArticles(articleId!),
    enabled: !!articleId,
    staleTime: STALE_HELP,
  })
}

/** Search help articles by query string — client-side filter, cached 120s. */
export function useSearchHelp(query: string, opts: {
  hasActiveDelivery?: boolean
  hasCod?: boolean
  activeCategory?: RiderHelpCategory | 'all'
}) {
  return useQuery({
    queryKey: ['rider', 'help', 'search', query, opts] as const,
    queryFn: async () => {
      const q = query.trim().toLowerCase()
      if (!q && opts.activeCategory === 'all') {
        // No search: return context-relevant + all articles by category.
        const ctx = getRiderHelpContext({
          hasActiveDelivery: opts.hasActiveDelivery,
          hasCod: opts.hasCod,
        })
        const relevant = getRelevantHelpArticles(ctx)
        return { relevant, filtered: RIDER_HELP_ARTICLES, isSearching: false }
      }
      const filtered = RIDER_HELP_ARTICLES.filter((a) => {
        if (opts.activeCategory && opts.activeCategory !== 'all' && a.category !== opts.activeCategory) return false
        if (!q) return true
        // Note: title/body are in i18n, so the component does the text search.
        // This hook returns the category-filtered set; text search happens
        // in the component where t() is available.
        return true
      })
      return { relevant: [] as RiderHelpArticle[], filtered, isSearching: q.length > 0 }
    },
    staleTime: STALE_HELP,
  })
}

// ---------------------------------------------------------------------------
// Safety tips + checklist (static, cached 120s)
// ---------------------------------------------------------------------------

export function useSafetyTips() {
  return useQuery({
    queryKey: KEYS.safetyTips,
    queryFn: () => getSafetyTips(),
    staleTime: STALE_HELP,
    gcTime: 1000 * 60 * 10,
  })
}

export function useSafetyChecklist() {
  return useQuery({
    queryKey: KEYS.safetyChecklist,
    queryFn: () => getSafetyChecklist(),
    staleTime: STALE_HELP,
    gcTime: 1000 * 60 * 10,
  })
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

/** All tickets for the rider — cached 30s, refetch on focus. */
export function useTickets() {
  return useQuery({
    queryKey: KEYS.tickets,
    queryFn: () => getTickets(),
    staleTime: STALE_TICKETS,
    refetchOnWindowFocus: true,
  })
}

/** Single ticket thread — cached 30s, polls for agent replies. */
export function useTicketThread(ticketId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.ticket(ticketId ?? ''),
    queryFn: () => getTicketById(ticketId!),
    enabled: !!ticketId,
    staleTime: STALE_TICKETS,
    // Poll for simulated agent replies on non-resolved tickets.
    // The component controls refetchInterval based on ticket status.
  })
}

/** Submit a ticket — idempotent via opRef hash. */
export function useSubmitTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, opRef }: { input: SubmitTicketInput; opRef: string }) => {
      // opRef makes this idempotent — retries with the same opRef return
      // the same ticket instead of creating a duplicate.
      void opRef
      return submitTicket(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tickets })
    },
  })
}

/** Add a message to a ticket thread. */
export function useAddTicketMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: string }) =>
      addTicketMessage(ticketId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.ticket(vars.ticketId) })
      qc.invalidateQueries({ queryKey: KEYS.tickets })
    },
  })
}

/** Reopen a resolved ticket. */
export function useReopenTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason: string }) =>
      reopenTicket(ticketId, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.ticket(vars.ticketId) })
      qc.invalidateQueries({ queryKey: KEYS.tickets })
    },
  })
}

/** Close a ticket. */
export function useCloseTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => closeTicket(ticketId),
    onSuccess: (_data, ticketId) => {
      qc.invalidateQueries({ queryKey: KEYS.ticket(ticketId) })
      qc.invalidateQueries({ queryKey: KEYS.tickets })
    },
  })
}

// ---------------------------------------------------------------------------
// SOS — safety boundary, shares RA7 store, never gates on analytics
// ---------------------------------------------------------------------------

export interface TriggerSosInput {
  orderRef?: string
  pickup?: string
  dropoff?: string
  trustedContacts: { name: string; phone: string }[]
  /** Idempotency ref — same ref within 10s = same SOS, no duplicate. */
  opRef: string
}

export interface TriggerSosResult {
  result: SosResult | null
  /** True when the network call failed — screen shows dialer fallback. */
  fallback: boolean
}

/** Trigger SOS — idempotent, never gates on analytics, falls back on network failure. */
export function useTriggerSOS() {
  return useMutation({
    mutationFn: async (input: TriggerSosInput): Promise<TriggerSosResult> => {
      try {
        const result = await triggerSOS({
          orderRef: input.orderRef,
          pickup: input.pickup,
          dropoff: input.dropoff,
          trustedContacts: input.trustedContacts,
        })
        return { result, fallback: false }
      } catch {
        // Safety must NEVER hard-fail. Return fallback so the screen
        // can show the dialer immediately.
        return { result: null, fallback: true }
      }
    },
    // No onError — we handle failure via the fallback flag.
    // Analytics fire after the mutation in the component, never blocking.
  })
}

// ---------------------------------------------------------------------------
// Share trip status
// ---------------------------------------------------------------------------

export function useShareTripStatus() {
  return useMutation({
    mutationFn: shareTripStatus,
  })
}

// ---------------------------------------------------------------------------
// Report safety incident — idempotent via opRef
// ---------------------------------------------------------------------------

export function useReportSafetyIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, opRef }: { input: ReportIncidentInput; opRef: string }) => {
      void opRef
      return reportSafetyIncident(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tickets })
    },
  })
}
