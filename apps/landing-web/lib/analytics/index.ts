/**
 * Analytics boundary — stub implementation.
 * Replace with your analytics provider (e.g., PostHog, Segment, Mixpanel).
 */

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.info('[Analytics]', event, properties)
  }
  // TODO: Replace with real analytics
  // posthog.capture(event, properties)
}

export function trackWaitlistSignup(email: string): void {
  trackEvent('waitlist_signup', { email_domain: email.split('@')[1] })
}

export function trackCTAClick(cta: string, section: string): void {
  trackEvent('cta_click', { cta, section })
}

export function trackLanguageToggle(locale: string): void {
  trackEvent('language_toggle', { locale })
}
