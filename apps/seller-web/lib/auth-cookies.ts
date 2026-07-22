/**
 * Seller auth cookie helpers (web).
 *
 * IMPORTANT: the logged-in gate is now the HttpOnly `chinooz-seller-session`
 * cookie set SERVER-side by `/api/auth/seller` (POST). It cannot be read or
 * forged by client-side JS, unlike the legacy `chinooz-seller-logged-in=1`
 * boolean flag. Login/OTP flows call `fetch('/api/auth/seller', { method:
 * 'POST' })` instead of `setSellerLoggedInCookie()`.
 *
 * `chinooz-seller-onboarding` is a non-sensitive "has seen onboarding" flag and
 * remains client-side, now with a `Secure` flag in production and a 30-day age.
 *
 * TODO(backend): once the real auth backend is wired (`@chinooz/api` →
 * `services.verifyOtp`), the `/api/auth/seller` route should validate the OTP
 * server-side and issue a signed, rotating session token; this client file then
 * only needs `clearSellerAuthCookies()` (logout) which hits `DELETE`.
 */
const ONBOARDING_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const SECURE = typeof window !== 'undefined' && window.location.protocol === 'https:'

export function setSellerOnboardingCookie() {
  document.cookie = `chinooz-seller-onboarding=1; path=/; max-age=${ONBOARDING_MAX_AGE}; SameSite=Lax${SECURE ? '; Secure' : ''}`
}

/**
 * @deprecated Use `fetch('/api/auth/seller', { method: 'POST' })` to issue the
 * HttpOnly session cookie instead. Retained only for backward compatibility.
 */
export function setSellerLoggedInCookie() {
  document.cookie = `chinooz-seller-logged-in=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${SECURE ? '; Secure' : ''}`
}

export async function clearSellerAuthCookies() {
  // Clear the legacy client-side flags…
  document.cookie = 'chinooz-seller-onboarding=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'chinooz-seller-logged-in=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'chinooz-seller-verified=; path=/; max-age=0; SameSite=Lax'
  // …and clear the HttpOnly session cookie via the server route.
  try {
    await fetch('/api/auth/seller', { method: 'DELETE' })
  } catch {
    // ignore — cookie clear is best-effort
  }
}
