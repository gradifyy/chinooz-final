/**
 * Centralized motion language for Chinooz showcase
 * All animations use consistent tokens and easing for a cohesive, premium feel
 */

import { Variants } from 'framer-motion'

// Motion tokens (durations in seconds, easing curves)
export const MOTION_TOKENS = {
  // Durations
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  slower: 0.8,

  // Easing curves
  easeOut: [0.16, 1, 0.3, 1], // cubic-bezier for smooth exit
  easeInOut: [0.4, 0, 0.2, 1], // cubic-bezier for smooth transitions
  easeOutBack: [0.175, 0.885, 0.32, 1.275], // bouncy exit
  easeOutQuart: [0.165, 0.84, 0.44, 1], // smooth deceleration
}

// Reveal animation: fade in + slide up
export const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TOKENS.normal,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Stagger container for coordinated reveals
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// Stagger item (child of stagger container)
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TOKENS.normal,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Fade + Rise: gentle entrance
export const fadeRiseVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TOKENS.normal,
      ease: MOTION_TOKENS.easeOutQuart,
    },
  },
}

// Scale In: zoom entrance
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_TOKENS.normal,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Parallax scroll: subtle depth effect
export const parallaxVariants = (offset: number = 50): Variants => ({
  initial: {
    y: 0,
  },
  animate: (custom: number) => ({
    y: custom * offset * 0.5,
    transition: {
      duration: 0,
    },
  }),
})

// Section enter: coordinated reveal for entire sections
export const sectionEnterVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Hover lift: subtle elevation on hover
export const hoverLiftVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
  },
  hover: {
    y: -4,
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: MOTION_TOKENS.fast,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Magnetic button: cursor-aware pull effect
export const magneticVariants: Variants = {
  rest: {
    x: 0,
    y: 0,
  },
  hover: {
    transition: {
      duration: MOTION_TOKENS.fast,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Sheen effect: light sweep across element
export const sheenVariants: Variants = {
  rest: {
    backgroundPosition: '200% center',
  },
  hover: {
    backgroundPosition: '-200% center',
    transition: {
      duration: MOTION_TOKENS.slow,
      ease: 'linear',
    },
  },
}

// Link underline: animated underline on hover
export const linkUnderlineVariants: Variants = {
  rest: {
    scaleX: 0,
    originX: 0,
  },
  hover: {
    scaleX: 1,
    transition: {
      duration: MOTION_TOKENS.fast,
      ease: MOTION_TOKENS.easeOut,
    },
  },
}

// Accordion expand/collapse
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: MOTION_TOKENS.normal,
      ease: MOTION_TOKENS.easeInOut,
    },
  },
}

// Confetti particle animation (for waitlist success)
export const confettiVariants: Variants = {
  initial: {
    opacity: 1,
    scale: 1,
  },
  animate: {
    opacity: 0,
    scale: 0.5,
    transition: {
      duration: MOTION_TOKENS.slower,
      ease: 'easeOut',
    },
  },
}

// Scroll progress indicator
export const scrollProgressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (custom: number) => ({
    scaleX: custom,
    transition: {
      duration: 0.1,
      ease: 'easeOut',
    },
  }),
}

// Reduced motion fallback: minimal animation
export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.01,
    },
  },
}

/**
 * Helper to get motion variants based on reduced-motion preference
 */
export function getMotionVariants(
  normalVariants: Variants,
  customReducedMotionVariants?: Variants,
  prefersReducedMotion: boolean = false,
): Variants {
  return prefersReducedMotion ? (customReducedMotionVariants || reducedMotionVariants) : normalVariants
}

/**
 * Transition config for common animations
 */
export const transitionConfig = {
  fast: {
    duration: MOTION_TOKENS.fast,
    ease: MOTION_TOKENS.easeOut,
  },
  normal: {
    duration: MOTION_TOKENS.normal,
    ease: MOTION_TOKENS.easeOut,
  },
  slow: {
    duration: MOTION_TOKENS.slow,
    ease: MOTION_TOKENS.easeOut,
  },
  smooth: {
    duration: MOTION_TOKENS.normal,
    ease: MOTION_TOKENS.easeInOut,
  },
}
