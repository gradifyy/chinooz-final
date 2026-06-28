import { useMutation } from '@tanstack/react-query'
import { sellerServices } from '@chinooz/mock-data'

export function useSendOtp() {
  return useMutation({
    mutationFn: (phone: string) => sellerServices.auth.sendOtp(phone),
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      sellerServices.auth.verifyOtp(phone, code),
  })
}

export function useCheckHandle() {
  return useMutation({
    mutationFn: (handle: string) => sellerServices.store.checkHandle(handle),
  })
}

export function useSaveStoreDraft() {
  return useMutation({
    mutationFn: sellerServices.store.saveStoreDraft,
  })
}

export function useSubmitKyc() {
  return useMutation({
    mutationFn: sellerServices.kyc.submitKyc,
  })
}

export function useSavePayout() {
  return useMutation({
    mutationFn: sellerServices.payment.savePayout,
  })
}

export function useSubmitSeller() {
  return useMutation({
    mutationFn: sellerServices.submit.submitSeller,
  })
}
