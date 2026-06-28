export interface WaitlistPayload {
  email: string
  name?: string
  locale?: string
}

export interface WaitlistResult {
  success: boolean
  message?: string
}

/**
 * Waitlist submit boundary — mock implementation.
 * Replace the body with a Supabase insert or email API call when ready.
 */
export async function submitWaitlist(payload: WaitlistPayload): Promise<WaitlistResult> {
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(payload.email)) {
    return { success: false, message: 'Invalid email address' }
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // TODO: Replace with real implementation
  // Example Supabase:
  // const { error } = await supabase.from('waitlist').insert([payload])
  // if (error) return { success: false, message: error.message }

  console.info('[Waitlist] New signup:', payload.email)
  return { success: true, message: 'Successfully joined waitlist' }
}
