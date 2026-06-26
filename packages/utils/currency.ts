export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN')}`
}

export function formatNPRCompact(amount: number): string {
  if (amount >= 100000) {
    return `NPR ${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `NPR ${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`
  }
  return `NPR ${amount}`
}
