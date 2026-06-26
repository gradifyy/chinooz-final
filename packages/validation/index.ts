import { z } from 'zod'

export const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^9[78]\d{8}$/, 'Enter a valid Nepali phone number (98XXXXXXXX)'),
})

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
})

export const addressSchema = z.object({
  label: z.string().min(2, 'Label is required'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^9[78]\d{8}$/, 'Enter a valid phone number'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  wardNo: z.string().min(1, 'Ward number is required'),
  street: z.string().min(1, 'Street is required'),
  isDefault: z.boolean().default(false),
})

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(10, 'Review must be at least 10 characters'),
})

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
})

export type PhoneForm = z.infer<typeof phoneSchema>
export type OtpForm = z.infer<typeof otpSchema>
export type ProfileForm = z.infer<typeof profileSchema>
export type AddressForm = z.infer<typeof addressSchema>
export type ReviewForm = z.infer<typeof reviewSchema>
