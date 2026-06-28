/**
 * Waitlist submission library
 * Typed, swappable async function for handling waitlist signups
 * Currently mocks the submission; ready to plug in Supabase/Resend/Mailchimp
 */

export interface WaitlistFormData {
  email: string
  phone?: string
  city?: string
  role?: 'buyer' | 'seller' | 'rider'
}

export interface WaitlistResponse {
  success: boolean
  message: string
  data?: {
    id: string
    email: string
    createdAt: string
  }
}

/**
 * Submit waitlist form data
 * Mock implementation: simulates latency and random success/failure
 * Replace with actual API call to Supabase/Resend/Mailchimp
 */
export async function submitWaitlist(formData: WaitlistFormData): Promise<WaitlistResponse> {
  // Simulate network latency (1.5-2.5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000))

  // Mock: 95% success rate for demo
  const shouldFail = Math.random() > 0.95

  if (shouldFail) {
    throw new Error('Network error. Please try again.')
  }

  // Mock success response
  return {
    success: true,
    message: 'Successfully added to waitlist!',
    data: {
      id: `waitlist_${Date.now()}`,
      email: formData.email,
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone format (basic: at least 7 digits)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{7,}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}
