export type KycDocumentStatus = 'pending' | 'verified' | 'rejected' | 'missing'

export type KycDocumentKind = 'citizenship' | 'pan' | 'businessReg'

export interface KycDocument {
  id: string
  kind: KycDocumentKind
  labelKey: string
  status: KycDocumentStatus
  thumbnailUrl?: string
  rejectionReasonKey?: string
  uploadedAt?: string
}

export type BusinessType = 'individual' | 'registered'

export interface BusinessDetails {
  legalName: string
  businessType: BusinessType
  panNumber: string
  regNumber: string
  addressLine: string
  city: string
  district: string
  province: string
}

export const SELLER_BUSINESS_TYPES: { value: BusinessType; labelKey: string }[] = [
  { value: 'individual', labelKey: 'seller.settings.business.types.individual' },
  { value: 'registered', labelKey: 'seller.settings.business.types.registered' },
]

export const SELLER_KYC_DOCUMENTS: KycDocument[] = [
  {
    id: 'doc-citizenship',
    kind: 'citizenship',
    labelKey: 'seller.settings.business.docs.citizenship',
    status: 'verified',
    uploadedAt: '2025-01-15',
  },
  {
    id: 'doc-pan',
    kind: 'pan',
    labelKey: 'seller.settings.business.docs.pan',
    status: 'rejected',
    rejectionReasonKey: 'seller.settings.business.rejectionReasons.panBlur',
    uploadedAt: '2025-02-01',
  },
  {
    id: 'doc-business-reg',
    kind: 'businessReg',
    labelKey: 'seller.settings.business.docs.businessReg',
    status: 'missing',
  },
]

export const SELLER_BUSINESS_DETAILS: BusinessDetails = {
  legalName: 'Chinooz Trading Pvt. Ltd.',
  businessType: 'registered',
  panNumber: '601234567',
  regNumber: 'PT-12345-2024',
  addressLine: 'Baneshwor-10, Kathmandu',
  city: 'Kathmandu',
  district: 'Kathmandu',
  province: 'Bagmati',
}

export function getOverallKycStatus(docs: KycDocument[]): {
  kind: 'verified' | 'actionNeeded' | 'underReview'
  labelKey: string
} {
  if (docs.every(d => d.status === 'verified')) {
    return { kind: 'verified', labelKey: 'seller.settings.status.verified' }
  }
  if (docs.some(d => d.status === 'rejected' || d.status === 'missing')) {
    return { kind: 'actionNeeded', labelKey: 'seller.settings.status.actionNeeded' }
  }
  return { kind: 'underReview', labelKey: 'seller.settings.status.underReview' }
}

export function getGoLiveRequirements(docs: KycDocument[]): { id: string; labelKey: string; done: boolean }[] {
  return docs.map(d => ({
    id: d.id,
    labelKey: d.labelKey,
    done: d.status === 'verified',
  }))
}
