export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
  cinematic: 800,
} as const

export const easing = {
  signature: [0.2, 0, 0, 1] as [number, number, number, number],
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
}

/**
 * Reanimated `withSpring` presets. Import these instead of writing inline
 * `{ damping, stiffness }` objects so press / entrance / emphasis motion stays
 * consistent across the app.
 *
 *   press  – tap / press-in & press-out feedback (buttons, cards, chips)
 *   settle – entrance "settle" for revealed content (lists, sheets, sections)
 *   bounce – gentle emphasis (selection, small scale pops)
 *   pop    – punchy pop (likes, badges, confirmation marks)
 *   gentle – soft, slow settle (large illustrations / hero art)
 *   sheet  – modal / bottom-sheet present & snap
 */
export const springs = {
  press: { damping: 15, stiffness: 400 },
  settle: { damping: 20, stiffness: 300, mass: 0.8 },
  bounce: { damping: 12, stiffness: 400 },
  pop: { damping: 10, stiffness: 500 },
  gentle: { damping: 18, stiffness: 120, mass: 1 },
  sheet: { damping: 22, stiffness: 280, mass: 0.9 },
} as const

export type DurationToken = keyof typeof duration
export type EasingToken = keyof typeof easing
export type SpringToken = keyof typeof springs
