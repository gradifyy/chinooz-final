/**
 * Small formatting helpers shared by the Jobs shell + tab content slots.
 * Kept local to rider-mobile (not promoted to @chinooz/utils) because the
 * shapes are rider-job specific.
 */

export function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/** Tabular-figure NPR for payout/COD columns so digits align. */
export function formatNprTabular(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN')}`
}

export function formatEta(ms: number | null): string {
  if (ms == null) return '--'
  const mins = Math.max(1, Math.round((ms - Date.now()) / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

/** Format a duration given in minutes. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '--'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format a distance in km with one decimal. */
export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`
}

/**
 * Countdown to an expiry timestamp. Returns a short label like "2:30" (m:ss)
 * or "1m" for > 60s. Returns null if already expired.
 */
export function formatCountdown(expiresAtMs: number, nowMs: number = Date.now()): string | null {
  const remaining = expiresAtMs - nowMs
  if (remaining <= 0) return null
  const totalSec = Math.floor(remaining / 1000)
  if (totalSec < 60) {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  const mins = Math.floor(totalSec / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}
