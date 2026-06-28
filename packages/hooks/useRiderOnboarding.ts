/**
 * Rider onboarding TanStack Query hooks.
 *
 * Wraps the shared mock auth boundary (requestOtp, verifyOtp,
 * lookupRiderAccount) and onboarding-specific APIs (submitRiderOnboarding,
 * checkRiderApproval, getGoOnlineChecklist) with TanStack Query.
 *
 * - useRiderRequestOtp:     useMutation wrapping requestOtp
 * - useRiderVerifyOtp:      useMutation wrapping verifyOtp + lookupRiderAccount
 * - useSubmitRiderOnboarding: useMutation wrapping submitRiderOnboarding
 * - useRiderApprovalStatus:  useQuery wrapping checkRiderApproval (staleTime 30s)
 * - useGoOnlineChecklist:    useQuery wrapping getGoOnlineChecklist (staleTime 60s)
 *
 * Optimistic/rollback is not needed for onboarding mutations (they are
 * create-only, not updating cached data), but mutations provide loading/error
 * state, retries, and invalidate relevant queries on success.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  requestOtp,
  verifyOtp,
  lookupRiderAccount,
  submitRiderOnboarding,
  checkRiderApproval,
  getGoOnlineChecklist,
  type RiderAccountState,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'

interface VerifyOtpResult {
  success: boolean
  userId?: string
  error?: string
  account?: { state: RiderAccountState; riderId?: string; name?: string }
}

// ---------------------------------------------------------------------------
// StaleTime convention
// ---------------------------------------------------------------------------

const STALE_APPROVAL = 1000 * 30 // 30s — approval status polling
const STALE_GO_ONLINE = 1000 * 60 // 60s

// ---------------------------------------------------------------------------
// OTP hooks — shared auth boundary
// ---------------------------------------------------------------------------

export function useRiderRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) => requestOtp(phone),
    onSuccess: (_data, phone) => {
      analytics.track({ name: 'rider_otp_sent', properties: { phone } })
    },
  })
}

export function useRiderVerifyOtp() {
  return useMutation<VerifyOtpResult, Error, { phone: string; code: string }>({
    mutationFn: async ({ phone, code }) => {
      const result = await verifyOtp(phone, code)
      if (!result.success) {
        return result
      }
      // On success, look up account state for branching.
      const account = await lookupRiderAccount(phone)
      return { ...result, account }
    },
    onSuccess: (data, { phone }) => {
      analytics.track({
        name: 'rider_otp_verified',
        properties: { phone, state: data.account?.state },
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Onboarding submission
// ---------------------------------------------------------------------------

export function useSubmitRiderOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => submitRiderOnboarding(data),
    onSuccess: () => {
      // Invalidate approval status so the pending screen fetches fresh data.
      qc.invalidateQueries({ queryKey: ['rider-approval'] })
      analytics.track({ name: 'rider_onboarding_submitted' })
    },
  })
}

// ---------------------------------------------------------------------------
// Approval status — staleTime 30s
// ---------------------------------------------------------------------------

export function useRiderApprovalStatus(riderId: string) {
  return useQuery({
    queryKey: ['rider-approval', riderId],
    queryFn: () => checkRiderApproval(riderId),
    staleTime: STALE_APPROVAL,
  })
}

// ---------------------------------------------------------------------------
// Go-online checklist — staleTime 60s
// ---------------------------------------------------------------------------

export function useGoOnlineChecklist(riderId: string) {
  return useQuery({
    queryKey: ['rider-go-online', riderId],
    queryFn: () => getGoOnlineChecklist(riderId),
    staleTime: STALE_GO_ONLINE,
  })
}
