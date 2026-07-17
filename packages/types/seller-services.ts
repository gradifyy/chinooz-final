import type { StoreSetupInput, BusinessKycInput, PayoutInput } from '@chinooz/validation'

// KYC / go-live status enums live in the leaf types package so that downstream
// packages (state, mock-data) can reference them without creating an upward
// dependency from types → state.
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected'
export type GoLiveStatus = 'offline' | 'review' | 'live'

export interface SendOtpResult {
  success: boolean
  message: string
  alreadySent?: boolean
}

export interface VerifyOtpResult {
  success: boolean
  userId?: string
  error?: string
}

export interface HandleCheckResult {
  available: boolean
}

export interface SaveDraftResult {
  success: boolean
}

export interface SubmitKycResult {
  success: boolean
  kycStatus: KycStatus
  error?: string
}

export interface SavePayoutResult {
  success: boolean
  error?: string
}

export interface SubmitSellerResult {
  success: boolean
  goLiveStatus: GoLiveStatus
  error?: string
}

export interface SellerAuthService {
  sendOtp(phone: string): Promise<SendOtpResult>
  verifyOtp(phone: string, code: string): Promise<VerifyOtpResult>
}

export interface StoreService {
  checkHandle(handle: string): Promise<HandleCheckResult>
  saveStoreDraft(draft: StoreSetupInput): Promise<SaveDraftResult>
}

export interface KycService {
  submitKyc(data: BusinessKycInput): Promise<SubmitKycResult>
}

export interface PaymentService {
  savePayout(data: PayoutInput): Promise<SavePayoutResult>
}

export interface SellerSubmitService {
  submitSeller(): Promise<SubmitSellerResult>
}
