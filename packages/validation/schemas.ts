import { z } from 'zod'

export const nepaliPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Please enter your phone number')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
    .refine(val => val.startsWith('97') || val.startsWith('98'), {
      message: 'Please enter a mobile number starting with 97 or 98',
    })
    .refine(val => !val.startsWith('01') && !val.startsWith('02') && !val.startsWith('03') && !val.startsWith('04') && !val.startsWith('05'), {
      message: 'Please enter a mobile number, not a landline',
    }),
})

export type NepaliPhoneInput = z.infer<typeof nepaliPhoneSchema>

export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
})

export type OtpInput = z.infer<typeof otpSchema>

export const searchSchema = z.object({
  query: z.string().min(2, 'Search must be at least 2 characters').max(200),
})

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{7,15}$/, 'Please enter a valid phone number'),
})

export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  fullName: z.string().min(2, 'Full name is required').max(100),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{7,15}$/, 'Please enter a valid phone number'),
  line1: z.string().min(5, 'Address is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2, 'City is required').max(100),
  district: z.string().min(2, 'District is required').max(100),
  province: z.string().min(2, 'Province is required').max(100),
  postalCode: z.string().max(10).optional(),
})

export const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Please select a delivery address'),
  paymentMethod: z.enum(['cod', 'esewa', 'khalti', 'card'], {
    errorMap: () => ({ message: 'Please select a payment method' }),
  }),
  notes: z.string().max(500).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(10, 'Review must be at least 10 characters').max(2000),
})

export const reviewResponseSchema = z.object({
  text: z
    .string()
    .min(1, 'Response cannot be empty')
    .max(1000, 'Response must be at most 1000 characters'),
})
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>

export const riderPersonalSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
    .refine(val => val.startsWith('97') || val.startsWith('98'), {
      message: 'Please enter a mobile number starting with 97 or 98',
    }),
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City is too long'),
  zone: z
    .string()
    .min(2, 'Zone is required')
    .max(120, 'Zone is too long'),
  emergencyName: z
    .string()
    .min(2, 'Emergency contact name is required')
    .max(100, 'Name is too long'),
  emergencyPhone: z
    .string()
    .min(1, 'Emergency contact phone is required')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
    .refine(val => val.startsWith('97') || val.startsWith('98'), {
      message: 'Please enter a mobile number starting with 97 or 98',
    }),
  emergencyRelation: z
    .string()
    .min(2, 'Relation is required')
    .max(50, 'Relation is too long'),
})

/**
 * RO3 step 1 — rider onboarding personal details.
 * Extends the profile personal shape with date of birth, gender (optional),
 * and a profile photo (uri or null). Used by the onboarding stepper's
 * Personal step with resumable draft persistence.
 */
export const riderOnboardingPersonalSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  photoUri: z
    .string()
    .max(500000, 'Photo is too large')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(val => {
      const d = new Date(val)
      if (isNaN(d.getTime())) return false
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
      return age >= 18 && age <= 80
    }, { message: 'You must be at least 18 years old' }),
  gender: z
    .enum(['male', 'female', 'other', 'prefer_not_to_say'])
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City is too long'),
  zone: z
    .string()
    .min(2, 'Zone is required')
    .max(120, 'Zone is too long'),
  emergencyName: z
    .string()
    .min(2, 'Emergency contact name is required')
    .max(100, 'Name is too long'),
  emergencyPhone: z
    .string()
    .min(1, 'Emergency contact phone is required')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
    .refine(val => val.startsWith('97') || val.startsWith('98'), {
      message: 'Please enter a mobile number starting with 97 or 98',
    }),
  emergencyRelation: z
    .string()
    .min(2, 'Relation is required')
    .max(50, 'Relation is too long'),
})

export type RiderOnboardingPersonalInput = z.infer<typeof riderOnboardingPersonalSchema>

/**
 * RO3 step 2 — rider onboarding vehicle details.
 * Plate is required for motorized vehicles (motorbike, scooter) but optional
 * for bicycles. Make/model is always optional. Plate is auto-uppercased and
 * validated against the Nepali plate format (e.g. "BA 1 PA 2024").
 */
export const riderOnboardingVehicleSchema = z
  .object({
    type: z.enum(['bicycle', 'motorbike', 'scooter'], {
      errorMap: () => ({ message: 'Please select a vehicle type' }),
    }),
    makeModel: z
      .string()
      .max(120, 'Make/model is too long')
      .optional()
      .or(z.literal('')),
    plate: z
      .string()
      .max(20, 'Plate number is too long')
      .optional()
      .or(z.literal('')),
    color: z
      .string()
      .min(2, 'Color is required')
      .max(50, 'Color is too long'),
  })
  .superRefine((data, ctx) => {
    // Plate required for motorized vehicles.
    if (data.type !== 'bicycle') {
      if (!data.plate || data.plate.trim().length < 3) {
        ctx.addIssue({
          path: ['plate'],
          message: 'Plate number is required for motorized vehicles',
          code: 'custom',
        })
      }
    }
  })

export type RiderOnboardingVehicleInput = z.infer<typeof riderOnboardingVehicleSchema>

export const createProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  language: z.enum(['en', 'ne']),
})

export const addressFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  street: z.string().min(3, 'Street address is required').max(200),
  area: z.string().min(2, 'Area is required').max(100),
  city: z.string().min(2, 'City is required').max(100),
  label: z.enum(['home', 'work', 'other']),
})

export type AddressFormInput = z.infer<typeof addressFormSchema>

export type CreateProfileInput = z.infer<typeof createProfileSchema>

export type SearchInput = z.infer<typeof searchSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type RiderPersonalInput = z.infer<typeof riderPersonalSchema>

export const storefrontSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(80, 'Store name is too long'),
  tagline: z.string().max(140, 'Tagline is too long').optional().or(z.literal('')),
  description: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
  category: z.string().max(60, 'Category is too long').optional().or(z.literal('')),
  pickupAddress: z.string().max(300, 'Address is too long').optional().or(z.literal('')),
  returnAddress: z.string().max(300, 'Address is too long').optional().or(z.literal('')),
  contactPhone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
    .optional()
    .or(z.literal('')),
  contactEmail: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  logoUrl: z.string().max(500000, 'Image is too large').optional().or(z.literal('')),
  bannerUrl: z.string().max(2000000, 'Banner image is too large').optional().or(z.literal('')),
})

export type StorefrontInput = z.infer<typeof storefrontSchema>

export const storeSetupSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(80, 'Store name is too long'),
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(40, 'Handle is too long')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  description: z.string().max(200, 'Description must be under 200 characters').optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Please select a category'),
  logoUrl: z.string().optional().or(z.literal('')),
  bannerUrl: z.string().optional().or(z.literal('')),
  pickupStreet: z.string().min(3, 'Street address is required').max(200),
  pickupArea: z.string().min(2, 'Area is required').max(100),
  pickupCity: z.string().min(2, 'City is required').max(100),
  pickupPhone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
})

export type StoreSetupInput = z.infer<typeof storeSetupSchema>

export const businessKycSchema = z.object({
  businessType: z.enum(['individual', 'registered']),
  legalName: z.string().min(2, 'Legal name must be at least 2 characters').max(100),
  panNumber: z
    .string()
    .regex(/^\d{9}$/, 'PAN must be 9 digits'),
  regNumber: z.string().optional().or(z.literal('')),
  docId: z.string().min(1, 'Please upload your ID document'),
  docReg: z.string().optional().or(z.literal('')),
  docPan: z.string().min(1, 'Please upload your PAN certificate'),
}).superRefine((data, ctx) => {
  if (data.businessType === 'registered') {
    if (!data.regNumber || data.regNumber.trim().length < 3) {
      ctx.addIssue({
        path: ['regNumber'],
        message: 'Registration number is required for registered businesses',
        code: 'custom',
      })
    }
    if (!data.docReg) {
      ctx.addIssue({
        path: ['docReg'],
        message: 'Please upload your business registration',
        code: 'custom',
      })
    }
  }
})

export type BusinessKycInput = z.infer<typeof businessKycSchema>

export const payoutSchema = z.object({
  payoutMethod: z.enum(['bank', 'esewa', 'khalti']),
  bankName: z.string().optional().or(z.literal('')),
  accountName: z.string().optional().or(z.literal('')),
  accountNumber: z.string().optional().or(z.literal('')),
  accountConfirm: z.string().optional().or(z.literal('')),
  branch: z.string().optional().or(z.literal('')),
  walletNumber: z.string().optional().or(z.literal('')),
  isDefault: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.payoutMethod === 'bank') {
    if (!data.bankName || data.bankName.trim().length < 2) {
      ctx.addIssue({ path: ['bankName'], message: 'Please select a bank', code: 'custom' })
    }
    if (!data.accountName || data.accountName.trim().length < 2) {
      ctx.addIssue({ path: ['accountName'], message: 'Account holder name is required', code: 'custom' })
    }
    if (!data.accountNumber || data.accountNumber.trim().length < 3) {
      ctx.addIssue({ path: ['accountNumber'], message: 'Account number is required', code: 'custom' })
    }
    if (!data.accountConfirm || data.accountConfirm !== data.accountNumber) {
      ctx.addIssue({ path: ['accountConfirm'], message: 'Account numbers don\'t match', code: 'custom' })
    }
    if (!data.branch || data.branch.trim().length < 2) {
      ctx.addIssue({ path: ['branch'], message: 'Branch is required', code: 'custom' })
    }
  } else {
    if (!data.walletNumber || !/^\d{10}$/.test(data.walletNumber)) {
      ctx.addIssue({ path: ['walletNumber'], message: 'Wallet number must be 10 digits', code: 'custom' })
    }
  }
})

export type PayoutInput = z.infer<typeof payoutSchema>

// --- Seller Product Form ---

export const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name is too long'),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU is too long'),
  categoryId: z.string().min(1, 'Please select a category'),
  price: z.number().min(1, 'Price must be at least NPR 1').max(10000000, 'Price is too high'),
  compareAtPrice: z.number().optional(),
  stockCount: z.number().min(0, 'Stock cannot be negative').max(999999, 'Stock is too high'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description is too long'),
  images: z.array(z.string()).min(1, 'At least one image is required').max(8, 'Maximum 8 images'),
  videoUrl: z.string().max(500, 'Video URL is too long').optional().or(z.literal('')),
  weight: z.number().optional(),
  shippingWidth: z.number().optional(),
  shippingHeight: z.number().optional(),
  shippingLength: z.number().optional(),
  specs: z.string().max(2000, 'Specs are too long').optional().or(z.literal('')),
  status: z.enum(['active', 'draft']),
})

export type ProductFormInput = z.infer<typeof productFormSchema>

// Per-section sub-schemas for completion tracking
export const productMediaSectionSchema = z.object({
  images: z.array(z.string().min(1)).min(1, 'At least one image is required').max(8, 'You can upload up to 8 images'),
})

export const productDetailsSectionSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name is too long'),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU is too long'),
  categoryId: z.string().min(1, 'Please select a category'),
})

export const productPricingSectionSchema = z.object({
  price: z.number().min(1, 'Price must be at least NPR 1').max(10000000, 'Price is too high'),
  compareAtPrice: z.number().optional(),
  stockCount: z.number().min(0, 'Stock cannot be negative').max(999999, 'Stock is too high'),
})

export const productDescriptionSectionSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description is too long'),
  specs: z.string().max(2000, 'Specs are too long').optional().or(z.literal('')),
})

// --- Seller Promotion Form ---

export const promotionFormSchema = z.object({
  name: z.string().min(2, 'Promotion name must be at least 2 characters').max(120, 'Promotion name is too long'),
  type: z.enum(['percentage', 'fixed', 'flash_sale', 'bogo', 'free_shipping']),
  discountValue: z.number().min(1, 'Discount value must be at least 1').max(100, 'Percentage cannot exceed 100'),
  code: z.string().max(30, 'Code is too long').optional().or(z.literal('')),
  isCoupon: z.boolean(),
  scope: z.enum(['all', 'category', 'products', 'order']),
  scopeLabel: z.string().max(100).optional().or(z.literal('')),
  startsAt: z.string().min(1, 'Start date is required'),
  endsAt: z.string().min(1, 'End date is required'),
  budget: z.number().min(0).optional(),
  productsCount: z.number().min(0).optional(),
  status: z.enum(['active', 'scheduled', 'expired', 'draft']),
  bogoBuyQty: z.number().min(1, 'Buy quantity must be at least 1').max(99).optional(),
  bogoGetQty: z.number().min(1, 'Get quantity must be at least 1').max(99).optional(),
  minOrderValue: z.number().min(0).optional(),
  minQty: z.number().min(0).optional(),
  firstOrderOnly: z.boolean().optional(),
  perCustomerLimit: z.number().min(0).optional(),
  combinable: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'percentage' || data.type === 'flash_sale') {
    if (data.discountValue > 100) {
      ctx.addIssue({ path: ['discountValue'], code: z.ZodIssueCode.custom, message: 'Percentage cannot exceed 100' })
    }
  }
  if (data.isCoupon && (!data.code || data.code.trim().length < 2)) {
    ctx.addIssue({ path: ['code'], code: z.ZodIssueCode.custom, message: 'Coupon code is required when coupon mode is on' })
  }
  if (data.startsAt && data.endsAt) {
    const start = new Date(data.startsAt).getTime()
    const end = new Date(data.endsAt).getTime()
    if (end <= start) {
      ctx.addIssue({ path: ['endsAt'], code: z.ZodIssueCode.custom, message: 'End date must be after start date' })
    }
  }
})

export type PromotionFormInput = z.infer<typeof promotionFormSchema>

export const promotionTypeValueSectionSchema = z.object({
  name: z.string().min(2, 'Promotion name must be at least 2 characters').max(120, 'Promotion name is too long'),
  type: z.enum(['percentage', 'fixed', 'flash_sale', 'bogo', 'free_shipping']),
  discountValue: z.number().min(1, 'Discount value must be at least 1'),
  code: z.string().max(30, 'Code is too long').optional().or(z.literal('')),
  isCoupon: z.boolean(),
})

export const promotionTargetsSectionSchema = z.object({
  scope: z.enum(['all', 'category', 'products', 'order']),
  scopeLabel: z.string().max(100).optional().or(z.literal('')),
  minOrderValue: z.number().min(0).optional(),
  minQty: z.number().min(0).optional(),
  firstOrderOnly: z.boolean().optional(),
  perCustomerLimit: z.number().min(0).optional(),
  combinable: z.boolean().optional(),
})

export const promotionScheduleSectionSchema = z.object({
  startsAt: z.string().min(1, 'Start date is required'),
  endsAt: z.string().min(1, 'End date is required'),
  budget: z.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.startsAt && data.endsAt) {
    const start = new Date(data.startsAt).getTime()
    const end = new Date(data.endsAt).getTime()
    if (end <= start) {
      ctx.addIssue({ path: ['endsAt'], code: z.ZodIssueCode.custom, message: 'End date must be after start date' })
    }
  }
})
