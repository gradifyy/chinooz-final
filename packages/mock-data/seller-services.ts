import type {
  SellerAuthService,
  StoreService,
  KycService,
  PaymentService,
  SellerSubmitService,
  SendOtpResult,
  VerifyOtpResult,
  HandleCheckResult,
  SaveDraftResult,
  SubmitKycResult,
  SavePayoutResult,
  SubmitSellerResult,
  KycStatus,
  GoLiveStatus,
} from '@chinooz/types/seller-services'
import type { StoreSetupInput, BusinessKycInput, PayoutInput } from '@chinooz/validation'
import { requestOtp, verifyOtp } from './api'
import { checkHandleAvailability } from './sellerApi'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 300, max = 800): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

// --- Mock Auth Service ---

export const mockAuthService: SellerAuthService = {
  async sendOtp(phone: string): Promise<SendOtpResult> {
    return requestOtp(phone)
  },

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
    return verifyOtp(phone, code)
  },
}

// --- Mock Store Service ---

export const mockStoreService: StoreService = {
  async checkHandle(handle: string): Promise<HandleCheckResult> {
    await randomDelay(300, 600)
    const available = await checkHandleAvailability(handle)
    return { available }
  },

  async saveStoreDraft(_draft: StoreSetupInput): Promise<SaveDraftResult> {
    await randomDelay(200, 400)
    return { success: true }
  },
}

// --- Mock KYC Service ---

export const mockKycService: KycService = {
  async submitKyc(data: BusinessKycInput): Promise<SubmitKycResult> {
    await randomDelay(600, 1200)
    const hasDocs = data.docId && data.docPan
    const hasRegDocs = data.businessType === 'registered' ? data.docReg : true
    if (!hasDocs || !hasRegDocs) {
      return { success: false, kycStatus: 'none' as KycStatus, error: 'Missing required documents' }
    }
    return { success: true, kycStatus: 'pending' as KycStatus }
  },
}

// --- Mock Payment Service ---

export const mockPaymentService: PaymentService = {
  async savePayout(data: PayoutInput): Promise<SavePayoutResult> {
    await randomDelay(400, 800)
    if (data.payoutMethod === 'bank') {
      if (!data.bankName || !data.accountNumber || data.accountNumber !== data.accountConfirm) {
        return { success: false, error: 'Invalid bank details' }
      }
    } else {
      if (!data.walletNumber || !/^\d{10}$/.test(data.walletNumber)) {
        return { success: false, error: 'Invalid wallet number' }
      }
    }
    return { success: true }
  },
}

// --- Mock Seller Submit Service ---

export const mockSellerSubmitService: SellerSubmitService = {
  async submitSeller(): Promise<SubmitSellerResult> {
    await randomDelay(800, 1500)
    return { success: true, goLiveStatus: 'review' as GoLiveStatus }
  },
}

// --- Service Registry (swappable) ---

export const sellerServices = {
  auth: mockAuthService,
  store: mockStoreService,
  kyc: mockKycService,
  payment: mockPaymentService,
  submit: mockSellerSubmitService,
}

export type SellerServices = typeof sellerServices
