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

export type SearchInput = z.infer<typeof searchSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
