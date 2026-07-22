import { duration, easing } from '@chinooz/theme'

export const motionDuration = duration
export const motionEasing = easing

export const revealTransition = {
  duration: duration.slow / 1000,
  ease: easing.signature,
} as const

export const staggerConfig = {
  staggerChildren: 0.1,
} as const

export const pressScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
} as const

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow / 1000, ease: easing.signature },
  },
} as const
