import { describe, it, expect } from 'vitest'
import {
  nepaliPhoneSchema,
  otpSchema,
  searchSchema,
  loginSchema,
  reviewSchema,
  reviewResponseSchema,
  addressFormSchema,
  storeSetupSchema,
  businessKycSchema,
  payoutSchema,
  withdrawSchema,
  riderOnboardingVehicleSchema,
  productFormSchema,
  promotionFormSchema,
} from '../schemas'

describe('nepaliPhoneSchema', () => {
  it.each(['9800000000', '9712345678'])('accepts a valid mobile number %s', phone => {
    expect(nepaliPhoneSchema.safeParse({ phone }).success).toBe(true)
  })
  it.each([
    ['0100000000', 'landline'],
    ['0200000000', 'landline'],
    ['123456', 'too short / wrong prefix'],
    ['9912345678', 'wrong prefix'],
    ['', 'empty'],
  ])('rejects %s (%s)', phone => {
    expect(nepaliPhoneSchema.safeParse({ phone }).success).toBe(false)
  })
})

describe('otpSchema', () => {
  it('accepts a 6-digit OTP', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true)
  })
  it.each(['12345', '1234567', 'abcdef', ''])('rejects %s', otp => {
    expect(otpSchema.safeParse({ otp }).success).toBe(false)
  })
})

describe('searchSchema', () => {
  it('accepts a query of at least 2 chars', () => {
    expect(searchSchema.safeParse({ query: 'ab' }).success).toBe(true)
  })
  it('rejects a query shorter than 2 chars', () => {
    expect(searchSchema.safeParse({ query: 'a' }).success).toBe(false)
  })
  it('rejects a query over 200 chars', () => {
    expect(searchSchema.safeParse({ query: 'a'.repeat(201) }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts a valid email + 8+ char password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'password' }).success).toBe(
      true,
    )
  })
  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'password' }).success).toBe(
      false,
    )
  })
  it('rejects a password under 8 chars', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'short' }).success).toBe(
      false,
    )
  })
})

describe('reviewSchema', () => {
  it('accepts rating 1-5 with a 10+ char body', () => {
    expect(reviewSchema.safeParse({ rating: 4, body: 'Great product!' }).success).toBe(true)
  })
  it('rejects rating 0', () => {
    expect(reviewSchema.safeParse({ rating: 0, body: 'Great product!' }).success).toBe(false)
  })
  it('rejects rating 6', () => {
    expect(reviewSchema.safeParse({ rating: 6, body: 'Great product!' }).success).toBe(false)
  })
  it('rejects a body under 10 chars', () => {
    expect(reviewSchema.safeParse({ rating: 3, body: 'short' }).success).toBe(false)
  })
})

describe('reviewResponseSchema', () => {
  it('accepts a non-empty response up to 1000 chars', () => {
    expect(reviewResponseSchema.safeParse({ text: 'Thank you!' }).success).toBe(true)
  })
  it('rejects an empty response', () => {
    expect(reviewResponseSchema.safeParse({ text: '' }).success).toBe(false)
  })
  it('rejects a response over 1000 chars', () => {
    expect(reviewResponseSchema.safeParse({ text: 'x'.repeat(1001) }).success).toBe(false)
  })
})

describe('addressFormSchema', () => {
  const valid = {
    fullName: 'Ram Bahadur',
    phone: '9800000000',
    street: 'Some Street',
    area: 'Thamel',
    city: 'Kathmandu',
    label: 'home' as const,
  }
  it('accepts a valid address', () => {
    expect(addressFormSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects a non-10-digit phone', () => {
    expect(addressFormSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false)
  })
  it('rejects an invalid label', () => {
    expect(addressFormSchema.safeParse({ ...valid, label: 'invalid' }).success).toBe(false)
  })
})

describe('storeSetupSchema', () => {
  const valid = {
    storeName: 'Himalayan Crafts',
    handle: 'himalayan-crafts',
    categoryId: 'cat-1',
    pickupStreet: 'Some Street',
    pickupArea: 'Thamel',
    pickupCity: 'Kathmandu',
    pickupPhone: '9800000000',
  }
  it('accepts a valid store setup', () => {
    expect(storeSetupSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects an invalid handle (uppercase/special chars)', () => {
    expect(storeSetupSchema.safeParse({ ...valid, handle: 'Himalayan_Crafts' }).success).toBe(false)
  })
  it('rejects a handle under 3 chars', () => {
    expect(storeSetupSchema.safeParse({ ...valid, handle: 'hi' }).success).toBe(false)
  })
  it('rejects a non-9-digit PAN', () => {
    expect(
      businessKycSchema.safeParse({
        businessType: 'individual' as const,
        legalName: 'Ram Bahadur',
        panNumber: '12345',
        docId: 'doc1',
        docPan: 'pan1',
      }).success,
    ).toBe(false)
  })
})

describe('businessKycSchema', () => {
  const individualBase = {
    businessType: 'individual' as const,
    legalName: 'Ram Bahadur',
    panNumber: '123456789',
    docId: 'doc1',
    docPan: 'pan1',
  }
  it('accepts an individual business with valid PAN + docs', () => {
    expect(businessKycSchema.safeParse(individualBase).success).toBe(true)
  })
  it('requires regNumber + docReg for registered businesses', () => {
    expect(
      businessKycSchema.safeParse({ ...individualBase, businessType: 'registered' }).success,
    ).toBe(false)
    expect(
      businessKycSchema.safeParse({
        ...individualBase,
        businessType: 'registered',
        regNumber: 'REG-123',
        docReg: 'reg-doc',
      }).success,
    ).toBe(true)
  })
})

describe('payoutSchema', () => {
  it('requires bank fields when payoutMethod is bank', () => {
    expect(
      payoutSchema.safeParse({
        payoutMethod: 'bank',
        isDefault: false,
      }).success,
    ).toBe(false)
  })
  it('accepts a complete bank payout', () => {
    expect(
      payoutSchema.safeParse({
        payoutMethod: 'bank',
        bankName: 'Nepal Bank',
        accountName: 'Ram Bahadur',
        accountNumber: '1234567890',
        accountConfirm: '1234567890',
        branch: 'Thamel',
        isDefault: false,
      }).success,
    ).toBe(true)
  })
  it('rejects mismatched account numbers', () => {
    expect(
      payoutSchema.safeParse({
        payoutMethod: 'bank',
        bankName: 'Nepal Bank',
        accountName: 'Ram Bahadur',
        accountNumber: '1234567890',
        accountConfirm: '0987654321',
        branch: 'Thamel',
        isDefault: false,
      }).success,
    ).toBe(false)
  })
  it('requires a 10-digit wallet number for esewa/khalti', () => {
    expect(
      payoutSchema.safeParse({
        payoutMethod: 'esewa',
        walletNumber: '123',
        isDefault: false,
      }).success,
    ).toBe(false)
    expect(
      payoutSchema.safeParse({
        payoutMethod: 'khalti',
        walletNumber: '9800000000',
        isDefault: false,
      }).success,
    ).toBe(true)
  })
})

describe('withdrawSchema', () => {
  it('accepts an amount within [min, balance]', () => {
    const schema = withdrawSchema({ minWithdrawal: 500, availableBalance: 5000 })
    expect(schema.safeParse({ amount: 1000, methodId: 'm1' }).success).toBe(true)
  })
  it('rejects an amount below the minimum', () => {
    const schema = withdrawSchema({ minWithdrawal: 500, availableBalance: 5000 })
    expect(schema.safeParse({ amount: 100, methodId: 'm1' }).success).toBe(false)
  })
  it('rejects an amount above the available balance', () => {
    const schema = withdrawSchema({ minWithdrawal: 500, availableBalance: 5000 })
    expect(schema.safeParse({ amount: 6000, methodId: 'm1' }).success).toBe(false)
  })
  it('rejects a non-integer amount', () => {
    const schema = withdrawSchema({ minWithdrawal: 500, availableBalance: 5000 })
    expect(schema.safeParse({ amount: 1000.5, methodId: 'm1' }).success).toBe(false)
  })
  it('requires a methodId', () => {
    const schema = withdrawSchema({ minWithdrawal: 500, availableBalance: 5000 })
    expect(schema.safeParse({ amount: 1000, methodId: '' }).success).toBe(false)
  })
})

describe('riderOnboardingVehicleSchema', () => {
  it('accepts a bicycle without a plate', () => {
    expect(
      riderOnboardingVehicleSchema.safeParse({
        type: 'bicycle',
        color: 'red',
      }).success,
    ).toBe(true)
  })
  it('requires a plate for motorized vehicles', () => {
    expect(
      riderOnboardingVehicleSchema.safeParse({
        type: 'motorbike',
        color: 'red',
      }).success,
    ).toBe(false)
    expect(
      riderOnboardingVehicleSchema.safeParse({
        type: 'scooter',
        plate: 'BA 1 PA 2024',
        color: 'red',
      }).success,
    ).toBe(true)
  })
  it('rejects an invalid vehicle type', () => {
    expect(
      riderOnboardingVehicleSchema.safeParse({
        type: 'car',
        color: 'red',
      }).success,
    ).toBe(false)
  })
})

describe('productFormSchema', () => {
  const valid = {
    name: 'Handmade Bag',
    sku: 'BAG-001',
    categoryId: 'cat-1',
    price: 1500,
    stockCount: 10,
    description: 'A beautifully handmade bag.',
    images: ['img1.jpg'],
    status: 'active' as const,
  }
  it('accepts a valid product', () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects a product with no images', () => {
    expect(productFormSchema.safeParse({ ...valid, images: [] }).success).toBe(false)
  })
  it('rejects a price below 1', () => {
    expect(productFormSchema.safeParse({ ...valid, price: 0 }).success).toBe(false)
  })
  it('rejects negative stock', () => {
    expect(productFormSchema.safeParse({ ...valid, stockCount: -5 }).success).toBe(false)
  })
})

describe('promotionFormSchema', () => {
  const validBase = {
    name: 'Dashain Sale',
    type: 'percentage' as const,
    discountValue: 10,
    isCoupon: false,
    scope: 'all' as const,
    startsAt: '2026-01-01',
    endsAt: '2026-01-31',
    status: 'active' as const,
  }
  it('accepts a valid percentage promotion', () => {
    expect(promotionFormSchema.safeParse(validBase).success).toBe(true)
  })
  it('rejects a percentage over 100', () => {
    expect(promotionFormSchema.safeParse({ ...validBase, discountValue: 150 }).success).toBe(false)
  })
  it('requires a coupon code when isCoupon is true', () => {
    expect(promotionFormSchema.safeParse({ ...validBase, isCoupon: true }).success).toBe(false)
    expect(
      promotionFormSchema.safeParse({ ...validBase, isCoupon: true, code: 'DASHAIN10' }).success,
    ).toBe(true)
  })
  it('rejects an end date on or before the start date', () => {
    expect(
      promotionFormSchema.safeParse({ ...validBase, startsAt: '2026-01-31', endsAt: '2026-01-01' })
        .success,
    ).toBe(false)
  })
})
