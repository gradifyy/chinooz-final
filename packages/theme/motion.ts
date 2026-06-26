export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const

export const easing = {
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const

export type DurationToken = keyof typeof duration
export type EasingToken = keyof typeof easing
