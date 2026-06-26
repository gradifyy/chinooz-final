import { duration, easing } from '@chinooz/theme'

export const motionConfig = {
  duration,
  easing,
  stagger: 0.06,
  spring: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
} as const

export const fadeIn = (reduced: boolean) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: reduced ? 0 : duration.normal / 1000 },
})

export const slideUp = (reduced: boolean) => ({
  initial: { opacity: 0, y: reduced ? 0 : 16 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: reduced ? 0 : duration.slow / 1000,
    ease: easing.easeOut,
  },
})

export const scaleIn = (reduced: boolean) => ({
  initial: { opacity: 0, scale: reduced ? 1 : 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: reduced ? 0 : duration.normal / 1000 },
})

export const springUp = (reduced: boolean) => ({
  initial: { opacity: 0, y: reduced ? 0 : 40 },
  animate: { opacity: 1, y: 0 },
  transition: reduced
    ? { duration: 0 }
    : {
        type: 'spring' as const,
        damping: motionConfig.spring.damping,
        stiffness: motionConfig.spring.stiffness,
        mass: motionConfig.spring.mass,
      },
})
