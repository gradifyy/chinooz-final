import { z } from 'zod'

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
