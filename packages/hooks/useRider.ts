/**
 * Rider TanStack Query hooks.
 *
 * Establishes the rider staleTime convention (reused across every screen):
 *  - rider profile:        120s
 *  - available jobs:       15s (+ realtime dispatch stream)
 *  - active delivery:      0   (always fresh / realtime)
 *  - earnings + COD wallet: 30s
 *  - incentives/quests:    60s
 *  - demand + surge zones:  30s
 *  - performance/ratings:  120s
 *
 * Optimistic updates + rollback pattern (accept/decline, status transitions,
 * COD collect, deposit, withdraw, quest claim) use idempotent opRefs so
 * retries never double-count/double-pay/double-claim.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as riderApi from '@chinooz/mock-data/riderApi'
import {
  getRiderProfile,
  getRiderPerformance,
  getRiderPerformanceDetail,
  getRiderEarningsChart,
  getRiderEarningsBreakdown,
  getRiderEarningsLedger,
  getRiderTripLedger,
  getRiderTripDetail,
  getRiderPersonalProfile,
  updateRiderPersonalProfile,
  requestRiderPhoneOtp,
  verifyRiderPhoneOtp,
  getCODWalletSync,
  getRiderCashWallet,
  getCodCollections,
  getDepositHistory,
  getDepositReceipt,
  type RiderVehicle,
  type RiderDocument,
  type RiderPreferences,
  type RiderSecurity,
  type RiderCashWallet,
} from '@chinooz/mock-data'
import type { RiderPerformanceRange, RiderEarningsRange, GeoPoint, RiderMetricId, PayoutMethodKind, RiderPayoutMethod, RiderWithdrawal, RiderWithdrawalDetail, RiderEarningsOverview } from '@chinooz/mock-data'
import type {
  RiderJob,
  ActiveDelivery,
  DeliveryStatus,
} from '@chinooz/types'
import { analytics } from '@chinooz/analytics'
import { useRiderEarningsStore, useCODWalletStore } from '@chinooz/state'

// ---------------------------------------------------------------------------
// StaleTime convention (seconds → ms)
// ---------------------------------------------------------------------------

const STALE_PROFILE = 1000 * 120
const STALE_JOBS = 1000 * 15
const STALE_ACTIVE = 0
const STALE_EARNINGS = 1000 * 30
const STALE_WALLET = 1000 * 30
const STALE_LEDGER = 1000 * 30
const STALE_INCENTIVES = 1000 * 60
const STALE_DEMAND = 1000 * 30
const STALE_PERFORMANCE = 1000 * 120
const STALE_PAYOUT_METHODS = 1000 * 60
const STALE_WITHDRAWALS = 1000 * 30

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const KEYS = {
  profile: ['rider', 'profile'] as const,
  jobs: (limit?: number) => ['rider', 'jobs', { limit }] as const,
  job: (id: string) => ['rider', 'job', id] as const,
  active: ['rider', 'active-delivery'] as const,
  earnings: ['rider', 'earnings'] as const,
  earningsChart: (range: RiderEarningsRange) => ['rider', 'earnings', 'chart', range.key] as const,
  earningsBreakdown: (range: RiderEarningsRange) =>
    ['rider', 'earnings', 'breakdown', range.key] as const,
  earningsLedger: ['rider', 'earnings', 'ledger'] as const,
  wallet: ['rider', 'cod-wallet'] as const,
  codCollections: ['rider', 'cod-collections'] as const,
  depositHistory: ['rider', 'deposit-history'] as const,
  depositReceipt: (id: string) => ['rider', 'deposit-receipt', id] as const,
  incentives: ['rider', 'incentives'] as const,
  demand: ['rider', 'demand-zones'] as const,
  surge: ['rider', 'surge-zones'] as const,
  surgeDetail: ['rider', 'surge-detail'] as const,
  forecast: ['rider', 'demand-forecast'] as const,
  zoneDetail: (zoneId: string) => ['rider', 'zone-detail', zoneId] as const,
  performance: (period: RiderPerformanceRange) =>
    ['rider', 'performance', period.key] as const,
  performanceDetail: (period: RiderPerformanceRange) =>
    ['rider', 'performance', 'detail', period.key] as const,
  metricDetail: (metricId: RiderMetricId, period: RiderPerformanceRange) =>
    ['rider', 'performance', 'metric', metricId, period.key] as const,
  ratings: (stars: number | 'all', tag: string | 'all') =>
    ['rider', 'ratings', { stars, tag }] as const,
  tier: ['rider', 'tier'] as const,
  personal: ['rider', 'personal-profile'] as const,
  vehicle: ['rider', 'vehicle'] as const,
  documents: ['rider', 'documents'] as const,
  preferences: ['rider', 'preferences'] as const,
  security: ['rider', 'security'] as const,
  payoutMethods: ['rider', 'payout-methods'] as const,
  withdrawals: ['rider', 'withdrawals'] as const,
  withdrawal: (id: string) => ['rider', 'withdrawal', id] as const,
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function useRiderProfile() {
  return useQuery({
    queryKey: KEYS.profile,
    queryFn: () => riderApi.getRiderProfileApi(),
    staleTime: STALE_PROFILE,
  })
}

export function useRiderPersonalProfile() {
  return useQuery({
    queryKey: KEYS.personal,
    queryFn: () => getRiderPersonalProfile(),
    staleTime: STALE_PROFILE,
  })
}

export function useUpdateRiderPersonalProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRiderPersonalProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.personal })
      qc.invalidateQueries({ queryKey: KEYS.profile })
    },
  })
}

export function useRequestRiderPhoneOtp() {
  return useMutation({ mutationFn: requestRiderPhoneOtp })
}

export function useVerifyRiderPhoneOtp() {
  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      verifyRiderPhoneOtp(phone, code),
  })
}

// ---------------------------------------------------------------------------
// Online status
// ---------------------------------------------------------------------------

export function useSetOnlineStatus() {
  return useMutation({
    mutationFn: (status: 'online' | 'offline' | 'paused') =>
      riderApi.setOnlineStatus(status),
  })
}

// ---------------------------------------------------------------------------
// Available jobs (+ realtime dispatch)
// ---------------------------------------------------------------------------

export function useAvailableJobs(limit?: number) {
  return useQuery({
    queryKey: KEYS.jobs(limit),
    queryFn: () => riderApi.getAvailableJobs(limit),
    staleTime: STALE_JOBS,
    refetchOnWindowFocus: true,
  })
}

export function useJobById(jobId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.job(jobId ?? ''),
    queryFn: () => riderApi.getJobById(jobId!),
    enabled: !!jobId,
    staleTime: STALE_JOBS,
  })
}

// ---------------------------------------------------------------------------
// Accept / decline (optimistic + idempotent)
// ---------------------------------------------------------------------------

export function useAcceptJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, opRef }: { jobId: string; opRef: string }) =>
      riderApi.acceptJob(jobId, opRef),
    onMutate: async ({ jobId }) => {
      // Optimistic: remove the job from the available list immediately.
      await qc.cancelQueries({ queryKey: ['rider', 'jobs'] })
      const prevJobs = qc.getQueryData<RiderJob[]>(KEYS.jobs())
      if (prevJobs) {
        qc.setQueryData<RiderJob[]>(
          KEYS.jobs(),
          prevJobs.filter(j => j.id !== jobId),
        )
      }
      return { prevJobs }
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on failure.
      if (ctx?.prevJobs) qc.setQueryData(KEYS.jobs(), ctx.prevJobs)
    },
    onSuccess: data => {
      if (data.activeDelivery) {
        qc.setQueryData(KEYS.active, data.activeDelivery)
      }
      qc.invalidateQueries({ queryKey: ['rider', 'jobs'] })
    },
  })
}

export function useDeclineJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, opRef }: { jobId: string; opRef: string }) =>
      riderApi.declineJob(jobId, opRef),
    onMutate: async ({ jobId }) => {
      await qc.cancelQueries({ queryKey: ['rider', 'jobs'] })
      const prevJobs = qc.getQueryData<RiderJob[]>(KEYS.jobs())
      if (prevJobs) {
        qc.setQueryData<RiderJob[]>(
          KEYS.jobs(),
          prevJobs.filter(j => j.id !== jobId),
        )
      }
      return { prevJobs }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevJobs) qc.setQueryData(KEYS.jobs(), ctx.prevJobs)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rider', 'jobs'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Active delivery (realtime — staleTime 0)
// ---------------------------------------------------------------------------

export function useActiveDelivery() {
  return useQuery({
    queryKey: KEYS.active,
    queryFn: () => riderApi.getActiveDelivery(),
    staleTime: STALE_ACTIVE,
    refetchInterval: false, // realtime handled by the dispatch stream + simulator
  })
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      next,
      opRef,
    }: {
      jobId: string
      next: DeliveryStatus
      opRef: string
    }) => riderApi.updateDeliveryStatus(jobId, next, opRef),
    onMutate: async ({ jobId, next }) => {
      await qc.cancelQueries({ queryKey: KEYS.active })
      const prev = qc.getQueryData<ActiveDelivery | null>(KEYS.active)
      if (prev && prev.jobId === jobId) {
        const updated: ActiveDelivery = {
          ...prev,
          status: next,
          updatedAt: Date.now(),
        }
        qc.setQueryData<ActiveDelivery | null>(KEYS.active, updated)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(KEYS.active, ctx.prev)
    },
    onSuccess: data => {
      qc.setQueryData(KEYS.active, data.activeDelivery)
      // Invalidate buyer/seller order queries so tracking updates propagate.
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
    },
  })
}

export function useSubmitProofOfDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      proof,
      opRef,
    }: {
      jobId: string
      proof: { type: 'photo' | 'otp' | 'signature'; value: string }
      opRef: string
    }) => riderApi.submitProofOfDelivery(jobId, proof, opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.active })
    },
  })
}

// ---------------------------------------------------------------------------
// COD collect (optimistic + idempotent + integer-paisa)
// ---------------------------------------------------------------------------

export function useCollectCOD() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      amountNpr,
      opRef,
    }: {
      jobId: string
      amountNpr: number
      opRef: string
    }) => riderApi.collectCOD(jobId, amountNpr, opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.wallet })
      qc.invalidateQueries({ queryKey: KEYS.active })
    },
  })
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

export function useRiderEarnings() {
  return useQuery({
    queryKey: KEYS.earnings,
    queryFn: () => riderApi.getRiderEarningsApi(),
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderEarningsChart(range: RiderEarningsRange) {
  return useQuery({
    queryKey: KEYS.earningsChart(range),
    queryFn: () => getRiderEarningsChart(range),
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderEarningsBreakdown(range: RiderEarningsRange) {
  return useQuery({
    queryKey: KEYS.earningsBreakdown(range),
    queryFn: () => getRiderEarningsBreakdown(range),
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderEarningsLedger() {
  return useQuery({
    queryKey: KEYS.earningsLedger,
    queryFn: () => getRiderEarningsLedger(),
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderTripLedger() {
  return useQuery({
    queryKey: ['rider', 'trip-ledger'] as const,
    queryFn: () => getRiderTripLedger(),
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderTripDetail(tripId: string | null | undefined) {
  return useQuery({
    queryKey: ['rider', 'trip-detail', tripId ?? ''] as const,
    queryFn: () => getRiderTripDetail(tripId!),
    enabled: !!tripId,
    staleTime: STALE_EARNINGS,
  })
}

export function useRiderCashWallet() {
  return useQuery({
    queryKey: ['rider', 'cash-wallet'] as const,
    queryFn: () => getRiderCashWallet(),
    staleTime: STALE_WALLET,
  })
}

export function useRiderRequestWithdrawal() {
  const qc = useQueryClient()
  const beginCashout = useRiderEarningsStore(s => s.beginCashout)
  const completeCashout = useRiderEarningsStore(s => s.completeCashout)
  const cancelCashout = useRiderEarningsStore(s => s.cancelCashout)
  return useMutation({
    mutationFn: ({
      amountNpr,
      destination,
      opRef,
    }: {
      amountNpr: number
      destination: PayoutMethodKind
      opRef: string
    }) => riderApi.requestWithdrawal(amountNpr, destination, opRef),
    onMutate: async ({ amountNpr }) => {
      // Optimistic: reduce the displayed balance immediately.
      beginCashout()
      const prev = qc.getQueryData<RiderEarningsOverview | undefined>(KEYS.earnings)
      if (prev) {
        qc.setQueryData<RiderEarningsOverview>(KEYS.earnings, {
          ...prev,
          withdrawableBalance: Math.max(0, prev.withdrawableBalance - Math.round(amountNpr)),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on failure.
      cancelCashout()
      if (ctx?.prev) qc.setQueryData(KEYS.earnings, ctx.prev)
    },
    onSuccess: (_data, { amountNpr }) => {
      completeCashout(amountNpr)
      qc.invalidateQueries({ queryKey: KEYS.earnings })
      qc.invalidateQueries({ queryKey: KEYS.withdrawals })
      analytics.track('rider_withdrawal_requested', { amountNpr })
    },
  })
}

// ---------------------------------------------------------------------------
// Payout methods (eSewa / Khalti / bank)
// ---------------------------------------------------------------------------

export function useRiderPayoutMethods() {
  return useQuery({
    queryKey: KEYS.payoutMethods,
    queryFn: () => riderApi.getRiderPayoutMethodsApi(),
    staleTime: STALE_PAYOUT_METHODS,
  })
}

export function useAddRiderPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      method,
      opRef,
    }: {
      method: Omit<RiderPayoutMethod, 'id' | 'isDefault' | 'createdAt'>
      opRef: string
    }) => riderApi.addRiderPayoutMethodApi(method, opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payoutMethods })
      analytics.track('rider_payout_method_added')
    },
  })
}

export function useSetDefaultRiderPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ methodId, opRef }: { methodId: string; opRef: string }) =>
      riderApi.setDefaultRiderPayoutMethodApi(methodId, opRef),
    onMutate: async ({ methodId }) => {
      await qc.cancelQueries({ queryKey: KEYS.payoutMethods })
      const prev = qc.getQueryData<RiderPayoutMethod[]>(KEYS.payoutMethods)
      if (prev) {
        qc.setQueryData<RiderPayoutMethod[]>(
          KEYS.payoutMethods,
          prev.map(m => ({ ...m, isDefault: m.id === methodId })),
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.payoutMethods, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.payoutMethods })
    },
  })
}

export function useDeleteRiderPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ methodId, opRef }: { methodId: string; opRef: string }) =>
      riderApi.deleteRiderPayoutMethodApi(methodId, opRef),
    onMutate: async ({ methodId }) => {
      await qc.cancelQueries({ queryKey: KEYS.payoutMethods })
      const prev = qc.getQueryData<RiderPayoutMethod[]>(KEYS.payoutMethods)
      if (prev) {
        qc.setQueryData<RiderPayoutMethod[]>(
          KEYS.payoutMethods,
          prev.filter(m => m.id !== methodId),
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.payoutMethods, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.payoutMethods })
    },
  })
}

// ---------------------------------------------------------------------------
// Withdrawals (history + detail)
// ---------------------------------------------------------------------------

export function useRiderWithdrawals() {
  return useQuery({
    queryKey: KEYS.withdrawals,
    queryFn: () => riderApi.getRiderWithdrawalsApi(),
    staleTime: STALE_WITHDRAWALS,
  })
}

export function useRiderWithdrawalDetail(withdrawalId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.withdrawal(withdrawalId ?? ''),
    queryFn: () => riderApi.getRiderWithdrawalByIdApi(withdrawalId!),
    enabled: !!withdrawalId,
    staleTime: STALE_WITHDRAWALS,
  })
}

// ---------------------------------------------------------------------------
// COD wallet + deposit
// ---------------------------------------------------------------------------

export function useCODWallet() {
  return useQuery({
    queryKey: KEYS.wallet,
    queryFn: () => riderApi.getCODWalletApi(),
    staleTime: STALE_WALLET,
    // Seed with the sync snapshot so the hero renders on first paint.
    placeholderData: getCODWalletSync(),
  })
}

export function useDepositCash() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      amountNpr,
      opRef,
    }: {
      amountNpr: number
      opRef: string
    }) => riderApi.depositCash(amountNpr, opRef),
    onMutate: async ({ amountNpr }) => {
      await qc.cancelQueries({ queryKey: KEYS.wallet })
      const prev = qc.getQueryData<ReturnType<typeof getCODWalletSync>>(KEYS.wallet)
      if (prev) {
        // Optimistic: reduce cashInHand + increase depositedTotal.
        const depositedTotal = prev.codDepositedTotal + Math.round(amountNpr)
        qc.setQueryData(KEYS.wallet, {
          ...prev,
          codDepositedTotal: depositedTotal,
          cashInHand: prev.codCollectedTotal - depositedTotal,
          pendingToDeposit: prev.codCollectedTotal - depositedTotal,
          depositedToday: prev.depositedToday + Math.round(amountNpr),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.wallet, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.wallet })
    },
  })
}

// ---------------------------------------------------------------------------
// Incentives / quests
// ---------------------------------------------------------------------------

export function useIncentives() {
  return useQuery({
    queryKey: KEYS.incentives,
    queryFn: () => riderApi.getIncentivesApi(),
    staleTime: STALE_INCENTIVES,
  })
}

export function useClaimQuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ questId, opRef }: { questId: string; opRef: string }) =>
      riderApi.claimQuest(questId, opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.incentives })
      qc.invalidateQueries({ queryKey: KEYS.earnings })
    },
  })
}

// ---------------------------------------------------------------------------
// Demand + surge zones
// ---------------------------------------------------------------------------

export function useDemandZones() {
  return useQuery({
    queryKey: KEYS.demand,
    queryFn: () => riderApi.getDemandZonesApi(),
    staleTime: STALE_DEMAND,
  })
}

export function useSurgeZones() {
  return useQuery({
    queryKey: KEYS.surge,
    queryFn: () => riderApi.getSurgeZonesApi(),
    staleTime: STALE_DEMAND,
  })
}

/**
 * Demand forecast / peak timeline. Shares the same staleTime (30s) as
 * demand/surge. The refetchInterval (30s) sits behind the RS3 realtime
 * boundary: the AppStateProvider pauses TanStack Query refetches when the
 * app is backgrounded or offline.
 */
export function useDemandForecast() {
  return useQuery({
    queryKey: KEYS.forecast,
    queryFn: () => riderApi.getDemandForecastApi(),
    staleTime: STALE_DEMAND,
    refetchInterval: STALE_DEMAND,
  })
}

/**
 * Surge / peak-pay detail (RI5). Shares the same staleTime (30s) as
 * demand/surge. RefetchInterval keeps the countdown + active windows fresh.
 */
export function useSurgeDetail() {
  return useQuery({
    queryKey: KEYS.surgeDetail,
    queryFn: () => riderApi.getSurgeDetailApi(),
    staleTime: STALE_DEMAND,
    refetchInterval: STALE_DEMAND,
  })
}

/** Zone detail: a single zone + surge + recommendations. */
export function useZoneDetail(zoneId: string | null, riderLocation: GeoPoint) {
  return useQuery({
    queryKey: KEYS.zoneDetail(zoneId ?? ''),
    queryFn: () => riderApi.getZoneDetailApi(zoneId!, riderLocation),
    enabled: !!zoneId,
    staleTime: STALE_DEMAND,
  })
}

// ---------------------------------------------------------------------------
// Performance / ratings
// ---------------------------------------------------------------------------

export function useRiderPerformance(period: RiderPerformanceRange) {
  return useQuery({
    queryKey: KEYS.performance(period),
    queryFn: () => getRiderPerformance(period),
    staleTime: STALE_PERFORMANCE,
  })
}

export function useRiderPerformanceDetail(period: RiderPerformanceRange) {
  return useQuery({
    queryKey: KEYS.performanceDetail(period),
    queryFn: () => getRiderPerformanceDetail(period),
    staleTime: STALE_PERFORMANCE,
  })
}

/** Per-metric detail + trend (RP2). */
export function useRiderMetricDetail(
  metricId: RiderMetricId,
  period: RiderPerformanceRange,
) {
  return useQuery({
    queryKey: KEYS.metricDetail(metricId, period),
    queryFn: () => riderApi.getRiderMetricDetailApi(metricId, period),
    staleTime: STALE_PERFORMANCE,
  })
}

/** Rider ratings + feedback (RP3). */
export function useRiderRatings(stars: number | 'all' = 'all', tag: string | 'all' = 'all') {
  return useQuery({
    queryKey: KEYS.ratings(stars, tag),
    queryFn: () => riderApi.getRiderRatingsApi({ stars, tag }),
    staleTime: STALE_PERFORMANCE,
  })
}

/**
 * Report an unfair rating (RP3). Optimistic + rollback: the reported rating
 * is marked locally immediately, and rolled back on error. Idempotent via
 * `opRef` so retries never double-report.
 */
export function useReportRiderRating() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ratingId, opRef }: { ratingId: string; opRef: string }) =>
      riderApi.reportRiderRatingApi(ratingId, opRef),
    onMutate: async ({ ratingId }) => {
      await qc.cancelQueries({ queryKey: ['rider', 'ratings'] })
      const prevQueries = qc.getQueriesData({ queryKey: ['rider', 'ratings'] })
      qc.setQueriesData({ queryKey: ['rider', 'ratings'] }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const data = old as { items?: Array<{ id: string; reported?: boolean }> }
        if (!data.items) return old
        return {
          ...data,
          items: data.items.map((item: { id: string; reported?: boolean }) =>
            item.id === ratingId ? { ...item, reported: true } : item,
          ),
        }
      })
      return { prevQueries }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevQueries) {
        ctx.prevQueries.forEach(([key, data]) => {
          qc.setQueryData(key, data)
        })
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rider', 'ratings'] })
    },
  })
}

/** Rider tier + standing + improvement (RP4). */
export function useRiderTierDetail() {
  return useQuery({
    queryKey: KEYS.tier,
    queryFn: () => riderApi.getRiderTierDetailApi(),
    staleTime: STALE_PERFORMANCE,
  })
}

// ---------------------------------------------------------------------------
// Vehicle & documents
// ---------------------------------------------------------------------------

export function useRiderVehicle() {
  return useQuery({
    queryKey: KEYS.vehicle,
    queryFn: () => riderApi.getRiderVehicleApi(),
    staleTime: STALE_PROFILE,
  })
}

export function useUpdateRiderVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: riderApi.updateRiderVehicleApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.vehicle })
      qc.invalidateQueries({ queryKey: KEYS.profile })
    },
  })
}

export function useRiderDocuments() {
  return useQuery({
    queryKey: KEYS.documents,
    queryFn: () => riderApi.getRiderDocumentsApi(),
    staleTime: STALE_PROFILE,
  })
}

export function useResubmitDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, opRef }: { docId: string; opRef: string }) =>
      riderApi.resubmitRiderDocumentApi(docId, opRef),
    onMutate: async ({ docId }) => {
      await qc.cancelQueries({ queryKey: KEYS.documents })
      const prev = qc.getQueryData<RiderDocument[]>(KEYS.documents)
      if (prev) {
        qc.setQueryData<RiderDocument[]>(
          KEYS.documents,
          prev.map(d =>
            d.id === docId
              ? { ...d, status: 'pending', uploadedAt: new Date().toISOString().slice(0, 10), rejectionReasonKey: null }
              : d,
          ),
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.documents, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.documents })
    },
  })
}

// ---------------------------------------------------------------------------
// Preferences (optimistic toggle + rollback)
// ---------------------------------------------------------------------------

export function useRiderPreferences() {
  return useQuery({
    queryKey: KEYS.preferences,
    queryFn: () => riderApi.getRiderPreferencesApi(),
    staleTime: STALE_PROFILE,
  })
}

export function useUpdateRiderPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: riderApi.updateRiderPreferencesApi,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: KEYS.preferences })
      const prev = qc.getQueryData<RiderPreferences>(KEYS.preferences)
      if (prev) {
        // Deep-merge the partial update into the cached preferences.
        const merged: RiderPreferences = {
          notifications: { ...prev.notifications, ...(data as Partial<RiderPreferences>).notifications },
          app: { ...prev.app, ...(data as Partial<RiderPreferences>).app },
          job: { ...prev.job, ...(data as Partial<RiderPreferences>).job },
        }
        qc.setQueryData<RiderPreferences>(KEYS.preferences, merged)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.preferences, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.preferences })
    },
  })
}

// ---------------------------------------------------------------------------
// Security (optimistic toggle + rollback)
// ---------------------------------------------------------------------------

export function useRiderSecurity() {
  return useQuery({
    queryKey: KEYS.security,
    queryFn: () => riderApi.getRiderSecurityApi(),
    staleTime: STALE_PROFILE,
  })
}

export function useUpdateRiderSecurity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: riderApi.updateRiderSecurityApi,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: KEYS.security })
      const prev = qc.getQueryData<RiderSecurity>(KEYS.security)
      if (prev) {
        qc.setQueryData<RiderSecurity>(KEYS.security, { ...prev, ...data })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.security, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.security })
    },
  })
}

export function useChangeRiderPin() {
  return useMutation({
    mutationFn: (opRef: string) => riderApi.changeRiderPinApi(opRef),
  })
}

export function useSignOutAllSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opRef: string) => riderApi.signOutAllSessionsApi(opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.security })
    },
  })
}

export function useDeactivateRiderAccount() {
  return useMutation({
    mutationFn: (opRef: string) => riderApi.deactivateRiderAccountApi(opRef),
  })
}

export function useDeleteRiderAccount() {
  return useMutation({
    mutationFn: (opRef: string) => riderApi.deleteRiderAccountApi(opRef),
  })
}
