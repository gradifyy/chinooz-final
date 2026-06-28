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
} from '@chinooz/mock-data'
import type { RiderPerformanceRange, RiderEarningsRange, GeoPoint } from '@chinooz/mock-data'
import type {
  RiderJob,
  ActiveDelivery,
  DeliveryStatus,
} from '@chinooz/types'

// ---------------------------------------------------------------------------
// StaleTime convention (seconds → ms)
// ---------------------------------------------------------------------------

const STALE_PROFILE = 1000 * 120
const STALE_JOBS = 1000 * 15
const STALE_ACTIVE = 0
const STALE_EARNINGS = 1000 * 30
const STALE_WALLET = 1000 * 30
const STALE_INCENTIVES = 1000 * 60
const STALE_DEMAND = 1000 * 30
const STALE_PERFORMANCE = 1000 * 120

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
  incentives: ['rider', 'incentives'] as const,
  demand: ['rider', 'demand-zones'] as const,
  surge: ['rider', 'surge-zones'] as const,
  forecast: ['rider', 'demand-forecast'] as const,
  zoneDetail: (zoneId: string) => ['rider', 'zone-detail', zoneId] as const,
  performance: (period: RiderPerformanceRange) =>
    ['rider', 'performance', period.key] as const,
  performanceDetail: (period: RiderPerformanceRange) =>
    ['rider', 'performance', 'detail', period.key] as const,
  personal: ['rider', 'personal-profile'] as const,
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

export function useRiderRequestWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      amountNpr,
      destination,
      opRef,
    }: {
      amountNpr: number
      destination: 'esewa' | 'khalti' | 'bank'
      opRef: string
    }) => riderApi.requestWithdrawal(amountNpr, destination, opRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.earnings })
    },
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
