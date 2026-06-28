/**
 * Small formatting helpers shared by the Jobs shell + tab content slots.
 * Kept local to rider-mobile (not promoted to @chinooz/utils) because the
 * shapes are rider-job specific.
 */

export function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

export function formatEta(ms: number | null): string {
  if (ms == null) return '--'
  const mins = Math.max(1, Math.round((ms - Date.now()) / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
