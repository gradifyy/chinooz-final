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
