export const haptic = {
  selection: 'selection',
  impactLight: 'impactLight',
  impactMedium: 'impactMedium',
  impactHeavy: 'impactHeavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const

export type HapticToken = keyof typeof haptic
