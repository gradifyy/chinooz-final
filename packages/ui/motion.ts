import { duration, easing } from '@chinooz/theme'

export const motionConfig = {
  duration,
  easing,
  stagger: 60,
  spring: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
} as const

export const fadeIn = (reduced: boolean) => ({
  from: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    type: 'timing' as const,
    duration: reduced ? 0 : duration.normal,
  },
})

export const slideUp = (reduced: boolean) => ({
  from: { opacity: 0, translateY: reduced ? 0 : 16 },
  animate: { opacity: 1, translateY: 0 },
  transition: {
    type: 'timing' as const,
    duration: reduced ? 0 : duration.slow,
    easing: easing.easeOut as any,
  },
})

export const scaleIn = (reduced: boolean) => ({
  from: { opacity: 0, scale: reduced ? 1 : 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    type: 'timing' as const,
    duration: reduced ? 0 : duration.normal,
  },
})

export const springUp = (reduced: boolean) => ({
  from: { opacity: 0, translateY: reduced ? 0 : 40 },
  animate: { opacity: 1, translateY: 0 },
  transition: {
    type: 'spring' as const,
    damping: reduced ? 100 : motionConfig.spring.damping,
    stiffness: reduced ? 1000 : motionConfig.spring.stiffness,
    mass: motionConfig.spring.mass,
  },
})
